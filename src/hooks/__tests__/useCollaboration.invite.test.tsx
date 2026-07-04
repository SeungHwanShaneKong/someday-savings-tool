// [CL-COEDIT-QA200-20260620] useCollaboration(초대 발급/협업자 해제) — 신규 분기 단위 검증.
//
// 왜: 기존 useCollaboration.test.tsx(IC.1~7)는 반환 토큰/멱등 회귀/마운트 로드의 "결과"만 고정한다.
//     여기선 그 결과를 만든 **인자·페이로드·부수효과**를 정밀 고정한다 — 중복 금지, 계약 기반:
//       · createInvite insert 페이로드(invited_by=user.id, role='editor', email='') 정확성
//       · 409 후 update 가 status='pending' + expires_at=정확히 7일(fake timer 결정성)·정확 필터
//       · busy 토글이 createInvite 호출 전후로 false→(진행중 true)→false 로 복귀
//       · refresh 가 budget_collaborators 를 select('user_id, role').eq('budget_id') 로 로드
//       · removeCollaborator delete 가 .eq('budget_id') + .eq('user_id', userId) 정확 매칭
//       · window.location.origin 이 다른 호스트여도 URL 이 그 origin 으로 구성
// 격리: supabase 는 setup.ts 전역 mock. from() 을 테이블별·호출별로 오버라이드해 인자 캡처.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { supabase } from '@/integrations/supabase/client';
import { useCollaboration } from '@/hooks/useCollaboration';

// useAuth 는 hoisted 가변 홀더 — 테스트별 user 교체.
const h = vi.hoisted(() => ({ user: { id: 'owner-1' } as { id: string } | null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: h.user }) }));

// 호출 인자를 노출하는 체이너블 mock. 각 메서드 spy 를 그대로 보존해 페이로드/필터를 검증한다.
//  - single() → opts.single 결과 (insert().select().single() 경로)
//  - thenable(then) → opts.list 결과 (update().select() / select().eq() await 종단)
type ChainOpts = { single?: unknown; list?: unknown };
function makeChain(opts: ChainOpts = {}) {
  const single = opts.single ?? { data: null, error: null };
  const list = opts.list ?? { data: [], error: null };
  const q: Record<string, ReturnType<typeof vi.fn>> & { then?: unknown } = {} as never;
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'in',
    'order', 'limit', 'match', 'is', 'maybeSingle',
  ];
  for (const m of methods) q[m] = vi.fn(() => q);
  q.single = vi.fn(() => Promise.resolve(single));
  (q as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(list).then(resolve);
  return q as Record<string, ReturnType<typeof vi.fn>>;
}

beforeEach(() => {
  h.user = { id: 'owner-1' };
  vi.mocked(supabase.from).mockReset();
  // [CL-COEDIT-PARTICIPANTS-20260620] refresh 는 get_budget_participants RPC 우선. 본 스위트는 폴백 경로(budget_collaborators)
  // 인자/필터 정확성을 검증하므로 RPC 미배포(에러)를 기본값으로 강제해 폴백을 탄다.
  vi.mocked(supabase.rpc).mockReset();
  vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'rpc not deployed' } } as never);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useCollaboration.createInvite — insert 페이로드/원격필터 정확성', () => {
  it('INV.A1 insert 페이로드: budget_id + invited_by=user.id + role="editor" + email="" 정확', async () => {
    const inv = makeChain({ single: { data: { token: 'TOK_A' }, error: null } });
    vi.mocked(supabase.from).mockImplementation((table: string) =>
      (table === 'budget_invitations' ? inv : makeChain()) as never,
    );

    const { result } = renderHook(() => useCollaboration('budget-42'));
    await act(async () => { await result.current.createInvite(); });

    // 정확히 1회 insert, 페이로드 4필드 일치(서버 신뢰 인자 — invited_by 는 클라가 user.id 로 고정)
    expect(inv.insert).toHaveBeenCalledTimes(1);
    expect(inv.insert).toHaveBeenCalledWith({
      budget_id: 'budget-42',
      invited_by: 'owner-1',
      role: 'editor',
      email: '',
    });
    // 토큰만 select 후 단건 — 과다조회 금지 계약
    expect(inv.select).toHaveBeenCalledWith('token');
    expect(inv.single).toHaveBeenCalledTimes(1);
  });

  it('INV.A2 insert 의 invited_by 는 현재 user.id 를 따른다(다른 오너로 교체 시 반영)', async () => {
    h.user = { id: 'owner-XYZ' };
    const inv = makeChain({ single: { data: { token: 'TOK_B' }, error: null } });
    vi.mocked(supabase.from).mockImplementation((table: string) =>
      (table === 'budget_invitations' ? inv : makeChain()) as never,
    );

    const { result } = renderHook(() => useCollaboration('budget-1'));
    await act(async () => { await result.current.createInvite(); });

    expect(inv.insert).toHaveBeenCalledWith(
      expect.objectContaining({ invited_by: 'owner-XYZ' }),
    );
  });
});

describe('useCollaboration.createInvite — 409 갱신 페이로드(status/expires_at) 정확성', () => {
  it('INV.A3 409 후 update: status="pending" + expires_at 정확히 7일 후(ISO)·필터 정확', async () => {
    // 날짜 결정성 — 고정 시각 기준 7일 후를 정확히 검증.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-20T00:00:00.000Z'));
    const expected7d = new Date('2026-06-27T00:00:00.000Z').toISOString();

    const inv = makeChain({
      single: { data: null, error: { code: '23505', message: 'duplicate key' } },
      list: { data: [{ token: 'TOK_REFRESHED' }], error: null },
    });
    vi.mocked(supabase.from).mockImplementation((table: string) =>
      (table === 'budget_invitations' ? inv : makeChain()) as never,
    );

    const { result } = renderHook(() => useCollaboration('budget-9'));
    let url: string | null = null;
    await act(async () => { url = await result.current.createInvite(); });

    // 갱신 페이로드: 상태 pending + 만료 정확히 7일 연장
    expect(inv.update).toHaveBeenCalledTimes(1);
    expect(inv.update).toHaveBeenCalledWith({ status: 'pending', expires_at: expected7d });
    // 갱신 대상 필터: 이 예산 + 빈 이메일(오너 직접 초대 행) — 다른 행 오염 방지
    expect(inv.eq).toHaveBeenCalledWith('budget_id', 'budget-9');
    expect(inv.eq).toHaveBeenCalledWith('email', '');
    // 갱신된 기존 토큰을 반환(멱등) — 결과도 동반 고정
    expect(url).toMatch(/\/invite\/TOK_REFRESHED$/);
  });

  it('INV.A4 정상 insert 경로에서는 update(409 갱신) 가 호출되지 않는다', async () => {
    const inv = makeChain({ single: { data: { token: 'TOK_OK' }, error: null } });
    vi.mocked(supabase.from).mockImplementation((table: string) =>
      (table === 'budget_invitations' ? inv : makeChain()) as never,
    );

    const { result } = renderHook(() => useCollaboration('budget-1'));
    await act(async () => { await result.current.createInvite(); });

    // 충돌이 없으면 update 분기 진입 금지(불필요 쓰기 방지)
    expect(inv.update).not.toHaveBeenCalled();
  });
});

describe('useCollaboration.createInvite — busy 토글 추적(INV.A6)', () => {
  it('INV.A6 busy 는 호출 전 false → 비동기 진행 중 true → 종료 후 false', async () => {
    // insert single 을 수동 제어 가능한 deferred 로 만들어 "진행 중" 윈도를 관찰.
    let resolveSingle: (v: { data: { token: string }; error: null }) => void = () => {};
    const pending = new Promise<{ data: { token: string }; error: null }>((res) => {
      resolveSingle = res;
    });
    const inv = makeChain();
    inv.single = vi.fn(() => pending);
    vi.mocked(supabase.from).mockImplementation((table: string) =>
      (table === 'budget_invitations' ? inv : makeChain()) as never,
    );

    const { result } = renderHook(() => useCollaboration('budget-1'));
    expect(result.current.busy).toBe(false);

    let invitePromise: Promise<string | null>;
    act(() => { invitePromise = result.current.createInvite(); });

    // setBusy(true) 동기 적용 → 진행 중 true 관찰
    await waitFor(() => expect(result.current.busy).toBe(true));

    await act(async () => {
      resolveSingle({ data: { token: 'TOK_BUSY' }, error: null });
      await invitePromise!;
    });

    // finally 블록이 항상 false 로 복귀
    expect(result.current.busy).toBe(false);
  });

  it('INV.A7 budgetId 없음(조기 return)에서는 busy 가 토글되지 않는다', async () => {
    const { result } = renderHook(() => useCollaboration(null));
    expect(result.current.busy).toBe(false);

    await act(async () => { await result.current.createInvite(); });

    // 조기 return 은 setBusy(true) 이전 — busy 불변
    expect(result.current.busy).toBe(false);
  });
});

describe('useCollaboration.refresh — budget_collaborators 정확 로드(INV.A8)', () => {
  it('INV.A8 refresh: select("user_id, role").eq("budget_id", id) 로 조회·상태반영', async () => {
    const col = makeChain({
      list: { data: [{ user_id: 'partner-1', role: 'editor' }], error: null },
    });
    vi.mocked(supabase.from).mockImplementation((table: string) =>
      (table === 'budget_collaborators' ? col : makeChain()) as never,
    );

    const { result } = renderHook(() => useCollaboration('budget-77'));

    await waitFor(() => expect(result.current.collaborators).toHaveLength(1));
    // 정확한 컬럼·필터 — over-fetch/오필터 방지
    expect(col.select).toHaveBeenCalledWith('user_id, role');
    expect(col.eq).toHaveBeenCalledWith('budget_id', 'budget-77');
    expect(result.current.collaborators[0]).toMatchObject({ user_id: 'partner-1', role: 'editor' });
  });

  it('INV.A9 refresh 가 data:null 을 돌려줘도 빈 배열로 안전 정규화', async () => {
    const col = makeChain({ list: { data: null, error: null } });
    vi.mocked(supabase.from).mockImplementation((table: string) =>
      (table === 'budget_collaborators' ? col : makeChain()) as never,
    );

    const { result } = renderHook(() => useCollaboration('budget-1'));

    // (data ?? []) 정규화 — undefined/null 로 collaborators 가 오염되지 않음
    await waitFor(() => expect(Array.isArray(result.current.collaborators)).toBe(true));
    expect(result.current.collaborators).toEqual([]);
  });
});

describe('useCollaboration.removeCollaborator — delete 인자 정확성', () => {
  it('INV.A10 delete 는 .eq("budget_id", id) + .eq("user_id", userId) 두 필터를 모두 건다', async () => {
    // budget_collaborators 는 마운트 refresh(select) + removeCollaborator(delete) + 후속 refresh 로
    // 여러 번 접근된다. 모든 체인을 모은 뒤 실제 .delete() 가 호출된 체인만 골라 검증한다.
    const colChains: Record<string, ReturnType<typeof vi.fn>>[] = [];
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'budget_collaborators') {
        const c = makeChain({ list: { data: [], error: null } });
        colChains.push(c);
        return c as never;
      }
      return makeChain() as never;
    });

    const { result } = renderHook(() => useCollaboration('budget-5'));
    // 마운트 refresh 완료 대기 → 그 다음 delete 체인을 명확히 분리.
    await waitFor(() => expect(colChains.length).toBeGreaterThanOrEqual(1));
    await act(async () => { await result.current.removeCollaborator('victim-9'); });

    const deleteChains = colChains.filter((c) => c.delete.mock.calls.length > 0);
    // 정확히 하나의 체인에서만 delete 발생(중복 삭제·오테이블 삭제 방지)
    expect(deleteChains).toHaveLength(1);
    const c = deleteChains[0];
    // 두 필터 모두 정확 — 한쪽만 걸면 다른 협업자/예산까지 삭제되는 치명 버그
    expect(c.eq).toHaveBeenCalledWith('budget_id', 'budget-5');
    expect(c.eq).toHaveBeenCalledWith('user_id', 'victim-9');
  });

  it('INV.A11 budgetId 없음 → delete 자체를 시도하지 않음(가드)', async () => {
    const calls: string[] = [];
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      calls.push(table);
      return makeChain() as never;
    });

    const { result } = renderHook(() => useCollaboration(null));
    await act(async () => { await result.current.removeCollaborator('victim-9'); });

    // budgetId null → 조기 return, supabase.from 미접근(마운트 refresh 도 조기 종료)
    expect(calls).not.toContain('budget_collaborators');
  });

  // [CL-BTNAUDIT3-20260704 | remove-err-check] delete error 를 검사해 false 반환(무음 실패 제거).
  //   형제 releasePartner/shareBudgetWithPartner 와 동일 계약 — 호출측이 실패 토스트를 띄울 수 있어야 한다.
  it('INV.A11b delete error → false 반환(성공 시 true)', async () => {
    // 실패 케이스: budget_collaborators delete 종단이 error 를 돌려줌
    vi.mocked(supabase.from).mockImplementation((table: string) =>
      (table === 'budget_collaborators'
        ? makeChain({ list: { data: null, error: { message: 'delete failed' } } })
        : makeChain()) as never,
    );
    const { result } = renderHook(() => useCollaboration('budget-5'));
    let ok: boolean | 'sentinel' = 'sentinel';
    await act(async () => { ok = await result.current.removeCollaborator('victim-9'); });
    expect(ok).toBe(false);

    // 성공 케이스: error 없음 → true
    vi.mocked(supabase.from).mockImplementation((table: string) =>
      (table === 'budget_collaborators'
        ? makeChain({ list: { data: [], error: null } })
        : makeChain()) as never,
    );
    const { result: ok2Result } = renderHook(() => useCollaboration('budget-5'));
    let ok2: boolean | 'sentinel' = 'sentinel';
    await act(async () => { ok2 = await ok2Result.current.removeCollaborator('victim-9'); });
    expect(ok2).toBe(true);
  });
});

describe('useCollaboration.createInvite — origin 비종속 URL 구성', () => {
  it('INV.A12 다른 호스트 origin 에서도 `${origin}/invite/<token>` 로 구성된다', async () => {
    // window.location.origin 을 다른 환경(prod 도메인)으로 교체 → 호스트 비종속 검증.
    const origDesc = Object.getOwnPropertyDescriptor(window, 'location');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, origin: 'https://wedsem.example.com' },
    });

    try {
      const inv = makeChain({ single: { data: { token: 'TOK_ORIGIN' }, error: null } });
      vi.mocked(supabase.from).mockImplementation((table: string) =>
        (table === 'budget_invitations' ? inv : makeChain()) as never,
      );

      const { result } = renderHook(() => useCollaboration('budget-1'));
      let url: string | null = null;
      await act(async () => { url = await result.current.createInvite(); });

      expect(url).toBe('https://wedsem.example.com/invite/TOK_ORIGIN');
      expect(result.current.inviteUrl).toBe('https://wedsem.example.com/invite/TOK_ORIGIN');
    } finally {
      if (origDesc) Object.defineProperty(window, 'location', origDesc);
    }
  });
});

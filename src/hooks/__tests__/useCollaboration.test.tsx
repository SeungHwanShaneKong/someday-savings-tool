// [CL-DBSWITCH-VERIFY-20260620] 공동 예산 초대 훅 단위 검증 — 컷오버 전 보완(D1/D2)
//
// 왜: 교훈 [CL-COEDIT-E2E-20260620] — 멱등 재발급을 "단순 재노출"로 하면 옛 expired/accepted
//     토큰을 돌려줘 수락이 실패한다(E2E가 발견). createInvite 는 409(UNIQUE) 시 기존 행을
//     pending+만료7일로 **갱신**해 항상 사용 가능한 토큰을 반환해야 한다. 그 계약을 유닛으로 고정.
// 격리: supabase 클라이언트는 setup.ts 전역 mock. 여기선 from() 을 테이블별로 오버라이드한다.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { supabase } from '@/integrations/supabase/client';
import { useCollaboration } from '@/hooks/useCollaboration';

// useAuth 는 hoisted 가변 홀더로 — 테스트별 user 교체(예: null 가드)
const h = vi.hoisted(() => ({ user: { id: 'owner-1' } as { id: string } | null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: h.user }) }));

// 체이너블 쿼리 mock — single() / then(=select 종단) 에 서로 다른 결과를 주입할 수 있다.
//  - createInvite insert 경로: .insert().select('token').single()  → single 결과 사용
//  - createInvite 409 경로   : .update().eq().eq().select('token') → then(배열) 결과 사용
function chain(opts: { single?: unknown; list?: unknown } = {}) {
  const single = opts.single ?? { data: null, error: null };
  const list = opts.list ?? { data: [], error: null };
  const q: Record<string, unknown> = {};
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'in',
    'order', 'limit', 'match', 'is', 'maybeSingle',
  ];
  for (const m of methods) q[m] = vi.fn(() => q);
  q.single = vi.fn(() => Promise.resolve(single));
  // thenable → await(.select 종단) 시 list 반환
  (q as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(list).then(resolve);
  return q;
}

beforeEach(() => {
  h.user = { id: 'owner-1' };
  vi.mocked(supabase.from).mockReset();
  // [CL-COEDIT-PARTICIPANTS-20260620] refresh 는 get_budget_participants RPC 우선. 이 스위트는 폴백(budget_collaborators)
  // 경로를 검증하므로 RPC 미배포(에러)를 기본값으로 강제한다. RPC 성공 경로는 .participants 스위트가 별도 검증.
  vi.mocked(supabase.rpc).mockReset();
  vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'rpc not deployed' } } as never);
});

describe('useCollaboration.createInvite (초대 발급 — 멱등 계약)', () => {
  it('IC.1 정상 발급: insert→token → `${origin}/invite/<token>` 반환', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) =>
      (table === 'budget_invitations'
        ? chain({ single: { data: { token: 'TOK_NEW' }, error: null } })
        : chain()) as never,
    );

    const { result } = renderHook(() => useCollaboration('budget-1'));
    let url: string | null = null;
    await act(async () => { url = await result.current.createInvite(); });

    expect(url).toMatch(/\/invite\/TOK_NEW$/);
    expect(result.current.inviteUrl).toBe(url);
  });

  it('IC.2 멱등 재발급(409): 기존 행 갱신 후 **기존 토큰** 재노출(null 아님)', async () => {
    // insert 는 UNIQUE 충돌(23505), update→select 가 갱신된 기존 토큰 반환
    vi.mocked(supabase.from).mockImplementation((table: string) =>
      (table === 'budget_invitations'
        ? chain({
            single: { data: null, error: { code: '23505', message: 'duplicate key' } },
            list: { data: [{ token: 'TOK_EXISTING' }], error: null },
          })
        : chain()) as never,
    );

    const { result } = renderHook(() => useCollaboration('budget-1'));
    let url: string | null = null;
    await act(async () => { url = await result.current.createInvite(); });

    // 핵심 회귀 가드: 충돌이어도 사용 가능한 링크를 돌려줘야 한다(옛 토큰 실패 버그 방지)
    expect(url).toMatch(/\/invite\/TOK_EXISTING$/);
    expect(url).not.toBeNull();
  });

  it('IC.3 budgetId 없음 → supabase 호출 없이 null', async () => {
    const { result } = renderHook(() => useCollaboration(null));
    let url: string | null = 'sentinel';
    await act(async () => { url = await result.current.createInvite(); });

    expect(url).toBeNull();
    // refresh 도 budgetId 없으면 즉시 종료 → from 미호출
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('IC.4 user 없음 → null (인증 전 발급 차단)', async () => {
    h.user = null;
    const { result } = renderHook(() => useCollaboration('budget-1'));
    let url: string | null = 'sentinel';
    await act(async () => { url = await result.current.createInvite(); });

    expect(url).toBeNull();
  });

  it('IC.5 insert·update 둘 다 토큰 없음 → null (안전 종단)', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) =>
      (table === 'budget_invitations'
        ? chain({
            single: { data: null, error: { code: '23505', message: 'dup' } },
            list: { data: [], error: null }, // 갱신도 토큰 못 줌
          })
        : chain()) as never,
    );

    const { result } = renderHook(() => useCollaboration('budget-1'));
    let url: string | null = 'sentinel';
    await act(async () => { url = await result.current.createInvite(); });

    expect(url).toBeNull();
  });
});

describe('useCollaboration.refresh / removeCollaborator (협업자 목록)', () => {
  it('IC.6 마운트 시 협업자 목록 로드', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) =>
      (table === 'budget_collaborators'
        ? chain({ list: { data: [{ user_id: 'u2', role: 'editor' }], error: null } })
        : chain()) as never,
    );

    const { result } = renderHook(() => useCollaboration('budget-1'));
    await waitFor(() => expect(result.current.collaborators).toHaveLength(1));
    expect(result.current.collaborators[0]).toMatchObject({ user_id: 'u2', role: 'editor' });
  });

  it('IC.7 removeCollaborator → delete 후 refresh 재조회', async () => {
    const calls: string[] = [];
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      calls.push(table);
      return chain({ list: { data: [], error: null } }) as never;
    });

    const { result } = renderHook(() => useCollaboration('budget-1'));
    await act(async () => { await result.current.removeCollaborator('u2'); });

    // delete 대상 + refresh 모두 budget_collaborators 테이블 접근
    expect(calls.filter((t) => t === 'budget_collaborators').length).toBeGreaterThanOrEqual(2);
  });
});

// [CL-COEDIT-PARTICIPANTS-20260620] useCollaboration.refresh — get_budget_participants RPC(이름 포함) 경로 검증.
//
// 계약: (1) RPC 성공 → display_name 매핑 + isMe(본인) 계산 (2) RPC 에러 → budget_collaborators 폴백('파트너', display_name 없음)
//       (3) 본인 행도 목록에 포함(필터는 컴포넌트 책임) — isMe=true 로 표기.
// 격리: supabase 는 setup.ts 전역 mock. rpc/from 을 테스트별로 오버라이드.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { supabase } from '@/integrations/supabase/client';
import { useCollaboration } from '@/hooks/useCollaboration';

const h = vi.hoisted(() => ({ user: { id: 'owner-1' } as { id: string } | null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: h.user }) }));

function chain(list: unknown) {
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'order', 'limit']) q[m] = vi.fn(() => q);
  q.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  (q as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: list, error: null }).then(resolve);
  return q;
}

beforeEach(() => {
  h.user = { id: 'owner-1' };
  vi.mocked(supabase.from).mockReset();
  vi.mocked(supabase.rpc).mockReset();
});

describe('useCollaboration.refresh — 참여자 이름(RPC) 경로', () => {
  it('PA.1 RPC 성공: display_name 매핑 + 본인 isMe=true / 상대 isMe=false', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [
        { user_id: 'owner-1', role: 'owner', display_name: '신랑 민준' },
        { user_id: 'partner-9', role: 'editor', display_name: '신부 서연' },
      ],
      error: null,
    } as never);

    const { result } = renderHook(() => useCollaboration('budget-1'));
    await waitFor(() => expect(result.current.collaborators).toHaveLength(2));

    // [CL-ACQ-EMAIL-RPC-20260622-233012] 이제 이메일 포함 RPC 가 1순위(개선5). 미배포 시 get_budget_participants 폴백.
    expect(vi.mocked(supabase.rpc)).toHaveBeenCalledWith('get_budget_participants_email', { p_budget_id: 'budget-1' });
    const me = result.current.collaborators.find((c) => c.user_id === 'owner-1');
    const other = result.current.collaborators.find((c) => c.user_id === 'partner-9');
    expect(me).toMatchObject({ role: 'owner', display_name: '신랑 민준', isMe: true });
    expect(other).toMatchObject({ role: 'editor', display_name: '신부 서연', isMe: false });
  });

  it('PA.2 RPC 에러 → budget_collaborators 폴백(display_name 없음, isMe 계산)', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'function does not exist' } } as never);
    vi.mocked(supabase.from).mockImplementation((table: string) =>
      (table === 'budget_collaborators'
        ? chain([{ user_id: 'partner-9', role: 'editor' }])
        : chain([])) as never,
    );

    const { result } = renderHook(() => useCollaboration('budget-1'));
    await waitFor(() => expect(result.current.collaborators).toHaveLength(1));

    const c = result.current.collaborators[0];
    expect(c).toMatchObject({ user_id: 'partner-9', role: 'editor', isMe: false });
    expect(c.display_name).toBeUndefined(); // 폴백엔 이름 없음 → 컴포넌트가 '파트너'로 표기
  });

  it('PA.3 RPC 빈 배열(권한 없음 등) → 빈 목록(폴백 미진입)', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as never);
    // from 을 세팅해도 호출되면 안 됨(RPC 성공=빈배열이므로 폴백 미진입)
    vi.mocked(supabase.from).mockImplementation(() => chain([{ user_id: 'x', role: 'editor' }]) as never);

    const { result } = renderHook(() => useCollaboration('budget-1'));
    await waitFor(() => expect(vi.mocked(supabase.rpc)).toHaveBeenCalled());

    expect(result.current.collaborators).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

// [CL-AUDIT-R3-SHARE-20260623-000000] shareBudgetWithPartner — 침묵 실패 방지(결과 검사)
describe('useCollaboration.shareBudgetWithPartner — ok 반환(폴백 유도)', () => {
  // 참여자/파트너 RPC 는 빈 배열로(refresh 조기 종료, from 폴백 미진입), share 만 시나리오별 반환
  const setRpc = (shareResult: unknown) =>
    vi.mocked(supabase.rpc).mockImplementation(((fn: string) =>
      Promise.resolve(fn === 'share_budget_with_partner' ? shareResult : { data: [], error: null })) as never);

  it('PA.4 RPC ok:true → true', async () => {
    setRpc({ data: { ok: true, status: 'shared' }, error: null });
    const { result } = renderHook(() => useCollaboration('budget-1'));
    expect(await result.current.shareBudgetWithPartner('budget-1')).toBe(true);
  });
  it('PA.5 RPC 에러 → false(호출측이 초대 폴백)', async () => {
    setRpc({ data: null, error: { message: 'PGRST202 function not found' } });
    const { result } = renderHook(() => useCollaboration('budget-1'));
    expect(await result.current.shareBudgetWithPartner('budget-1')).toBe(false);
  });
  it('PA.6 RPC ok:false(not_owner) → false', async () => {
    setRpc({ data: { ok: false, error: 'not_owner' }, error: null });
    const { result } = renderHook(() => useCollaboration('budget-1'));
    expect(await result.current.shareBudgetWithPartner('budget-1')).toBe(false);
  });
});

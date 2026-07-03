// [CL-SEC-AUDIT-R2-20260703-130000] useChatBudgetSummary — 조회 실패 관측성(로그) 회귀 가드.
//   R2 감사: 실패가 무음(setSummary(null)만)이라 네트워크/RLS 디버깅 불가 → console.debug 관측 로그 추가.
//   degrade-safe 동작(summary=null)은 불변 유지.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useChatBudgetSummary } from '../useChatBudgetSummary';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 't@t.com' }, loading: false, session: null }),
}));

/** thenable 쿼리 스텁 — await 시 지정 결과 반환(전역 setup 모킹과 동형 체인). */
const makeResultQuery = (result: { data: unknown; error: unknown }) => {
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order', 'single', 'maybeSingle']) q[m] = vi.fn(() => q);
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return q;
};

describe('useChatBudgetSummary — 관측성', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('budgets 조회 실패 시 console.debug 로 원인 로깅 + summary=null(degrade-safe)', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeResultQuery({ data: null, error: { message: 'network down' } }) as never,
    );

    const { result } = renderHook(() => useChatBudgetSummary({ enabled: true }));

    await waitFor(() =>
      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('budgets 조회 실패'),
        'network down',
      ),
    );
    expect(result.current.summary).toBeNull();
  });

  it('정상(예산 없음)은 로깅하지 않는다 — 신규 유저 정상 경로', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeResultQuery({ data: [], error: null }) as never,
    );

    const { result } = renderHook(() => useChatBudgetSummary({ enabled: true }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(debugSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('budgets 조회 실패'),
      expect.anything(),
    );
    expect(result.current.summary).toBeNull();
  });
});

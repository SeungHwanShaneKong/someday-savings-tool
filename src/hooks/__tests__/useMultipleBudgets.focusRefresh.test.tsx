// [CL-COEDIT-OWNER-REFRESH-20260620] useMultipleBudgets — 탭 복귀(focus/visibilitychange) 자동 재조회(F1B).
//
// 왜: 파트너가 초대를 수락하면 오너 소유 예산에 협업자가 생긴다. 오너가 앱으로 돌아왔을 때(focus/visible)
//     예산을 재조회해야 해당 예산이 자동으로 '우리'에 반영된다(수동 새로고침 불요).
// 계약: (1) focus/visibilitychange(visible) → fetchBudgets 재실행(budgets 재조회)
//       (2) 3초 내 연속 이벤트는 쓰로틀(1회만) (3) user 없으면 리스너 미등록 (4) hidden 상태면 재조회 안 함.
// 격리: supabase 전역 mock. from('budgets') 호출 횟수를 카운트해 재조회를 관찰.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { supabase } from '@/integrations/supabase/client';
import { useMultipleBudgets } from '@/hooks/useMultipleBudgets';

const h = vi.hoisted(() => ({ user: { id: 'owner-1' } as { id: string } | null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: h.user }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const NOW = '2026-06-20T00:00:00.000Z';
function mkBudget() {
  return { id: 'b1', user_id: 'owner-1', name: '옵션 1', wedding_date: null, created_at: NOW, updated_at: NOW };
}
function chain(list: unknown) {
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'order', 'limit', 'is', 'match']) {
    q[m] = vi.fn(() => q);
  }
  q.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  (q as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: list, error: null }).then(resolve);
  return q;
}

/** budgets 테이블 from() 호출 횟수를 세는 from 구현 설치. */
function installCounting() {
  const counts = { budgets: 0 };
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    if (table === 'budgets') {
      counts.budgets++;
      return chain([mkBudget()]) as never;
    }
    if (table === 'budget_items') return chain([]) as never;
    return chain([]) as never; // budget_collaborators 등
  }) as never);
  return counts;
}

beforeEach(() => {
  h.user = { id: 'owner-1' };
  vi.mocked(supabase.from).mockReset();
  vi.mocked(supabase.rpc).mockReset();
});

afterEach(() => {
  // visibilityState 오버라이드 복구
  try {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  } catch { /* noop */ }
});

describe('useMultipleBudgets — 탭 복귀 자동 재조회(F1B)', () => {
  it('FR.1 window focus(visible) → budgets 재조회', async () => {
    const counts = installCounting();
    const { result } = renderHook(() => useMultipleBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const before = counts.budgets;
    act(() => { window.dispatchEvent(new Event('focus')); });
    await waitFor(() => expect(counts.budgets).toBeGreaterThan(before));
  });

  it('FR.2 3초 내 연속 focus 2회 → 1회만 재조회(쓰로틀)', async () => {
    const counts = installCounting();
    const { result } = renderHook(() => useMultipleBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const before = counts.budgets;
    act(() => {
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('focus')); // 즉시 두 번째 → 쓰로틀로 스킵
    });
    await waitFor(() => expect(counts.budgets).toBe(before + 1));
  });

  it('FR.3 visibilitychange(visible) 도 재조회 트리거', async () => {
    const counts = installCounting();
    const { result } = renderHook(() => useMultipleBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const before = counts.budgets;
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    await waitFor(() => expect(counts.budgets).toBeGreaterThan(before));
  });

  it('FR.4 user 없음 → 리스너 미등록(focus 무시)', async () => {
    h.user = null;
    const counts = installCounting();
    const { result } = renderHook(() => useMultipleBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const before = counts.budgets; // user 없음 → 마운트 fetch 없음 → 0
    act(() => { window.dispatchEvent(new Event('focus')); });
    // 동기 핸들러였다면 즉시 증가했을 것 — 리스너 미등록이라 불변
    expect(counts.budgets).toBe(before);
  });

  it('FR.5 hidden 상태에서는 focus 가 와도 재조회 안 함', async () => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    const counts = installCounting();
    const { result } = renderHook(() => useMultipleBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const before = counts.budgets;
    act(() => { window.dispatchEvent(new Event('focus')); });
    expect(counts.budgets).toBe(before); // visibilityState!=='visible' → 조기 return
  });
});

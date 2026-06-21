// [CL-AUDIT-CUMSUM-BOUNDARY-20260622] 훅 배선 회귀 가드 — 누적 baseline 컷오프가
//   시각보존 startISO 가 아니라 firstTrendBucketStart(day-aligned)를 쓰는지 고정한다.
//   (독립 검증관 MUTATION A: useAdminKPI 의 .lt('created_at', cumulativeBaselineISO)를 startISO 로
//    되돌려도 순수 헬퍼 테스트만으론 침묵 통과 → 배선을 묶는 본 테스트로 차단.)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminKPI } from '@/hooks/useAdminKPI';
import { firstTrendBucketStart } from '@/lib/kpi-definitions';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'admin' } }) }));

// baseline head-count(profiles, {count:exact,head:true}) 쿼리의 .lt('created_at', X) 값을 포착
let baselineLt: string | null = null;

function makeChain(table: string) {
  let isCountHead = false;
  const q: Record<string, unknown> = {};
  for (const m of ['insert', 'update', 'delete', 'eq', 'neq', 'gte', 'lte', 'in', 'order', 'match', 'is', 'gt']) {
    q[m] = vi.fn(() => q);
  }
  q.select = vi.fn((_cols?: unknown, opts?: { head?: boolean }) => {
    if (opts && opts.head) isCountHead = true;
    return q;
  });
  q.lt = vi.fn((col: string, val: string) => {
    if (table === 'profiles' && isCountHead && col === 'created_at') baselineLt = val;
    return q;
  });
  q.range = vi.fn(() => Promise.resolve({ data: [], error: null }));
  q.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  (q as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(isCountHead ? { count: 0, data: null, error: null } : { data: [], error: null, count: 0 }).then(resolve);
  return q;
}

beforeEach(() => {
  baselineLt = null;
  vi.mocked(supabase.from).mockReset();
  vi.mocked(supabase.from).mockImplementation(((table: string) => makeChain(table)) as never);
});

describe('useAdminKPI — 누적 baseline 컷오프 배선(경계 갭 회귀 가드)', () => {
  it('baseline .lt(created_at) = firstTrendBucketStart(endDate, periodDays), 시각보존 startISO 가 아님', async () => {
    const endDate = new Date('2026-06-22T14:30:00');
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 30);
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const { result } = renderHook(() => useAdminKPI());
    await act(async () => {
      await result.current.fetchData(startDate, endDate);
    });

    expect(baselineLt).not.toBeNull();
    expect(baselineLt).toBe(firstTrendBucketStart(endDate, periodDays).toISOString());
    // 핵심: 시각보존 startISO 를 쓰면 경계 갭 버그 → 그 회귀를 차단
    expect(baselineLt).not.toBe(startDate.toISOString());
  });
});

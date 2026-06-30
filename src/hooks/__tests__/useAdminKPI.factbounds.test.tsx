// [CL-FACT-COMPUTE-20260630] useAdminKPI 배선 회귀 가드(개선1):
//   ① MAU=0 인데 공유/스냅샷 사용자>0 → K13/K14 가 거짓 100% 가 아니라 '측정불가'(state) 로 방출되는지.
//   ② DAU/WAU/MAU page_views 페치(select 'user_id')가 endDate 상한(.lte)을 거는지(드리프트/기간외 차단).
//   순수 computeUsageRates 단위테스트(kpi-compute.test)와 별개로, loadAdminKpi 가 그것을 '올바르게 배선'했는지 고정.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminKPI } from '@/hooks/useAdminKPI';
import { makeQueryClient } from '@/test/test-utils';

const ADMIN_USER_ID = 'f628fbf6-5f2f-4ca1-86e0-21eb2395bc40';
const ISO = '2026-06-10T00:00:00.000Z';

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: makeQueryClient() }, children);

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'admin' } }) }));

// select 'user_id' 만 고른 page_views 페치(=DAU/WAU/MAU)의 gte/lte 포착
let pvUserIdQueries: Array<{ gte: string[]; lte: string[] }> = [];

interface Chain { _sel?: string; _gte: string[]; _lte: string[]; _eq: Array<[string, unknown]>; _head: boolean; [k: string]: unknown }

function resolveThen(table: string, c: Chain): unknown {
  if (c._head) return { count: 0, data: null, error: null };
  if (table === 'budgets') {
    const isAdminIds = c._eq.some(([col, val]) => col === 'user_id' && val === ADMIN_USER_ID);
    return isAdminIds
      ? { data: [], error: null }                                   // admin 소유 예산 id → 없음(b1 미필터)
      : { data: [{ id: 'b1', user_id: 'u1', created_at: ISO }], error: null };
  }
  if (table === 'shared_budgets') return { data: [{ id: 's1', budget_id: 'b1', created_at: ISO }], error: null };
  if (table === 'budget_snapshots') return { data: [{ id: 'snap1', user_id: 'u2', created_at: ISO }], error: null };
  return { data: [], error: null }; // profiles 등
}

function makeChain(table: string): Chain {
  const c = { _gte: [], _lte: [], _eq: [], _head: false } as Chain;
  const pass = ['insert', 'update', 'delete', 'upsert', 'neq', 'gt', 'lt', 'like', 'ilike', 'is', 'in', 'contains', 'order', 'limit', 'match', 'filter', 'or', 'not', 'textSearch', 'returns', 'maybeSingle', 'single'];
  for (const m of pass) c[m] = vi.fn(() => c);
  c.select = vi.fn((cols?: string, opts?: { head?: boolean }) => { c._sel = cols; if (opts?.head) c._head = true; return c; });
  c.eq = vi.fn((col: string, val: unknown) => { c._eq.push([col, val]); return c; });
  c.gte = vi.fn((_col: string, val: string) => { c._gte.push(val); return c; });
  c.lte = vi.fn((_col: string, val: string) => { c._lte.push(val); return c; });
  c.range = vi.fn(() => {
    if (table === 'page_views' && c._sel === 'user_id') pvUserIdQueries.push({ gte: [...c._gte], lte: [...c._lte] });
    return Promise.resolve({ data: [], error: null }); // page_views/budget_items 페이지네이션 → 빈(=MAU 0)
  });
  c.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resolveThen(table, c)).then(resolve);
  return c;
}

beforeEach(() => {
  pvUserIdQueries = [];
  vi.mocked(supabase.from).mockReset();
  vi.mocked(supabase.from).mockImplementation(((table: string) => makeChain(table)) as never);
  vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as never);
});

describe('useAdminKPI — fact만(정직상태) 배선 가드', () => {
  it('MAU=0 인데 공유/스냅샷>0 → K13/K14 = 측정불가(거짓 100% 차단), value=0 placeholder', async () => {
    const endDate = new Date('2026-06-22T14:30:00');
    const startDate = new Date(endDate); startDate.setDate(startDate.getDate() - 30);

    const { result } = renderHook(() => useAdminKPI(startDate, endDate), { wrapper });
    await waitFor(() => expect(result.current.kpiValues.length).toBeGreaterThan(0));

    const k13 = result.current.kpiValues.find(k => k.id === 'K13');
    const k14 = result.current.kpiValues.find(k => k.id === 'K14');
    expect(k13?.state).toBe('unmeasurable');
    expect(k13?.value).toBe(0);
    expect(k14?.state).toBe('unmeasurable');
  });

  it('DAU/WAU/MAU page_views 페치 3종이 endDate 상한(.lte)을 건다(드리프트/기간외 차단)', async () => {
    const endDate = new Date('2026-06-22T14:30:00');
    const startDate = new Date(endDate); startDate.setDate(startDate.getDate() - 30);
    const endISO = endDate.toISOString();

    const { result } = renderHook(() => useAdminKPI(startDate, endDate), { wrapper });
    await waitFor(() => expect(result.current.kpiValues.length).toBeGreaterThan(0));

    // today/week/month 3종(select 'user_id')
    expect(pvUserIdQueries.length).toBe(3);
    for (const q of pvUserIdQueries) {
      expect(q.lte).toContain(endISO); // 상한이 endDate 로 걸림(과거: lte 미존재)
    }
  });
});

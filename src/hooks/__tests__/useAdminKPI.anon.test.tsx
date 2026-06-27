// [CL-ANONVISIT-ADMIN-20260627-234656] useAdminKPI 의 익명 방문 RPC 매핑/degrade 검증.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminKPI } from '@/hooks/useAdminKPI';
import { makeQueryClient } from '@/test/test-utils';

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: makeQueryClient() }, children);

const rpcMock = vi.mocked(supabase.rpc);
const start = new Date('2026-06-01T00:00:00Z');
const end = new Date('2026-06-30T00:00:00Z');

beforeEach(() => {
  rpcMock.mockReset();
});

describe('useAdminKPI — 전체 방문(익명) RPC 매핑', () => {
  it('AN.1 anon RPC 3종 데이터가 anonTrafficTrend/anonSourceData/anonTopPages 로 매핑', async () => {
    rpcMock.mockImplementation((async (name: string) => {
      if (name === 'admin_anon_traffic_trend') return { data: [{ day: '2026-06-20', views: 10, sessions: 4 }], error: null };
      if (name === 'admin_anon_source_breakdown') return { data: [{ source: 'organic', visits: 7 }], error: null };
      if (name === 'admin_anon_top_pages') return { data: [{ page_path: '/budget', views: 5 }], error: null };
      return { data: [], error: null };
    }) as never);

    const { result } = renderHook(() => useAdminKPI(start, end, { enabled: true }), { wrapper });
    await waitFor(() => expect(result.current.anonTrafficTrend.length).toBe(1));

    expect(result.current.anonTrafficTrend[0]).toMatchObject({ views: 10, sessions: 4 });
    expect(typeof result.current.anonTrafficTrend[0].day).toBe('string');
    expect(result.current.anonSourceData).toEqual([{ source: 'organic', users: 7 }]); // visits→users 매핑
    expect(result.current.anonTopPages).toEqual([{ path: '/budget', views: 5 }]);
  });

  it('AN.2 anon RPC 미배포/오류 → [] degrade(대시보드 무영향)', async () => {
    rpcMock.mockImplementation((async () => ({ data: null, error: { code: '42883', message: 'function does not exist' } })) as never);

    const { result } = renderHook(() => useAdminKPI(start, end, { enabled: true }), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.anonTrafficTrend).toEqual([]);
    expect(result.current.anonSourceData).toEqual([]);
    expect(result.current.anonTopPages).toEqual([]);
  });

  it('AN.3 enabled:false → 쿼리 비활성(데이터 비움, 첫 로딩 아님)', async () => {
    const { result } = renderHook(() => useAdminKPI(start, end, { enabled: false }), { wrapper });
    await Promise.resolve();
    expect(result.current.anonTrafficTrend).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  // [CL-AUDIT2-R4-DEGRADE-20260628] F7 회귀: 코어 페치(page_views) 실패 → 전체 백지화/throw 가 아니라
  //   해당 source 만 [] degrade + partialError 노출. (마지막 테스트 — supabase.from override)
  it('AN.4 코어 페치 실패 → 부분 degrade(partialError 노출), 쿼리 throw 없음 (F7)', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null } as never);
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      const q: Record<string, unknown> = {};
      const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'order', 'match', 'is', 'limit'];
      for (const m of methods) q[m] = vi.fn(() => q);
      // page_views 의 페이지네이션(.range)만 에러 → fetchAllRows throw → safe() 가 catch
      q.range = vi.fn(() =>
        table === 'page_views'
          ? Promise.resolve({ data: null, error: { code: '57014', message: 'statement timeout' } })
          : Promise.resolve({ data: [], error: null }),
      );
      (q as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null, count: 0 }).then(resolve);
      return q;
    }) as never);

    const { result } = renderHook(() => useAdminKPI(start, end, { enabled: true }), { wrapper });
    await waitFor(() => expect(result.current.partialError).not.toBeNull());
    expect(result.current.partialError).toContain('page_views'); // 부분 degrade 노출
    expect(result.current.loading).toBe(false); // 크래시/영구로딩 없음
  });
});

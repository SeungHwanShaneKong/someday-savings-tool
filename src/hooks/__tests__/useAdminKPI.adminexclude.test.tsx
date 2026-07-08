// [CL-ADMIN-EXCLUDE-GUARD-20260709-071500] admin/스태프 제외 '배선' 회귀 가드.
//   독립 검증관 MUTATION 5 대응: 훅의 .not('user_id','in',adminInList) 필터 10곳을 전부 제거해도
//   기존 테스트(anon RPC 매핑·boundary baselineLt·factbounds)가 전부 침묵 통과(가짜그린) → 이번 변경의
//   핵심('단일 하드코딩 uid → role 전원제외')이 회귀 무방비였다. 본 가드는 훅이 실제로 user-소유 테이블에
//   admin 제외 필터를 배선하는지( .not('user_id','in', '(uuid,...)') 포맷 + 4개 테이블 커버 )를 포착한다.
//   순수함수 excludeAdmins 골든과 상호보완(순수 로직 vs 훅 배선).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminKPI } from '@/hooks/useAdminKPI';
import { makeQueryClient } from '@/test/test-utils';

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: makeQueryClient() }, children);

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'admin' } }) }));

// 하드코딩 폴백 uid (useAdminKPI 의 ADMIN_USER_ID) — user_roles 페치가 [] 를 반환하면 이 값 단독의 IN 리스트가 된다.
const HARDCODED_ADMIN = 'f628fbf6-5f2f-4ca1-86e0-21eb2395bc40';

// 모든 .not(col, op, val) 호출을 테이블과 함께 포착
let notCalls: Array<{ table: string; col: unknown; op: unknown; val: unknown }> = [];

function makeChain(table: string) {
  const q: Record<string, unknown> = {};
  for (const m of ['insert', 'update', 'delete', 'eq', 'neq', 'gte', 'lte', 'in', 'order', 'match', 'is', 'gt']) {
    q[m] = vi.fn(() => q);
  }
  q.select = vi.fn(() => q);
  q.lt = vi.fn(() => q);
  q.not = vi.fn((col: unknown, op: unknown, val: unknown) => {
    notCalls.push({ table, col, op, val });
    return q;
  });
  // fetchAllRows 의 페이지네이션 종료(빈 페이지 → 1페이지에서 멈춤)
  q.range = vi.fn(() => Promise.resolve({ data: [], error: null }));
  q.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  // await/then 직접 소비 경로(profiles/budgets/snapshots/head-count)
  (q as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null, count: 0 }).then(resolve);
  return q;
}

beforeEach(() => {
  notCalls = [];
  vi.mocked(supabase.from).mockReset();
  vi.mocked(supabase.from).mockImplementation(((table: string) => makeChain(table)) as never);
  // 익명 RPC 3종 등은 [] degrade (본 가드와 무관하게 배치 완주)
  vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as never);
});

describe('useAdminKPI — admin/스태프 제외 배선(회귀 가드)', () => {
  it('user-소유 테이블 4종(profiles·page_views·budgets·budget_snapshots)에 .not(user_id, in, (uuid…)) 를 배선한다', async () => {
    const endDate = new Date('2026-06-30T14:30:00Z');
    const startDate = new Date('2026-06-01T00:00:00Z');

    const { result } = renderHook(() => useAdminKPI(), { wrapper });
    await act(async () => {
      await result.current.fetchData(startDate, endDate);
    });

    const userIdNot = notCalls.filter((c) => c.col === 'user_id');

    // (1) 배선 존재 — 필터를 전부 제거하면 length 0 → 실패(MUTATION 5 kill)
    expect(userIdNot.length).toBeGreaterThanOrEqual(4);

    // (2) 연산자/포맷 — postgrest .not(col,'in','(v1,v2,...)') 계약. user_roles 빈 → 하드코딩 폴백 단독.
    for (const c of userIdNot) {
      expect(c.op).toBe('in');
      expect(c.val).toBe(`(${HARDCODED_ADMIN})`);
    }

    // (3) 커버리지 — user_id 를 가진 4개 테이블 전부 제외(어느 하나라도 누락 시 실패 = 부분 회귀 kill)
    const tables = new Set(userIdNot.map((c) => c.table));
    for (const t of ['profiles', 'page_views', 'budgets', 'budget_snapshots']) {
      expect(tables.has(t)).toBe(true);
    }
  });

  it('user_roles(role=admin) 페치 결과를 IN 리스트에 합집합(union)한다 — degrade-safe', async () => {
    const EXTRA_ADMIN = '11111111-2222-3333-4444-555555555555';
    // user_roles 만 admin 1명 추가 반환, 나머지는 기본 빈 체인
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'user_roles') {
        const q: Record<string, unknown> = {};
        q.select = vi.fn(() => q);
        q.eq = vi.fn(() => q);
        (q as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: [{ user_id: EXTRA_ADMIN }], error: null }).then(resolve);
        return q;
      }
      return makeChain(table);
    }) as never);

    const endDate = new Date('2026-06-30T14:30:00Z');
    const startDate = new Date('2026-06-01T00:00:00Z');

    const { result } = renderHook(() => useAdminKPI(), { wrapper });
    await act(async () => {
      await result.current.fetchData(startDate, endDate);
    });

    const userIdNot = notCalls.filter((c) => c.col === 'user_id');
    expect(userIdNot.length).toBeGreaterThanOrEqual(4);
    // union: 하드코딩 + user_roles admin 둘 다 IN 리스트에 포함
    for (const c of userIdNot) {
      expect(c.op).toBe('in');
      expect(String(c.val)).toContain(HARDCODED_ADMIN);
      expect(String(c.val)).toContain(EXTRA_ADMIN);
    }
  });
});

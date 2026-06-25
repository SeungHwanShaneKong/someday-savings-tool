// [CL-VULN-V3-GAMIFY-RACE-20260624] 게이미피케이션 동시 증분 lost-update 회귀가드
//
// 버그: BudgetFlow 의 onNudged(+5)·시머(+3)·마일스톤(+2) 보상이 '절대값'(클로저 스냅샷 base+N)으로
//   mutate → useGamificationState.mutationFn 의 {...current,...updates} 가 fresh current 를 덮어써
//   동시/연속 보상에서 한쪽 델타가 유실됐다. 근본수정: increment(delta) API(최신 캐시 read-modify-write
//   + 동일 유저 mutation 직렬화). 이 테스트는 두 증분이 모두 보존됨을 DB 시뮬레이터의 write 페이로드로 입증.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from '@/test/test-utils';
import { supabase } from '@/integrations/supabase/client';
import { useGamificationState } from '@/hooks/useGamificationState';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));

// profiles DB 시뮬레이터: update 가 쓴 gamification_state 를 보관하고 select 가 그대로 반환(영속성 모사).
let dbState: Record<string, unknown>;
let writes: Record<string, unknown>[];

function installProfilesDb(initial: Record<string, unknown>) {
  dbState = { ...initial };
  writes = [];
  vi.mocked(supabase.from).mockImplementation(((_table: string) => {
    const q: Record<string, unknown> = {};
    const methods = ['select', 'eq', 'order', 'limit', 'in', 'is', 'gte', 'lte', 'gt', 'lt', 'match', 'neq'];
    for (const m of methods) q[m] = vi.fn(() => q);
    q.maybeSingle = vi.fn(() => Promise.resolve({ data: { gamification_state: dbState }, error: null }));
    q.single = vi.fn(() => Promise.resolve({ data: { gamification_state: dbState }, error: null }));
    q.update = vi.fn((payload: { gamification_state?: Record<string, unknown> }) => {
      if (payload?.gamification_state) {
        dbState = { ...payload.gamification_state };
        writes.push(dbState as Record<string, unknown>);
      }
      return q;
    });
    (q as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(resolve);
    return q as never;
  }) as never);
}

// [R6-A] 캐시 미로드(쿼리 pending) 재현 — 첫 select 는 영원히 pending(쿼리가 캐시를 못 채움 = cold),
// 이후 select(=write 경로의 resolveBase DB fetch)는 dbState 반환.
function installProfilesDbColdCache(initial: Record<string, unknown>) {
  dbState = { ...initial };
  writes = [];
  let selectCalls = 0;
  vi.mocked(supabase.from).mockImplementation(((_table: string) => {
    const q: Record<string, unknown> = {};
    const methods = ['select', 'eq', 'order', 'limit', 'in', 'is', 'gte', 'lte', 'gt', 'lt', 'match', 'neq'];
    for (const m of methods) q[m] = vi.fn(() => q);
    const resolver = () => {
      selectCalls += 1;
      if (selectCalls === 1) return new Promise(() => {}); // 첫 호출(쿼리) → 영원히 pending = 캐시 cold
      return Promise.resolve({ data: { gamification_state: dbState }, error: null }); // resolveBase 의 DB fetch
    };
    q.maybeSingle = vi.fn(resolver);
    q.single = vi.fn(resolver);
    q.update = vi.fn((payload: { gamification_state?: Record<string, unknown> }) => {
      if (payload?.gamification_state) { dbState = { ...payload.gamification_state }; writes.push(dbState as Record<string, unknown>); }
      return q;
    });
    (q as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(resolve);
    return q as never;
  }) as never);
}

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = makeQueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  vi.mocked(supabase.from).mockReset();
});

describe('useGamificationState 동시 증분 (V3 lost-update)', () => {
  const SEED = { total_points: 100, level: 1, coedit_nudges_sent: 0, partner_reviews: 0, unlocked_badge_slugs: [] };

  it('V3 increment 두 번(연속) → 두 델타 모두 보존(108·coedit1·pr1, 절대값 클로버 없음)', async () => {
    installProfilesDb(SEED);
    const { result } = renderHook(() => useGamificationState(), { wrapper });
    await waitFor(() => expect(result.current.state.total_points).toBe(100));

    await act(async () => {
      result.current.increment({ total_points: 5, coedit_nudges_sent: 1 });
      result.current.increment({ total_points: 3, partner_reviews: 1 });
      await new Promise((r) => setTimeout(r, 60)); // 직렬 실행 + 영속화 대기
    });

    await waitFor(() => expect(writes.length).toBeGreaterThanOrEqual(2));
    const last = writes[writes.length - 1];
    expect(last.total_points).toBe(108); // 100 + 5 + 3 — 한쪽도 유실 없음
    expect(last.coedit_nudges_sent).toBe(1);
    expect(last.partner_reviews).toBe(1);
  });

  it('V3b addPoints 도 increment 경로 → 마일스톤(+2)과 nudge(+5) 동시에도 합산 보존', async () => {
    installProfilesDb(SEED);
    const { result } = renderHook(() => useGamificationState(), { wrapper });
    await waitFor(() => expect(result.current.state.total_points).toBe(100));

    await act(async () => {
      result.current.increment({ total_points: 5, coedit_nudges_sent: 1 });
      result.current.addPoints(2);
      await new Promise((r) => setTimeout(r, 60));
    });

    await waitFor(() => expect(writes.length).toBeGreaterThanOrEqual(2));
    const last = writes[writes.length - 1];
    expect(last.total_points).toBe(107); // 100 + 5 + 2
    expect(last.coedit_nudges_sent).toBe(1);
  });
});

// [CL-VULN-R6A-COLDCACHE-20260625] 캐시 미로드 시 gamification_state 전체 DEFAULT 클로버 방지(데이터 유실 impact5).
//  write 경로(increment/append/absolute)는 캐시가 비었으면 DB 최신값을 base 로 read-modify-write 해야 한다(DEFAULT 금지).
describe('useGamificationState 캐시 미로드 클로버 (R6-A 회귀가드)', () => {
  const RICH = {
    total_points: 250, level: 5, login_streak_days: 14, checklist_streak_days: 9,
    coedit_nudges_sent: 2, partner_reviews: 4,
    unlocked_badge_slugs: ['first_budget', 'streak_7', 'coedit_duo_caller'],
  };

  it('R6-A increment 가 쿼리 로드 전 호출돼도 스트릭·배지·점수 보존(DEFAULT 클로버 금지)', async () => {
    installProfilesDbColdCache(RICH);
    const { result } = renderHook(() => useGamificationState(), { wrapper });
    // 쿼리 pending(캐시 cold) 상태에서 즉시 증분 — 로드 대기하지 않음
    await act(async () => {
      result.current.increment({ total_points: 3, partner_reviews: 1 });
      await new Promise((r) => setTimeout(r, 120));
    });
    const last = writes[writes.length - 1];
    expect(last).toBeTruthy();
    expect(last.total_points).toBe(253);          // 250+3 (DEFAULT면 3 → RED)
    expect(last.partner_reviews).toBe(5);          // 4+1
    expect(last.login_streak_days).toBe(14);       // 보존(0이면 클로버)
    expect(last.checklist_streak_days).toBe(9);    // 보존
    expect(last.unlocked_badge_slugs).toEqual(['first_budget', 'streak_7', 'coedit_duo_caller']); // 보존(빈배열이면 클로버)
  });

  it('R6-A2 appendUnlockedBadgeSlugs 가 로드 전 호출돼도 기존 배지 합집합·점수 보존', async () => {
    installProfilesDbColdCache(RICH);
    const { result } = renderHook(() => useGamificationState(), { wrapper });
    await act(async () => {
      result.current.appendUnlockedBadgeSlugs(['coedit_in_sync']);
      await new Promise((r) => setTimeout(r, 120));
    });
    const last = writes[writes.length - 1];
    expect(last).toBeTruthy();
    expect(new Set(last.unlocked_badge_slugs as string[])).toEqual(
      new Set(['first_budget', 'streak_7', 'coedit_duo_caller', 'coedit_in_sync']),
    );
    expect(last.total_points).toBe(250);       // 점수 보존(0이면 클로버)
    expect(last.login_streak_days).toBe(14);   // 스트릭 보존
  });
});

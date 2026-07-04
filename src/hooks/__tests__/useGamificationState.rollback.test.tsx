// [CL-VULN-R10-20260704 | 핵심] incrementMutation 실패 롤백 회귀가드
//
// 버그: incrementMutation.mutationFn 이 line 147 에서 qc.setQueryData(next) 로 낙관적 캐시를
//   '선기록'한 뒤 DB update 를 호출한다. update 가 실패(throw)하면 형제 mutation(line 78-119)의
//   onMutate 스냅샷 + onError 롤백이 이 mutation 엔 없어(onSettled invalidate 만) — 인플레된
//   포인트/레벨이 재조회(invalidate refetch)까지 캐시에 잔존한다. 오프라인이면 refetch 도 실패해
//   인플레 값이 '영구' 노출된다.
// 근본수정: incrementMutation 에 형제와 동일한 onMutate 스냅샷 + onError 롤백을 추가.
//   이 테스트는 profiles.update 가 error 를 반환하도록 mock 한 뒤 increment 실패 후 캐시가
//   시드값(100)으로 복원됨을 단언한다(150 인플레 잔존이면 RED).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from '@/test/test-utils';
import { supabase } from '@/integrations/supabase/client';
import { useGamificationState } from '@/hooks/useGamificationState';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));

// profiles DB 시뮬레이터(오프라인 재현): 첫 select(초기 쿼리 로드)만 dbState 반환해 캐시를 시드(=100).
//  이후 모든 network(update + onSettled invalidate 의 refetch select)는 실패한다 →
//  invalidate refetch 가 캐시를 서버 진실로 '복구할 수 없는' 상태를 만든다. 따라서 mutationFn 의
//  선기록(setQueryData(next=150))을 되돌릴 유일한 수단은 onError 롤백뿐 → 롤백 부재 시 150 이 잔존(RED).
let dbState: Record<string, unknown>;

function installProfilesDbUpdateFails(initial: Record<string, unknown>) {
  dbState = { ...initial };
  let selectCalls = 0;
  vi.mocked(supabase.from).mockImplementation(((_table: string) => {
    const q: Record<string, unknown> = {};
    const methods = ['select', 'eq', 'order', 'limit', 'in', 'is', 'gte', 'lte', 'gt', 'lt', 'match', 'neq'];
    for (const m of methods) q[m] = vi.fn(() => q);
    const selectResolver = () => {
      selectCalls += 1;
      // 첫 select = 초기 쿼리 로드(캐시 시드). 이후(invalidate refetch)는 오프라인 → 실패해 서버 복구 차단.
      if (selectCalls === 1) return Promise.resolve({ data: { gamification_state: dbState }, error: null });
      return Promise.resolve({ data: null, error: { message: 'offline' } });
    };
    q.maybeSingle = vi.fn(selectResolver);
    q.single = vi.fn(selectResolver);
    // update 는 항상 실패(오프라인/RLS 거부 모사) → mutationFn 이 throw → onError 롤백이 있어야 캐시 복원.
    q.update = vi.fn(() => q);
    (q as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: null, error: { message: 'network down' } }).then(resolve);
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

describe('useGamificationState increment 실패 롤백 (R10 optimistic-clobber 회귀가드)', () => {
  const SEED = { total_points: 100, level: 1, coedit_nudges_sent: 0, partner_reviews: 0, unlocked_badge_slugs: [] };

  it('R10 increment 중 profiles.update 실패 시 캐시가 시드값(100)으로 롤백(150 인플레 잔존 금지)', async () => {
    installProfilesDbUpdateFails(SEED);
    const { result } = renderHook(() => useGamificationState(), { wrapper });
    await waitFor(() => expect(result.current.state.total_points).toBe(100));

    await act(async () => {
      result.current.increment({ total_points: 50 });
      await new Promise((r) => setTimeout(r, 80)); // mutate 실행 + onError 롤백 대기
    });

    // update 실패 후 onError 롤백으로 캐시가 100 으로 복원돼야 한다.
    // 롤백이 없으면 mutationFn 의 선기록(setQueryData(next=150))이 잔존 → 150 노출(RED).
    await waitFor(() => expect(result.current.state.total_points).toBe(100));
    expect(result.current.state.total_points).not.toBe(150);
    // 레벨도 인플레(150 → level 2)되지 않고 시드 레벨 유지.
    expect(result.current.state.level).toBe(1);
  });

  it('R10b addSlugs increment 실패 시에도 배지 목록이 시드로 롤백(인플레 배지 잔존 금지)', async () => {
    installProfilesDbUpdateFails({ ...SEED, unlocked_badge_slugs: ['first_budget'] });
    const { result } = renderHook(() => useGamificationState(), { wrapper });
    await waitFor(() =>
      expect(result.current.state.unlocked_badge_slugs).toEqual(['first_budget']),
    );

    await act(async () => {
      result.current.appendUnlockedBadgeSlugs(['coedit_in_sync']);
      await new Promise((r) => setTimeout(r, 80));
    });

    await waitFor(() =>
      expect(result.current.state.unlocked_badge_slugs).toEqual(['first_budget']),
    );
    expect(result.current.state.unlocked_badge_slugs).not.toContain('coedit_in_sync');
  });
});

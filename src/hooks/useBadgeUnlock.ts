/**
 * [CL-GAMIFY-INT-20260418-222329] 이벤트 기반 뱃지 unlock 트리거 훅
 * - 사용자 액션(체크리스트 완료/예산 저장/AI 쿼리 등) 이후 호출
 * - rule-engine 실행 + 신규 unlock 되면 DB 기록 + 상태 업데이트 + 모달 트리거
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGamificationState } from '@/hooks/useGamificationState';
import { evaluateBadgeUnlocks } from '@/lib/gamification/rule-engine';
import type {
  BadgeDefinition,
  BadgeEvaluationContext,
} from '@/lib/gamification/types';

/** badge_definitions 전체 로드 (캐시) */
function useBadgeDefinitions() {
  return useQuery({
    queryKey: ['badgeDefinitions'],
    queryFn: async (): Promise<BadgeDefinition[]> => {
      const { data, error } = await supabase
        .from('badge_definitions')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      // unlock_rule은 DB에서 Json으로 저장되나 런타임 구조는 BadgeUnlockRule과 동일
      return (data ?? []) as unknown as BadgeDefinition[];
    },
    staleTime: 5 * 60_000, // 5m — 뱃지 카탈로그는 거의 변경 안 됨
  });
}

/** 최근 unlock 된 뱃지 1개 (모달 노출용) */
export interface PendingUnlock {
  badge: BadgeDefinition;
  points_gained: number;
}

/**
 * 뱃지 unlock 체크 훅
 *
 * 사용:
 *   const { triggerCheck, pendingUnlock, dismissUnlock } = useBadgeUnlock();
 *   // 체크리스트 완료 시:
 *   triggerCheck(ctx); // ctx는 BadgeEvaluationContext
 */
export function useBadgeUnlock() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { data: definitions = [] } = useBadgeDefinitions();
  const { state, update, addPoints } = useGamificationState();
  const qc = useQueryClient();

  const [pendingUnlock, setPendingUnlock] = useState<PendingUnlock | null>(
    null,
  );
  const queueRef = useRef<PendingUnlock[]>([]);
  const runningRef = useRef(false);

  const showNextFromQueue = useCallback(() => {
    if (queueRef.current.length === 0) {
      setPendingUnlock(null);
      return;
    }
    const next = queueRef.current.shift()!;
    setPendingUnlock(next);
  }, []);

  const dismissUnlock = useCallback(() => {
    showNextFromQueue();
  }, [showNextFromQueue]);

  const triggerCheck = useCallback(
    async (ctx: Partial<BadgeEvaluationContext>) => {
      if (!userId || definitions.length === 0) return;
      if (runningRef.current) return; // 중복 실행 방지
      runningRef.current = true;
      try {
        const fullCtx: BadgeEvaluationContext = {
          budgets_count: 0,
          checklist_completed_count: 0,
          snapshot_count: 0,
          budget_savings_pct: 0,
          ai_queries_total: 0,
          login_streak_days: state.login_streak_days,
          checklist_streak_days: state.checklist_streak_days,
          days_before_wedding: null,
          already_unlocked_slugs: state.unlocked_badge_slugs,
          ...ctx,
        };

        const { newly_unlocked, total_points_gained } = evaluateBadgeUnlocks(
          definitions,
          fullCtx,
        );
        if (newly_unlocked.length === 0) return;

        // DB에 한 번에 INSERT
        const inserts = newly_unlocked.map((b) => ({
          user_id: userId,
          badge_id: b.id,
        }));
        const { error } = await supabase
          .from('user_earned_badges')
          .insert(inserts);
        if (error) {
          // UNIQUE 위반은 무시 (이미 다른 세션에서 unlock됨)
          if (!error.message?.includes('duplicate')) {
            console.error('[useBadgeUnlock] insert error:', error);
            return;
          }
        }

        // gamification_state 업데이트
        const newSlugs = newly_unlocked.map((b) => b.slug);
        update({
          unlocked_badge_slugs: [
            ...state.unlocked_badge_slugs,
            ...newSlugs,
          ],
          total_points: state.total_points + total_points_gained,
        });
        // 캐시 무효화
        qc.invalidateQueries({ queryKey: ['userEarnedBadges', userId] });

        // 큐에 추가 → 모달 순차 노출
        const items: PendingUnlock[] = newly_unlocked.map((b) => ({
          badge: b,
          points_gained: b.points_reward,
        }));
        queueRef.current.push(...items);
        if (!pendingUnlock) showNextFromQueue();
      } finally {
        runningRef.current = false;
      }
    },
    [
      userId,
      definitions,
      state,
      update,
      qc,
      pendingUnlock,
      showNextFromQueue,
    ],
  );

  return {
    triggerCheck,
    pendingUnlock,
    dismissUnlock,
    definitions,
    unusedAddPoints: addPoints, // 외부에서 addPoints가 필요하면 재노출
  };
}

/** 사용자가 획득한 뱃지 목록 조회 */
export function useUserEarnedBadges() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: ['userEarnedBadges', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_earned_badges')
        .select('badge_id, earned_at, badge_definitions(*)')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

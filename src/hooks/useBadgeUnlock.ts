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
import { evaluateBadgeUnlocks, selectAwardableBadges } from '@/lib/gamification/rule-engine';
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
  // [CL-VULN-V3-GAMIFY-RACE-20260624] 배지 보상도 절대값 update 대신 increment(점수)+appendUnlockedBadgeSlugs(합집합)
  //  로 전환 → BudgetFlow 보상(increment)과 동시 발생해도 total_points lost-update 없음.
  const { state, increment, appendUnlockedBadgeSlugs, addPoints } = useGamificationState();
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
          // [CL-GAMIFY-COEDIT-20260623-230113] 공동편집 카운터는 state 에서 기본 주입 → Profile catch-up 평가가 자동 반영
          coedit_nudges_sent: state.coedit_nudges_sent,
          partner_reviews: state.partner_reviews,
          already_unlocked_slugs: state.unlocked_badge_slugs,
          ...ctx,
        };

        const { newly_unlocked } = evaluateBadgeUnlocks(definitions, fullCtx);
        if (newly_unlocked.length === 0) return;

        // [CL-AUDIT-BADGE-IDEMPOTENT-20260626] DB에 멱등 삽입: ON CONFLICT DO NOTHING(ignoreDuplicates) +
        //  .select() 로 '실제로 삽입된 행'만 회수 → 이미 획득(중복) 배지는 반환되지 않는다.
        //  과거: insert 가 duplicate 면 fall-through 해 total_points 를 재지급(영구 인플레이션) + 배치 원자롤백 시
        //  미기록 배지에도 보상하던 버그. 이제 '실제 삽입된 badge_id' 에만 점수/슬러그/모달을 부여(selectAwardableBadges).
        const inserts = newly_unlocked.map((b) => ({ user_id: userId, badge_id: b.id }));
        const { data: insertedRows, error } = await supabase
          .from('user_earned_badges')
          .upsert(inserts, { onConflict: 'user_id,badge_id', ignoreDuplicates: true })
          .select('badge_id');
        if (error) {
          console.error('[useBadgeUnlock] upsert error:', error);
          return;
        }

        const insertedIds = new Set(
          ((insertedRows ?? []) as { badge_id: string }[]).map((r) => r.badge_id),
        );
        const { badges: awardable, total_points_gained: awardedPoints, slugs: awardedSlugs } =
          selectAwardableBadges(newly_unlocked, insertedIds);
        if (awardable.length === 0) return; // 전부 이미 획득 → 보상·모달 스킵(멱등)

        // gamification_state 업데이트 — 점수는 증분(lost-update 방지), 슬러그는 합집합 병합(멱등)
        if (awardedPoints > 0) increment({ total_points: awardedPoints });
        appendUnlockedBadgeSlugs(awardedSlugs);
        // 캐시 무효화
        qc.invalidateQueries({ queryKey: ['userEarnedBadges', userId] });

        // 큐에 추가 → 모달 순차 노출 (실제 신규 획득 배지만)
        const items: PendingUnlock[] = awardable.map((b) => ({
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
      increment,
      appendUnlockedBadgeSlugs,
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

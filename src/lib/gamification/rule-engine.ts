/**
 * [CL-GAMIFY-INT-20260418-222329] 뱃지 unlock 판정 엔진 (순수 함수)
 * - 이벤트 발생 시점에 전체 context로 모든 뱃지 조건 평가
 * - 이미 획득한 뱃지는 스킵 (중복 unlock 방지)
 * - 다수 뱃지 동시 unlock 시 points_reward 누적
 */

import type {
  BadgeDefinition,
  BadgeEvaluationContext,
  BadgeEvaluationResult,
  BadgeUnlockRule,
} from './types';

/**
 * 단일 뱃지 조건 평가 — 순수 함수
 * @returns true = unlock 조건 충족, false = 미충족
 */
export function evaluateBadgeRule(
  rule: BadgeUnlockRule,
  ctx: BadgeEvaluationContext,
): boolean {
  switch (rule.type) {
    case 'first_budget':
      return ctx.budgets_count >= 1;
    case 'first_checklist_completed':
      return ctx.checklist_completed_count >= 1;
    case 'first_snapshot':
      return ctx.snapshot_count >= 1;
    case 'checklist_total_done':
      return ctx.checklist_completed_count >= rule.threshold;
    case 'budget_savings_pct':
      return ctx.budget_savings_pct >= rule.min_savings_pct;
    case 'ai_queries_total':
      return ctx.ai_queries_total >= rule.threshold;
    case 'login_streak_days':
      return ctx.login_streak_days >= rule.threshold;
    case 'checklist_streak_days':
      return ctx.checklist_streak_days >= rule.threshold;
    case 'days_before_wedding_action':
      // D-X 이내 액션: wedding_date가 있고 남은 일수가 max_days_before 이하
      return (
        ctx.days_before_wedding !== null &&
        ctx.days_before_wedding >= 0 &&
        ctx.days_before_wedding <= rule.max_days_before
      );
    default: {
      // 컴파일 타임에 모든 type을 커버하는지 검증
      const _exhaustive: never = rule;
      return _exhaustive;
    }
  }
}

/**
 * 모든 뱃지 정의를 context로 평가 → 새로 unlock 될 뱃지만 반환
 * 이미 획득한 뱃지(ctx.already_unlocked_slugs)는 제외
 */
export function evaluateBadgeUnlocks(
  definitions: ReadonlyArray<BadgeDefinition>,
  ctx: BadgeEvaluationContext,
): BadgeEvaluationResult {
  const alreadySet = new Set(ctx.already_unlocked_slugs);
  const newly_unlocked: BadgeDefinition[] = [];
  let total_points_gained = 0;

  for (const def of definitions) {
    if (!def.is_active) continue;
    if (alreadySet.has(def.slug)) continue;
    if (evaluateBadgeRule(def.unlock_rule, ctx)) {
      newly_unlocked.push(def);
      total_points_gained += def.points_reward;
    }
  }

  // display_order로 정렬하여 항상 일관된 순서로 모달 표시
  newly_unlocked.sort((a, b) => a.display_order - b.display_order);
  return { newly_unlocked, total_points_gained };
}

/** BadgeEvaluationContext 기본값 (모든 필드 안전한 0/null) */
export function emptyBadgeEvaluationContext(): BadgeEvaluationContext {
  return {
    budgets_count: 0,
    checklist_completed_count: 0,
    snapshot_count: 0,
    budget_savings_pct: 0,
    ai_queries_total: 0,
    login_streak_days: 0,
    checklist_streak_days: 0,
    days_before_wedding: null,
    already_unlocked_slugs: [],
  };
}

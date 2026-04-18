// [CL-GAMIFY-QA50-20260418-224158] rule-engine edge cases (MECE 10)
import { describe, it, expect } from 'vitest';
import {
  evaluateBadgeRule,
  evaluateBadgeUnlocks,
  emptyBadgeEvaluationContext,
} from '../rule-engine';
import type { BadgeDefinition, BadgeEvaluationContext } from '../types';

function mkBadge(slug: string, rule: BadgeDefinition['unlock_rule'], over: Partial<BadgeDefinition> = {}): BadgeDefinition {
  return {
    id: `id-${slug}`,
    slug,
    name_ko: slug,
    description: `d-${slug}`,
    icon_emoji: '🎖️',
    category: 'starter',
    rarity: 'common',
    points_reward: 10,
    unlock_rule: rule,
    display_order: 0,
    is_active: true,
    ...over,
  };
}

describe('rule-engine — edge cases (MECE batch)', () => {
  it('E1: threshold 0인 checklist_total_done은 0개 완료도 true', () => {
    const rule = { type: 'checklist_total_done' as const, threshold: 0 };
    expect(evaluateBadgeRule(rule, emptyBadgeEvaluationContext())).toBe(true);
  });

  it('E2: 음수 budget_savings_pct는 양수 threshold에 false', () => {
    const rule = { type: 'budget_savings_pct' as const, min_savings_pct: 0 };
    const ctx = { ...emptyBadgeEvaluationContext(), budget_savings_pct: -50 };
    expect(evaluateBadgeRule(rule, ctx)).toBe(false);
  });

  it('E3: MAX_SAFE_INTEGER ai_queries 처리', () => {
    const rule = { type: 'ai_queries_total' as const, threshold: 1 };
    const ctx = { ...emptyBadgeEvaluationContext(), ai_queries_total: Number.MAX_SAFE_INTEGER };
    expect(evaluateBadgeRule(rule, ctx)).toBe(true);
  });

  it('E4: 빈 definitions 배열 → unlock 없음', () => {
    const result = evaluateBadgeUnlocks([], emptyBadgeEvaluationContext());
    expect(result.newly_unlocked).toEqual([]);
    expect(result.total_points_gained).toBe(0);
  });

  it('E5: 모든 뱃지 is_active=false → unlock 없음', () => {
    const defs = [
      mkBadge('a', { type: 'first_budget' }, { is_active: false }),
      mkBadge('b', { type: 'first_budget' }, { is_active: false }),
    ];
    const ctx = { ...emptyBadgeEvaluationContext(), budgets_count: 10 };
    expect(evaluateBadgeUnlocks(defs, ctx).newly_unlocked).toEqual([]);
  });

  it('E6: already_unlocked_slugs에 존재하지 않는 slug 포함 — 영향 없음', () => {
    const defs = [mkBadge('real', { type: 'first_budget' })];
    const ctx = {
      ...emptyBadgeEvaluationContext(),
      budgets_count: 1,
      already_unlocked_slugs: ['non-existent-slug-12345'],
    };
    expect(evaluateBadgeUnlocks(defs, ctx).newly_unlocked.map((b) => b.slug)).toEqual(['real']);
  });

  it('E7: 동일 rule type을 가진 여러 뱃지는 각각 평가됨 (threshold 다름)', () => {
    const defs = [
      mkBadge('check_10', { type: 'checklist_total_done', threshold: 10 }),
      mkBadge('check_25', { type: 'checklist_total_done', threshold: 25 }),
      mkBadge('check_50', { type: 'checklist_total_done', threshold: 50 }),
    ];
    const ctx = { ...emptyBadgeEvaluationContext(), checklist_completed_count: 30 };
    const result = evaluateBadgeUnlocks(defs, ctx);
    expect(result.newly_unlocked.map((b) => b.slug).sort()).toEqual(['check_10', 'check_25']);
  });

  it('E8: 입력 ctx를 mutate하지 않음 (불변성)', () => {
    const ctx: BadgeEvaluationContext = {
      ...emptyBadgeEvaluationContext(),
      budgets_count: 1,
      already_unlocked_slugs: ['starter'],
    };
    const frozen = { ...ctx, already_unlocked_slugs: [...ctx.already_unlocked_slugs] };
    evaluateBadgeUnlocks([mkBadge('s1', { type: 'first_budget' })], ctx);
    expect(ctx).toEqual(frozen);
  });

  it('E9: 동일 입력 반복 호출 시 결정론적 출력', () => {
    const defs = [
      mkBadge('a', { type: 'first_budget' }, { display_order: 2 }),
      mkBadge('b', { type: 'first_checklist_completed' }, { display_order: 1 }),
    ];
    const ctx = { ...emptyBadgeEvaluationContext(), budgets_count: 1, checklist_completed_count: 1 };
    const r1 = evaluateBadgeUnlocks(defs, ctx).newly_unlocked.map((b) => b.slug);
    const r2 = evaluateBadgeUnlocks(defs, ctx).newly_unlocked.map((b) => b.slug);
    const r3 = evaluateBadgeUnlocks(defs, ctx).newly_unlocked.map((b) => b.slug);
    expect(r1).toEqual(r2);
    expect(r2).toEqual(r3);
    // display_order 순: b(1) → a(2)
    expect(r1).toEqual(['b', 'a']);
  });

  it('E10: days_before_wedding_action D-day 당일(0) 허용', () => {
    const rule = { type: 'days_before_wedding_action' as const, max_days_before: 0 };
    expect(evaluateBadgeRule(rule, { ...emptyBadgeEvaluationContext(), days_before_wedding: 0 })).toBe(true);
    expect(evaluateBadgeRule(rule, { ...emptyBadgeEvaluationContext(), days_before_wedding: 1 })).toBe(false);
    expect(evaluateBadgeRule(rule, { ...emptyBadgeEvaluationContext(), days_before_wedding: -1 })).toBe(false);
  });
});

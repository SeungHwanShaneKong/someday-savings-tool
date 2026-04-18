// [CL-GAMIFY-INT-20260418-222329] Badge unlock rule-engine 테스트
import { describe, it, expect } from 'vitest';
import {
  evaluateBadgeRule,
  evaluateBadgeUnlocks,
  emptyBadgeEvaluationContext,
} from '../rule-engine';
import type { BadgeDefinition, BadgeEvaluationContext } from '../types';

function makeBadge(
  slug: string,
  unlock_rule: BadgeDefinition['unlock_rule'],
  overrides: Partial<BadgeDefinition> = {},
): BadgeDefinition {
  return {
    id: `id-${slug}`,
    slug,
    name_ko: slug,
    description: `desc-${slug}`,
    icon_emoji: '🎖️',
    category: 'starter',
    rarity: 'common',
    points_reward: 10,
    unlock_rule,
    display_order: 0,
    is_active: true,
    ...overrides,
  };
}

describe('rule-engine — evaluateBadgeRule', () => {
  const ctx = (overrides: Partial<BadgeEvaluationContext> = {}): BadgeEvaluationContext => ({
    ...emptyBadgeEvaluationContext(),
    ...overrides,
  });

  it('first_budget: budgets_count >= 1', () => {
    expect(evaluateBadgeRule({ type: 'first_budget' }, ctx({ budgets_count: 0 }))).toBe(false);
    expect(evaluateBadgeRule({ type: 'first_budget' }, ctx({ budgets_count: 1 }))).toBe(true);
    expect(evaluateBadgeRule({ type: 'first_budget' }, ctx({ budgets_count: 5 }))).toBe(true);
  });

  it('first_checklist_completed', () => {
    expect(evaluateBadgeRule({ type: 'first_checklist_completed' }, ctx({ checklist_completed_count: 0 }))).toBe(false);
    expect(evaluateBadgeRule({ type: 'first_checklist_completed' }, ctx({ checklist_completed_count: 1 }))).toBe(true);
  });

  it('checklist_total_done: threshold 경계', () => {
    const rule = { type: 'checklist_total_done' as const, threshold: 50 };
    expect(evaluateBadgeRule(rule, ctx({ checklist_completed_count: 49 }))).toBe(false);
    expect(evaluateBadgeRule(rule, ctx({ checklist_completed_count: 50 }))).toBe(true);
    expect(evaluateBadgeRule(rule, ctx({ checklist_completed_count: 100 }))).toBe(true);
  });

  it('budget_savings_pct: 양수 기준', () => {
    const rule = { type: 'budget_savings_pct' as const, min_savings_pct: 20 };
    expect(evaluateBadgeRule(rule, ctx({ budget_savings_pct: 19 }))).toBe(false);
    expect(evaluateBadgeRule(rule, ctx({ budget_savings_pct: 20 }))).toBe(true);
    expect(evaluateBadgeRule(rule, ctx({ budget_savings_pct: 50 }))).toBe(true);
    expect(evaluateBadgeRule(rule, ctx({ budget_savings_pct: -10 }))).toBe(false);
  });

  it('ai_queries_total: 10/50 threshold', () => {
    const r10 = { type: 'ai_queries_total' as const, threshold: 10 };
    expect(evaluateBadgeRule(r10, ctx({ ai_queries_total: 9 }))).toBe(false);
    expect(evaluateBadgeRule(r10, ctx({ ai_queries_total: 10 }))).toBe(true);
  });

  it('login_streak_days: 7일 threshold', () => {
    const r = { type: 'login_streak_days' as const, threshold: 7 };
    expect(evaluateBadgeRule(r, ctx({ login_streak_days: 6 }))).toBe(false);
    expect(evaluateBadgeRule(r, ctx({ login_streak_days: 7 }))).toBe(true);
  });

  it('checklist_streak_days: 14일 threshold', () => {
    const r = { type: 'checklist_streak_days' as const, threshold: 14 };
    expect(evaluateBadgeRule(r, ctx({ checklist_streak_days: 13 }))).toBe(false);
    expect(evaluateBadgeRule(r, ctx({ checklist_streak_days: 14 }))).toBe(true);
  });

  it('days_before_wedding_action: D-7 이내', () => {
    const r = { type: 'days_before_wedding_action' as const, max_days_before: 7 };
    expect(evaluateBadgeRule(r, ctx({ days_before_wedding: null }))).toBe(false);
    expect(evaluateBadgeRule(r, ctx({ days_before_wedding: 8 }))).toBe(false);
    expect(evaluateBadgeRule(r, ctx({ days_before_wedding: 7 }))).toBe(true);
    expect(evaluateBadgeRule(r, ctx({ days_before_wedding: 0 }))).toBe(true);
    expect(evaluateBadgeRule(r, ctx({ days_before_wedding: -1 }))).toBe(false); // 결혼식 지났음
  });
});

describe('rule-engine — evaluateBadgeUnlocks', () => {
  const defs: BadgeDefinition[] = [
    makeBadge('starter_budget', { type: 'first_budget' }, { points_reward: 10, display_order: 1 }),
    makeBadge('starter_check', { type: 'first_checklist_completed' }, { points_reward: 10, display_order: 2 }),
    makeBadge('planner_50', { type: 'checklist_total_done', threshold: 50 }, { points_reward: 100, display_order: 3 }),
    makeBadge('legendary_d7', { type: 'days_before_wedding_action', max_days_before: 7 }, { points_reward: 500, rarity: 'legendary', display_order: 4 }),
  ];

  it('빈 context → unlock 없음', () => {
    const ctx = emptyBadgeEvaluationContext();
    const result = evaluateBadgeUnlocks(defs, ctx);
    expect(result.newly_unlocked).toEqual([]);
    expect(result.total_points_gained).toBe(0);
  });

  it('첫 예산 + 첫 체크 동시 unlock', () => {
    const ctx: BadgeEvaluationContext = {
      ...emptyBadgeEvaluationContext(),
      budgets_count: 1,
      checklist_completed_count: 1,
    };
    const result = evaluateBadgeUnlocks(defs, ctx);
    expect(result.newly_unlocked.map((b) => b.slug)).toEqual([
      'starter_budget',
      'starter_check',
    ]);
    expect(result.total_points_gained).toBe(20);
  });

  it('already_unlocked 뱃지는 제외', () => {
    const ctx: BadgeEvaluationContext = {
      ...emptyBadgeEvaluationContext(),
      budgets_count: 1,
      already_unlocked_slugs: ['starter_budget'],
    };
    const result = evaluateBadgeUnlocks(defs, ctx);
    expect(result.newly_unlocked).toEqual([]);
    expect(result.total_points_gained).toBe(0);
  });

  it('50 체크리스트 완료 → planner_50 + starter_check unlock', () => {
    const ctx: BadgeEvaluationContext = {
      ...emptyBadgeEvaluationContext(),
      checklist_completed_count: 50,
    };
    const result = evaluateBadgeUnlocks(defs, ctx);
    expect(result.newly_unlocked.map((b) => b.slug).sort()).toEqual(
      ['planner_50', 'starter_check'].sort(),
    );
    expect(result.total_points_gained).toBe(110);
  });

  it('D-7 + 예산 + 50체크 동시 → 3개 뱃지 unlock (legendary 포함)', () => {
    const ctx: BadgeEvaluationContext = {
      ...emptyBadgeEvaluationContext(),
      budgets_count: 1,
      checklist_completed_count: 50,
      days_before_wedding: 5,
    };
    const result = evaluateBadgeUnlocks(defs, ctx);
    expect(result.newly_unlocked.length).toBe(4);
    expect(result.total_points_gained).toBe(10 + 10 + 100 + 500);
    // display_order 순으로 정렬됨
    expect(result.newly_unlocked.map((b) => b.display_order)).toEqual([1, 2, 3, 4]);
  });

  it('is_active=false 뱃지는 제외', () => {
    const disabledDefs: BadgeDefinition[] = [
      makeBadge('disabled', { type: 'first_budget' }, { is_active: false }),
    ];
    const ctx: BadgeEvaluationContext = {
      ...emptyBadgeEvaluationContext(),
      budgets_count: 1,
    };
    const result = evaluateBadgeUnlocks(disabledDefs, ctx);
    expect(result.newly_unlocked).toEqual([]);
  });
});

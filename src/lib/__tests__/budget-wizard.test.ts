// [CL-TOP20-P3-WIZARD-20260703-030000]
// 첫 예산 생성 위저드 계산 로직 검증 — 기대값은 컴포넌트 산식을 믿지 않고
// AVERAGE_COSTS 단일소스로부터 독립 재계산한다(골든 검증).
// C1 골든 총액(250·표준·예식+혼수) / C2 스타일 배수(항목 단위 만원 반올림) /
// C3 템플릿별 포함·제외 / C4 식대=하객수 비례·경계 클램프 / C5 0원 제외·결정론·페이로드 shape /
// C6 flatten·sum(카테고리 비활성화 반영).
import { describe, it, expect } from 'vitest';
import { AVERAGE_COSTS } from '@/lib/average-costs';
import { BUDGET_CATEGORIES } from '@/lib/budget-categories';
import {
  computeWizardPlan,
  flattenWizardPlan,
  sumWizardPlan,
  clampGuests,
  isSubCategoryInTemplate,
  getStyleMultiplier,
  MEAL_COST_PER_GUEST,
  WIZARD_GUESTS_MIN,
  WIZARD_GUESTS_MAX,
  WIZARD_DEFAULT_GUESTS,
  WIZARD_TEMPLATE_OPTIONS,
  type WizardCategoryGroup,
  type WizardTemplateId,
} from '@/lib/budget-wizard';

// ── 독립 재계산 헬퍼 ───────────────────────────────────────────────────────────
const roundToManwon = (value: number): number => Math.round(value / 10_000) * 10_000;

const sumCategory = (categoryId: string): number =>
  Object.values(AVERAGE_COSTS[categoryId]).reduce((acc, item) => acc + item.amount, 0);

const MEAL_BASE = AVERAGE_COSTS['main-ceremony']['meal-cost'].amount; // 14,000,000 (200명 기준)

const allEnabled = (groups: readonly WizardCategoryGroup[]): Set<string> =>
  new Set(groups.map((g) => g.categoryId));

const planTotal = (groups: readonly WizardCategoryGroup[]): number =>
  sumWizardPlan(groups, allEnabled(groups));

describe('budget-wizard 계산 로직', () => {
  it('C1 골든: 250명·표준형·예식+혼수 총액 = AVERAGE_COSTS 독립 재계산과 일치', () => {
    const plan = computeWizardPlan({ guests: 250, styleId: 'standard', templateId: 'honsu' });

    // 독립 재계산: (본식-식대) + 250×1인식대 + 스드메 + 준비 + 신혼여행 + 기타 + 예물 + 예단.
    // 0원 항목(웨딩 플래너·가방순이)은 합산에 0 기여 → sumCategory 그대로 사용 가능.
    const expected =
      sumCategory('main-ceremony') -
      MEAL_BASE +
      250 * (MEAL_BASE / 200) +
      sumCategory('sudeme-styling') +
      sumCategory('preparation-promotion') +
      sumCategory('honeymoon') +
      sumCategory('miscellaneous') +
      AVERAGE_COSTS['gifts-houseware']['rings'].amount +
      AVERAGE_COSTS['gifts-houseware']['yedan'].amount;

    expect(planTotal(plan)).toBe(expected);
    // [CL-COST-2026Q2-20260713-231500] 2026 상반기 공표치 반영 골든(구 54,470,000):
    //  본식 21,070,000(대관 350만+식대 250×5.8만+답례 117만+헬퍼 40만+스냅 150만) + 스드메 6,010,000
    //  + 준비 1,270,000 + 신혼여행 7,630,000 + 기타 1,250,000 + 예물·예단 16,180,000 = 53,410,000
    expect(planTotal(plan)).toBe(53_410_000); // 하드 골든(수치 회귀 가드)
    // 항목 수 = 본식5 + 스드메9 + 준비5 + 신혼여행4 + 기타1(0원 2개 제외) + 예물·예단2 = 26
    expect(flattenWizardPlan(plan, allEnabled(plan))).toHaveLength(26);
  });

  it('C2 스타일 배수: 알뜰(0.75)·프리미엄(1.4)은 항목 단위 만원 반올림으로 일치', () => {
    for (const styleId of ['saving', 'premium'] as const) {
      const multiplier = getStyleMultiplier(styleId);
      const plan = computeWizardPlan({ guests: 250, styleId, templateId: 'home' });
      for (const group of plan) {
        for (const s of group.suggestions) {
          const base =
            s.subCategory === 'meal-cost'
              ? 250 * MEAL_COST_PER_GUEST
              : AVERAGE_COSTS[s.category][s.subCategory].amount;
          expect(s.amount).toBe(roundToManwon(base * multiplier));
          expect(s.amount).toBeGreaterThan(0); // 반올림 후에도 0원 제안 없음
        }
      }
    }
  });

  it('C3 템플릿별 포함/제외: 예식만=혼수·예물 없음, +혼수=예물·예단만, +신혼집=가전·가구까지', () => {
    const giftsSubs = (templateId: WizardTemplateId): string[] => {
      const plan = computeWizardPlan({ guests: 250, styleId: 'standard', templateId });
      const gifts = plan.find((g) => g.categoryId === 'gifts-houseware');
      return gifts ? gifts.suggestions.map((s) => s.subCategory).sort() : [];
    };

    expect(giftsSubs('ceremony')).toEqual([]); // 그룹 자체가 생략됨
    expect(giftsSubs('honsu')).toEqual(['rings', 'yedan']);
    expect(giftsSubs('home')).toEqual(['electronics', 'furniture', 'rings', 'yedan']);

    // gifts-houseware 외 카테고리는 모든 템플릿에 동일하게 포함(포함 규칙 단언)
    for (const template of WIZARD_TEMPLATE_OPTIONS) {
      const plan = computeWizardPlan({ guests: 250, styleId: 'standard', templateId: template.id });
      const otherIds = plan.map((g) => g.categoryId).filter((id) => id !== 'gifts-houseware');
      expect(otherIds).toEqual(
        BUDGET_CATEGORIES.map((c) => c.id).filter((id) => id !== 'gifts-houseware'),
      );
      for (const category of BUDGET_CATEGORIES) {
        for (const sub of category.subCategories) {
          if (category.id !== 'gifts-houseware') {
            expect(isSubCategoryInTemplate(template.id, category.id, sub.id)).toBe(true);
          }
        }
      }
    }
  });

  it('C4 식대는 하객수에 비례하고, 그 외 항목은 하객수와 무관하다(경계 50·500 + 클램프)', () => {
    const mealAt = (guests: number): number => {
      const plan = computeWizardPlan({ guests, styleId: 'standard', templateId: 'ceremony' });
      const main = plan.find((g) => g.categoryId === 'main-ceremony')!;
      return main.suggestions.find((s) => s.subCategory === 'meal-cost')!.amount;
    };

    expect(mealAt(WIZARD_GUESTS_MIN)).toBe(roundToManwon(WIZARD_GUESTS_MIN * MEAL_COST_PER_GUEST));
    expect(mealAt(WIZARD_GUESTS_MAX)).toBe(roundToManwon(WIZARD_GUESTS_MAX * MEAL_COST_PER_GUEST));
    // 범위 밖 입력은 경계로 클램프(계산도 동일)
    expect(mealAt(10_000)).toBe(mealAt(WIZARD_GUESTS_MAX));
    expect(mealAt(-5)).toBe(mealAt(WIZARD_GUESTS_MIN));
    expect(clampGuests(Number.NaN)).toBe(WIZARD_DEFAULT_GUESTS);

    // 식대 외 항목은 하객수 변화에 불변
    const at50 = computeWizardPlan({ guests: 50, styleId: 'standard', templateId: 'ceremony' });
    const at500 = computeWizardPlan({ guests: 500, styleId: 'standard', templateId: 'ceremony' });
    const nonMeal = (groups: WizardCategoryGroup[]) =>
      groups.flatMap((g) => g.suggestions).filter((s) => s.subCategory !== 'meal-cost');
    expect(nonMeal(at50)).toEqual(nonMeal(at500));
  });

  it('C5 평균 0원 항목(웨딩 플래너·가방순이)은 제외되고, 결과는 결정론적이며 페이로드 shape 이 정확하다', () => {
    const plan = computeWizardPlan({ guests: 250, styleId: 'standard', templateId: 'home' });
    const subIds = plan.flatMap((g) => g.suggestions.map((s) => s.subCategory));
    expect(subIds).not.toContain('wedding-planner');
    expect(subIds).not.toContain('bag-helper');

    // 결정론: 동일 입력 → 완전 동일 출력
    expect(plan).toEqual(computeWizardPlan({ guests: 250, styleId: 'standard', templateId: 'home' }));

    // onApply 페이로드 = 정확히 {category, subCategory, amount} 3필드(잉여 필드 누수 0)
    const prefills = flattenWizardPlan(plan, allEnabled(plan));
    for (const p of prefills) {
      expect(Object.keys(p).sort()).toEqual(['amount', 'category', 'subCategory']);
      expect(p.amount).toBeGreaterThan(0);
    }
  });

  it('C6 카테고리 비활성화: flatten 에서 제외되고 sum 은 소계만큼 감소한다', () => {
    const plan = computeWizardPlan({ guests: 250, styleId: 'standard', templateId: 'honsu' });
    const gifts = plan.find((g) => g.categoryId === 'gifts-houseware')!;

    const enabled = allEnabled(plan);
    enabled.delete('gifts-houseware');

    const prefills = flattenWizardPlan(plan, enabled);
    expect(prefills.some((p) => p.category === 'gifts-houseware')).toBe(false);
    expect(sumWizardPlan(plan, enabled)).toBe(planTotal(plan) - gifts.subtotal);
    expect(sumWizardPlan(plan, enabled)).toBe(53_410_000 - 16_180_000); // 예물588만+예단1,030만 제외

    // 전부 비활성화 → 0원·0건
    expect(flattenWizardPlan(plan, new Set())).toEqual([]);
    expect(sumWizardPlan(plan, new Set())).toBe(0);
  });
});

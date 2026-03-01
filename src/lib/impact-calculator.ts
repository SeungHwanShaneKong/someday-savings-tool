/**
 * 경제적 파급 효과 계산기 (BRD §7)
 * 웨딩셈 사용자의 예산 최적화 효과를 측정
 * - 사용자당 평균 절감액
 * - 전체 절감 규모
 * - 숨겨진 비용 사전 인지 효과
 */

import { AVERAGE_COSTS, getAverageCost } from './average-costs';
import { HIDDEN_COST_RULES } from './hidden-costs';
import { formatKoreanWon } from './budget-categories';

// ─── 인터페이스 ───

export interface ImpactSummary {
  /** 분석 대상 예산 수 */
  totalBudgets: number;
  /** 하나 이상의 금액이 있는 예산 수 */
  activeBudgets: number;
  /** 평균 절감률 (%) */
  avgSavingsRate: number;
  /** 평균 절감액 (원) */
  avgSavingsAmount: number;
  /** 전체 절감 추정액 (원) */
  totalSavingsEstimate: number;
  /** 평균보다 저렴한 항목 비율 (%) */
  belowAvgPercent: number;
  /** 평균보다 비싼 항목 비율 (%) */
  aboveAvgPercent: number;
  /** 숨겨진 비용 인지 항목 수 (전체 사용자 평균) */
  avgHiddenCostsIdentified: number;
  /** 예비비 추정 총액 (전체 사용자 합계) */
  totalContingencyFund: number;
  /** 카테고리별 절감 분포 */
  categoryBreakdown: CategoryImpact[];
}

export interface CategoryImpact {
  categoryId: string;
  categoryName: string;
  avgUserAmount: number;
  avgReferenceAmount: number;
  diffPercent: number;
  budgetCount: number;
}

export interface BudgetForImpact {
  id: string;
  items: Array<{
    category: string;
    sub_category: string;
    amount: number;
  }>;
}

// ─── 메인 계산 함수 ───

/**
 * 여러 예산을 분석하여 경제적 파급 효과 요약 생성
 */
export function calculateImpact(budgets: BudgetForImpact[]): ImpactSummary {
  const activeBudgets = budgets.filter(
    (b) => b.items.some((i) => i.amount > 0)
  );

  if (activeBudgets.length === 0) {
    return emptyImpact(budgets.length);
  }

  // 1. 예산별 분석
  const perBudgetAnalysis = activeBudgets.map((budget) => analyzeBudget(budget));

  // 2. 카테고리별 집계
  const categoryMap = new Map<
    string,
    { userAmounts: number[]; refAmount: number; catName: string }
  >();

  for (const analysis of perBudgetAnalysis) {
    for (const item of analysis.itemAnalysis) {
      if (!categoryMap.has(item.categoryId)) {
        categoryMap.set(item.categoryId, {
          userAmounts: [],
          refAmount: item.refAmount,
          catName: item.categoryId,
        });
      }
      categoryMap.get(item.categoryId)!.userAmounts.push(item.userAmount);
    }
  }

  const categoryBreakdown: CategoryImpact[] = [];
  for (const [catId, data] of categoryMap) {
    const avgUser =
      data.userAmounts.reduce((a, b) => a + b, 0) / data.userAmounts.length;
    const diff =
      data.refAmount > 0
        ? Math.round(((avgUser - data.refAmount) / data.refAmount) * 100)
        : 0;
    categoryBreakdown.push({
      categoryId: catId,
      categoryName: CATEGORY_NAME_MAP[catId] || catId,
      avgUserAmount: Math.round(avgUser),
      avgReferenceAmount: data.refAmount,
      diffPercent: diff,
      budgetCount: data.userAmounts.length,
    });
  }
  categoryBreakdown.sort((a, b) => a.diffPercent - b.diffPercent);

  // 3. 전체 집계
  const totalSavings = perBudgetAnalysis.reduce((s, a) => s + a.savingsAmount, 0);
  const avgSavings = totalSavings / activeBudgets.length;
  const avgSavingsRate =
    perBudgetAnalysis.reduce((s, a) => s + a.savingsRate, 0) /
    activeBudgets.length;

  let belowAvgCount = 0;
  let aboveAvgCount = 0;
  let totalItemsWithRef = 0;
  for (const a of perBudgetAnalysis) {
    belowAvgCount += a.belowAvgItems;
    aboveAvgCount += a.aboveAvgItems;
    totalItemsWithRef += a.totalItemsWithRef;
  }

  const avgHiddenCosts =
    perBudgetAnalysis.reduce((s, a) => s + a.hiddenCostsIdentified, 0) /
    activeBudgets.length;
  const totalContingency = perBudgetAnalysis.reduce(
    (s, a) => s + a.contingencyFund,
    0
  );

  return {
    totalBudgets: budgets.length,
    activeBudgets: activeBudgets.length,
    avgSavingsRate: Math.round(avgSavingsRate * 10) / 10,
    avgSavingsAmount: Math.round(avgSavings),
    totalSavingsEstimate: totalSavings,
    belowAvgPercent:
      totalItemsWithRef > 0
        ? Math.round((belowAvgCount / totalItemsWithRef) * 1000) / 10
        : 0,
    aboveAvgPercent:
      totalItemsWithRef > 0
        ? Math.round((aboveAvgCount / totalItemsWithRef) * 1000) / 10
        : 0,
    avgHiddenCostsIdentified: Math.round(avgHiddenCosts * 10) / 10,
    totalContingencyFund: totalContingency,
    categoryBreakdown,
  };
}

// ─── 단일 예산 분석 ───

interface BudgetAnalysis {
  savingsAmount: number;
  savingsRate: number;
  belowAvgItems: number;
  aboveAvgItems: number;
  totalItemsWithRef: number;
  hiddenCostsIdentified: number;
  contingencyFund: number;
  itemAnalysis: Array<{
    categoryId: string;
    userAmount: number;
    refAmount: number;
  }>;
}

function analyzeBudget(budget: BudgetForImpact): BudgetAnalysis {
  const filledItems = budget.items.filter((i) => i.amount > 0);
  let savingsAmount = 0;
  let totalRef = 0;
  let belowAvgItems = 0;
  let aboveAvgItems = 0;
  let totalItemsWithRef = 0;
  const itemAnalysis: BudgetAnalysis['itemAnalysis'] = [];

  for (const item of filledItems) {
    const avg = getAverageCost(item.category, item.sub_category);
    if (!avg || avg.amount === 0) continue;

    totalItemsWithRef++;
    const diff = item.amount - avg.amount;

    if (diff < 0) {
      savingsAmount += Math.abs(diff);
      belowAvgItems++;
    } else if (diff > 0) {
      aboveAvgItems++;
    }

    totalRef += avg.amount;

    itemAnalysis.push({
      categoryId: item.category,
      userAmount: item.amount,
      refAmount: avg.amount,
    });
  }

  const savingsRate = totalRef > 0 ? (savingsAmount / totalRef) * 100 : 0;

  // 숨겨진 비용 카운트
  const filledCats: Array<[string, string]> = filledItems.map((i) => [
    i.category,
    i.sub_category,
  ]);
  const triggeredRules = new Set<string>();
  for (const [catId, subId] of filledCats) {
    for (const rule of HIDDEN_COST_RULES) {
      if (
        rule.triggerCategory === catId &&
        rule.triggerSubCategory === subId
      ) {
        triggeredRules.add(rule.id);
      }
    }
  }

  const contingencyFund = Array.from(triggeredRules).reduce((sum, ruleId) => {
    const rule = HIDDEN_COST_RULES.find((r) => r.id === ruleId);
    return sum + (rule?.estimatedCost || 0);
  }, 0);

  return {
    savingsAmount,
    savingsRate,
    belowAvgItems,
    aboveAvgItems,
    totalItemsWithRef,
    hiddenCostsIdentified: triggeredRules.size,
    contingencyFund,
    itemAnalysis,
  };
}

// ─── 헬퍼 ───

function emptyImpact(totalBudgets: number): ImpactSummary {
  return {
    totalBudgets,
    activeBudgets: 0,
    avgSavingsRate: 0,
    avgSavingsAmount: 0,
    totalSavingsEstimate: 0,
    belowAvgPercent: 0,
    aboveAvgPercent: 0,
    avgHiddenCostsIdentified: 0,
    totalContingencyFund: 0,
    categoryBreakdown: [],
  };
}

const CATEGORY_NAME_MAP: Record<string, string> = {
  'main-ceremony': '본식',
  'sudeme-styling': '스드메/스타일링',
  'gifts-houseware': '예물/혼수',
  'preparation-promotion': '준비/홍보',
  'honeymoon': '신혼여행',
  'miscellaneous': '기타',
};

/**
 * 임팩트 요약 문구 생성 (Admin 대시보드용)
 */
export function getImpactHeadline(impact: ImpactSummary): string {
  if (impact.activeBudgets === 0) {
    return '아직 분석할 예산 데이터가 없습니다.';
  }
  if (impact.avgSavingsAmount > 0) {
    return `사용자들은 평균 ${formatKoreanWon(impact.avgSavingsAmount)}를 절감하고 있어요 (${impact.avgSavingsRate}% 절감률)`;
  }
  return `${impact.activeBudgets}개 예산을 분석했지만 아직 유의미한 절감 효과는 없어요.`;
}

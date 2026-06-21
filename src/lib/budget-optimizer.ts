/**
 * 예산 최적화 규칙 엔진 (BRD §1)
 * 평균 대비 비교 + 예비비 산출 + 인사이트 생성
 * API 비용 0원 — 클라이언트 규칙 엔진
 */

import { AVERAGE_COSTS, getAverageCost } from './average-costs';
import {
  formatKoreanWon,
  getCategoryById,
  getSubCategoryById,
} from './budget-categories';
import { calculateTotalHiddenCosts, type HiddenCostRule } from './hidden-costs';

export type InsightType = 'warning' | 'saving' | 'hidden_cost' | 'praise' | 'info';

export interface BudgetInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  emoji: string;
  amount?: number;
  categoryId?: string;
  subCategoryId?: string;
}

interface BudgetItem {
  categoryId: string;
  subCategoryId: string;
  amount: number;
}

/**
 * 전체 예산 분석 후 인사이트 목록 생성
 */
export function generateBudgetInsights(items: BudgetItem[]): BudgetInsight[] {
  const insights: BudgetInsight[] = [];
  const filledItems = items.filter((i) => i.amount > 0);

  if (filledItems.length === 0) return insights;

  // ─── 1. 평균 대비 비교 인사이트 ───
  for (const item of filledItems) {
    const avgData = getAverageCost(item.categoryId, item.subCategoryId);
    if (!avgData || avgData.amount === 0) continue;

    const diff = item.amount - avgData.amount;
    const diffPercent = Math.round((diff / avgData.amount) * 100);
    const subCat = getSubCategoryById(item.categoryId, item.subCategoryId);
    const subName = subCat?.name || item.subCategoryId;

    if (diffPercent > 30) {
      // 평균보다 30% 이상 높음 → 경고
      insights.push({
        id: `high-${item.categoryId}-${item.subCategoryId}`,
        type: 'warning',
        title: `${subName} 비용이 평균보다 높아요`,
        description: `평균(${formatKoreanWon(avgData.amount)})보다 ${formatKoreanWon(Math.abs(diff))} (${Math.abs(diffPercent)}%) 높아요. 다른 업체 비교를 추천드려요.`,
        emoji: '⚠️',
        amount: diff,
        categoryId: item.categoryId,
        subCategoryId: item.subCategoryId,
      });
    } else if (diffPercent < -30) {
      // 평균보다 30% 이상 낮음 → 칭찬
      insights.push({
        id: `good-${item.categoryId}-${item.subCategoryId}`,
        type: 'praise',
        title: `${subName} 좋은 딜을 찾으셨네요!`,
        description: `평균(${formatKoreanWon(avgData.amount)})보다 ${formatKoreanWon(Math.abs(diff))} (${Math.abs(diffPercent)}%) 절약했어요.`,
        emoji: '🎉',
        amount: diff,
        categoryId: item.categoryId,
        subCategoryId: item.subCategoryId,
      });
    }
  }

  // ─── 2. 숨겨진 비용 인사이트 ───
  const filledCats: Array<[string, string]> = filledItems.map((i) => [
    i.categoryId,
    i.subCategoryId,
  ]);
  const hiddenCosts = calculateTotalHiddenCosts(filledCats);

  for (const rule of hiddenCosts.rules) {
    insights.push({
      id: `hidden-${rule.id}`,
      type: 'hidden_cost',
      title: rule.title,
      description: `${rule.description} (약 ${formatKoreanWon(rule.estimatedCost)})`,
      emoji: rule.emoji,
      amount: rule.estimatedCost,
      categoryId: rule.relatedCategory || rule.triggerCategory,
      subCategoryId: rule.relatedSubCategory || rule.triggerSubCategory,
    });
  }

  // ─── 3. 예비비 산출 인사이트 ───
  if (hiddenCosts.total > 0) {
    insights.push({
      id: 'contingency-fund',
      type: 'info',
      title: '예비비를 준비하세요',
      description: `숨겨진 비용을 고려하면 최소 ${formatKoreanWon(hiddenCosts.total)}의 예비비가 필요해요. 전체 예산의 5~10%를 여유분으로 잡는 것을 추천드려요.`,
      emoji: '🛡️',
      amount: hiddenCosts.total,
    });
  }

  // ─── 4. 카테고리별 비중 분석 ───
  const totalBudget = filledItems.reduce((sum, i) => sum + i.amount, 0);
  if (totalBudget > 0) {
    // 식대 비중 체크
    const mealItem = filledItems.find(
      (i) =>
        i.categoryId === 'main-ceremony' && i.subCategoryId === 'meal-cost'
    );
    if (mealItem) {
      const mealPercent = Math.round((mealItem.amount / totalBudget) * 100);
      if (mealPercent > 35) {
        insights.push({
          id: 'meal-ratio-high',
          type: 'warning',
          title: '식대 비중이 너무 높아요',
          description: `식대가 전체 예산의 ${mealPercent}%를 차지하고 있어요. 보통 20~30%가 적정해요. 하객 수를 조정하거나 식대 단가를 검토해보세요.`,
          emoji: '🍽️',
          categoryId: 'main-ceremony',
          subCategoryId: 'meal-cost',
        });
      }
    }

    // 전체 예산 규모 인사이트
    if (totalBudget >= 50000000) {
      const avgTotal = Object.values(AVERAGE_COSTS).reduce(
        (catSum, subs) =>
          catSum +
          Object.values(subs).reduce((subSum, d) => subSum + d.amount, 0),
        0
      );
      const savingPotential = Math.round(totalBudget * 0.1);

      insights.push({
        id: 'total-budget-tip',
        type: 'saving',
        title: '절약 가능 금액 분석',
        description: `현재 총 예산 ${formatKoreanWon(totalBudget)} 기준, 유사 예산 커플들은 업체 비교와 시기 조절로 평균 ${formatKoreanWon(savingPotential)}을 절감했어요.`,
        emoji: '💰',
        amount: savingPotential,
      });
    }
  }

  // Sort: hidden_cost → warning → saving → praise → info
  const ORDER: Record<InsightType, number> = {
    hidden_cost: 0,
    warning: 1,
    saving: 2,
    praise: 3,
    info: 4,
  };
  insights.sort((a, b) => ORDER[a.type] - ORDER[b.type]);

  return insights;
}

// [CL-QUALITY-DETERMINISM-20260621] 입력 결정론적 PRNG(같은 인사이트 집합 → 항상 같은 5개·순서).
// 이전 Math.random 셔플은 편집/ACK 재렌더(items 참조가 커밋당 ~2회 변경)마다 노출 인사이트가 무작위 재배치돼
// 시각 깜빡임 + 낭비 연산을 유발. cyrb53 해시 → mulberry32 시드로 "다양성(예산별로 다름)"은 유지하되 재렌더 안정화.
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * [CL-COEDIT-QA5-20260620 / CL-QUALITY-DETERMINISM-20260621] 표시 인사이트를 최대 max개로 제한.
 * max 이하면 원본 그대로, 초과면 인사이트 id 들로 시드한 결정론적 Fisher-Yates 셔플 후 max개 선택
 * (같은 입력 → 항상 같은 결과: 재렌더 안정 + 예산별 다양성 유지). 불변성·부분집합·중복0 보장.
 */
export function pickRandomInsights(insights: BudgetInsight[], max = 5): BudgetInsight[] {
  if (insights.length <= max) return insights;
  const rand = mulberry32(cyrb53(insights.map((i) => i.id).join('|')));
  const a = [...insights];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, max);
}

/**
 * 특정 항목에 대한 빠른 경고 메시지 (인라인 표시용)
 */
export function getInlineWarning(
  categoryId: string,
  subCategoryId: string,
  amount: number
): string | null {
  if (amount <= 0) return null;

  const avg = getAverageCost(categoryId, subCategoryId);
  if (!avg || avg.amount === 0) return null;

  const diffPercent = Math.round(((amount - avg.amount) / avg.amount) * 100);

  if (diffPercent > 50) {
    return `평균 대비 ${diffPercent}% 높아요`;
  }
  if (diffPercent < -50) {
    return `평균 대비 ${Math.abs(diffPercent)}% 저렴해요 👍`;
  }

  return null;
}

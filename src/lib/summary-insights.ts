// [CL-TOP20-P3-SUMMARY-20260703-030000] Summary 비교 뷰 로컬 인사이트 — 순수 계산(결정론·부작용 0)
// AI 호출 전 즉시 표시할 의사결정 지원 데이터: 총액 차 · 최대 격차 카테고리 top3 · 분담 차이.
// UI/포맷팅은 컴포넌트 책임 — 이 모듈은 구조화된 숫자/라벨만 반환한다.

import { BUDGET_CATEGORIES } from '@/lib/budget-categories';

/** 인사이트 계산에 필요한 최소 항목 형태(ExtendedBudgetItem 이 구조적으로 부합) */
export interface InsightItem {
  category: string;
  amount: number;
  cost_split?: string | null;
}

/** 인사이트 계산 입력 — Summary 가 budgetLabels(중복 이름 해소 라벨)를 붙여 전달 */
export interface InsightBudget {
  id: string;
  label: string;
  items: InsightItem[];
}

export interface BudgetAmountEntry {
  id: string;
  label: string;
  amount: number;
}

export interface TotalGapInsight {
  /** 총액 최저 예산(동률이면 입력 순서상 첫 번째) */
  min: BudgetAmountEntry;
  /** 총액 최고 예산(동률이면 입력 순서상 첫 번째) */
  max: BudgetAmountEntry;
  gap: number;
  /** 모든 예산 총액이 동일 */
  isTie: boolean;
}

export interface CategoryGapInsight {
  categoryId: string;
  categoryName: string;
  icon: string;
  min: BudgetAmountEntry;
  max: BudgetAmountEntry;
  gap: number;
}

export type InsightSplit = 'groom' | 'bride' | 'together';

export const SPLIT_LABELS: Record<InsightSplit, string> = {
  groom: '신랑',
  bride: '신부',
  together: '공동',
};

export interface SplitGapInsight {
  split: InsightSplit;
  splitLabel: string;
  min: BudgetAmountEntry;
  max: BudgetAmountEntry;
  gap: number;
}

export interface ComparisonInsights {
  totalGap: TotalGapInsight;
  /** 격차 큰 순 top3 (gap>0 만, 동률은 카테고리 정의 순서 유지) */
  topCategoryGaps: CategoryGapInsight[];
  /** 분담(신랑/신부/공동)별 격차, 큰 순 (gap>0 만) */
  splitGaps: SplitGapInsight[];
}

const sumBy = (items: InsightItem[], predicate: (item: InsightItem) => boolean): number =>
  items.reduce((sum, item) => (predicate(item) ? sum + item.amount : sum), 0);

/** 값 배열에서 최저/최고 엔트리 추출(동률이면 입력 순서상 첫 번째 — 결정론) */
function pickMinMax(entries: BudgetAmountEntry[]): { min: BudgetAmountEntry; max: BudgetAmountEntry } {
  let min = entries[0];
  let max = entries[0];
  for (const entry of entries) {
    if (entry.amount < min.amount) min = entry;
    if (entry.amount > max.amount) max = entry;
  }
  return { min, max };
}

/**
 * 비교 뷰 로컬 인사이트 계산.
 * - 예산 2개 미만이면 null (비교 불가 가드)
 * - 카테고리 격차는 0원(미입력) 예산도 포함해 계산 — "한 옵션에만 있는 지출"이 실제 의사결정 포인트
 * - 전 예산 0원인 카테고리/분담은 제외
 */
export function computeComparisonInsights(budgets: InsightBudget[]): ComparisonInsights | null {
  if (budgets.length < 2) return null;

  // ── 총액 격차 ──
  const totals: BudgetAmountEntry[] = budgets.map(b => ({
    id: b.id,
    label: b.label,
    amount: sumBy(b.items, () => true),
  }));
  const { min: totalMin, max: totalMax } = pickMinMax(totals);
  const totalGap: TotalGapInsight = {
    min: totalMin,
    max: totalMax,
    gap: totalMax.amount - totalMin.amount,
    isTie: totalMax.amount === totalMin.amount,
  };

  // ── 카테고리별 격차 top3 ──
  const categoryGaps: CategoryGapInsight[] = [];
  for (const category of BUDGET_CATEGORIES) {
    const entries: BudgetAmountEntry[] = budgets.map(b => ({
      id: b.id,
      label: b.label,
      amount: sumBy(b.items, item => item.category === category.id),
    }));
    if (entries.every(e => e.amount === 0)) continue;
    const { min, max } = pickMinMax(entries);
    const gap = max.amount - min.amount;
    if (gap <= 0) continue;
    categoryGaps.push({
      categoryId: category.id,
      categoryName: category.name,
      icon: category.icon,
      min,
      max,
      gap,
    });
  }
  // Array#sort 는 안정 정렬 — 동률 시 카테고리 정의 순서 유지(결정론)
  const topCategoryGaps = [...categoryGaps].sort((a, b) => b.gap - a.gap).slice(0, 3);

  // ── 분담별 격차 (미지정 '-' 제외) ──
  const splitGaps: SplitGapInsight[] = [];
  for (const split of Object.keys(SPLIT_LABELS) as InsightSplit[]) {
    const entries: BudgetAmountEntry[] = budgets.map(b => ({
      id: b.id,
      label: b.label,
      amount: sumBy(b.items, item => item.cost_split === split),
    }));
    if (entries.every(e => e.amount === 0)) continue;
    const { min, max } = pickMinMax(entries);
    const gap = max.amount - min.amount;
    if (gap <= 0) continue;
    splitGaps.push({ split, splitLabel: SPLIT_LABELS[split], min, max, gap });
  }
  splitGaps.sort((a, b) => b.gap - a.gap);

  return { totalGap, topCategoryGaps, splitGaps };
}

// ── AI 응답 sessionStorage 캐시 (예산 id 조합 키 — 순서 무관 안정) ──
// [CL-TOP20-R50-UI-20260703-094000] TTL 도입 — cachedAt 봉투(envelope)로 저장, 10분 초과분은 스테일로 폐기.
// 예산 금액이 바뀐 뒤에도 구 AI 조언이 세션 내내 살아있던 문제 방지. 봉투 없는 레거시 레코드는
// 저장 시각을 알 수 없으므로 스테일로 취급(null) — 파싱/형태 방어는 기존 계약 그대로 유지.

const INSIGHT_CACHE_PREFIX = 'wedsem_summary_ai_insight:';

/** 캐시 유효 시간 — 10분 */
export const INSIGHT_CACHE_TTL_MS = 10 * 60 * 1000;

interface InsightCacheEnvelope {
  cachedAt: number;
  value: unknown;
}

export function buildInsightCacheKey(budgetIds: string[]): string {
  return `${INSIGHT_CACHE_PREFIX}${[...budgetIds].sort().join(',')}`;
}

/** 캐시 읽기 — 파싱 실패/형태 불일치/TTL(10분) 초과 시 null (방어적) */
export function readInsightCache<T extends { tips: unknown[] }>(cacheKey: string): T | null {
  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InsightCacheEnvelope> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    // 봉투 형태·시각 검증 — cachedAt 없는 레거시/변조 레코드는 스테일 취급
    if (typeof parsed.cachedAt !== 'number' || !Number.isFinite(parsed.cachedAt)) return null;
    if (Date.now() - parsed.cachedAt > INSIGHT_CACHE_TTL_MS) return null;
    const value = parsed.value as T | null | undefined;
    if (!value || !Array.isArray(value.tips)) return null;
    return value;
  } catch {
    return null;
  }
}

/** 캐시 쓰기 — cachedAt 봉투로 저장. 실패(용량/프라이빗 모드)는 조용히 무시(기능 비필수) */
export function writeInsightCache(cacheKey: string, value: unknown): void {
  try {
    const envelope: InsightCacheEnvelope = { cachedAt: Date.now(), value };
    sessionStorage.setItem(cacheKey, JSON.stringify(envelope));
  } catch {
    // no-op: 캐시는 최적화일 뿐, 실패해도 기능 저하 없음
  }
}

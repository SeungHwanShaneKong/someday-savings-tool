// [CL-TOP20-P3-SUMMARY-20260703-030000] 비교 인사이트 순수 함수 테스트 — 격차/동률/단일 예산 가드/캐시 키
import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeComparisonInsights,
  buildInsightCacheKey,
  readInsightCache,
  writeInsightCache,
  type InsightBudget,
} from '../summary-insights';

const makeBudget = (
  id: string,
  label: string,
  items: { category: string; amount: number; cost_split?: string | null }[],
): InsightBudget => ({ id, label, items });

describe('computeComparisonInsights — 가드', () => {
  it('예산 0개 → null', () => {
    expect(computeComparisonInsights([])).toBeNull();
  });

  it('단일 예산 → null (비교 불가)', () => {
    const only = makeBudget('b1', '옵션 1', [{ category: 'main-ceremony', amount: 1000 }]);
    expect(computeComparisonInsights([only])).toBeNull();
  });
});

describe('computeComparisonInsights — 총액 격차', () => {
  it('최저/최고 예산과 gap 을 정확히 계산한다', () => {
    const budgets = [
      makeBudget('b1', '알뜰형', [
        { category: 'main-ceremony', amount: 10_000_000 },
        { category: 'honeymoon', amount: 5_000_000 },
      ]),
      makeBudget('b2', '프리미엄형', [
        { category: 'main-ceremony', amount: 13_000_000 },
        { category: 'honeymoon', amount: 4_000_000 },
      ]),
    ];
    const insights = computeComparisonInsights(budgets)!;
    expect(insights.totalGap.min).toEqual({ id: 'b1', label: '알뜰형', amount: 15_000_000 });
    expect(insights.totalGap.max).toEqual({ id: 'b2', label: '프리미엄형', amount: 17_000_000 });
    expect(insights.totalGap.gap).toBe(2_000_000);
    expect(insights.totalGap.isTie).toBe(false);
  });

  it('동률(총액 동일) → gap 0 + isTie=true, 항목 배치가 달라도 판정된다', () => {
    const budgets = [
      makeBudget('b1', 'A', [
        { category: 'main-ceremony', amount: 3_000_000 },
        { category: 'honeymoon', amount: 2_000_000 },
      ]),
      makeBudget('b2', 'B', [
        { category: 'main-ceremony', amount: 2_000_000 },
        { category: 'honeymoon', amount: 3_000_000 },
      ]),
    ];
    const insights = computeComparisonInsights(budgets)!;
    expect(insights.totalGap.gap).toBe(0);
    expect(insights.totalGap.isTie).toBe(true);
    // 동률이어도 카테고리 격차는 계산된다 (각 100만원 차)
    expect(insights.topCategoryGaps).toHaveLength(2);
  });
});

describe('computeComparisonInsights — 카테고리 격차 top3', () => {
  it('격차 큰 순으로 최대 3개만, gap=0 카테고리는 제외한다', () => {
    const budgets = [
      makeBudget('b1', 'A', [
        { category: 'main-ceremony', amount: 1_000_000 }, // gap 4_000_000
        { category: 'sudeme-styling', amount: 2_000_000 }, // gap 3_000_000
        { category: 'gifts-houseware', amount: 1_000_000 }, // gap 2_000_000
        { category: 'honeymoon', amount: 1_000_000 }, // gap 1_000_000 → top3 밖
        { category: 'miscellaneous', amount: 500_000 }, // gap 0 → 제외
      ]),
      makeBudget('b2', 'B', [
        { category: 'main-ceremony', amount: 5_000_000 },
        { category: 'sudeme-styling', amount: 5_000_000 },
        { category: 'gifts-houseware', amount: 3_000_000 },
        { category: 'honeymoon', amount: 2_000_000 },
        { category: 'miscellaneous', amount: 500_000 },
      ]),
    ];
    const insights = computeComparisonInsights(budgets)!;
    expect(insights.topCategoryGaps.map(g => g.categoryId)).toEqual([
      'main-ceremony',
      'sudeme-styling',
      'gifts-houseware',
    ]);
    expect(insights.topCategoryGaps[0].gap).toBe(4_000_000);
    expect(insights.topCategoryGaps[0].categoryName).toBe('본식 운영');
    expect(insights.topCategoryGaps[0].min.label).toBe('A');
    expect(insights.topCategoryGaps[0].max.label).toBe('B');
  });

  it('한 예산에만 있는 지출(상대 0원)도 격차로 포착한다', () => {
    const budgets = [
      makeBudget('b1', 'A', [{ category: 'main-ceremony', amount: 1_000_000 }]),
      makeBudget('b2', 'B', [
        { category: 'main-ceremony', amount: 1_000_000 },
        { category: 'honeymoon', amount: 5_000_000 },
      ]),
    ];
    const insights = computeComparisonInsights(budgets)!;
    expect(insights.topCategoryGaps).toHaveLength(1);
    expect(insights.topCategoryGaps[0].categoryId).toBe('honeymoon');
    expect(insights.topCategoryGaps[0].gap).toBe(5_000_000);
    expect(insights.topCategoryGaps[0].min).toEqual({ id: 'b1', label: 'A', amount: 0 });
  });

  it('빈 항목 예산끼리 → 총액 동률 + 카테고리/분담 격차 없음', () => {
    const insights = computeComparisonInsights([
      makeBudget('b1', 'A', []),
      makeBudget('b2', 'B', []),
    ])!;
    expect(insights.totalGap.isTie).toBe(true);
    expect(insights.topCategoryGaps).toEqual([]);
    expect(insights.splitGaps).toEqual([]);
  });
});

describe('computeComparisonInsights — 분담 격차', () => {
  it('신랑/신부/공동만 계산하고 미지정(-)은 제외, 격차 큰 순 정렬', () => {
    const budgets = [
      makeBudget('b1', 'A', [
        { category: 'main-ceremony', amount: 1_000_000, cost_split: 'groom' },
        { category: 'main-ceremony', amount: 2_000_000, cost_split: 'bride' },
        { category: 'honeymoon', amount: 9_000_000, cost_split: '-' },
      ]),
      makeBudget('b2', 'B', [
        { category: 'main-ceremony', amount: 4_000_000, cost_split: 'groom' }, // groom gap 3M
        { category: 'main-ceremony', amount: 3_000_000, cost_split: 'bride' }, // bride gap 1M
        { category: 'honeymoon', amount: 1_000_000, cost_split: '-' },
      ]),
    ];
    const insights = computeComparisonInsights(budgets)!;
    expect(insights.splitGaps.map(g => g.split)).toEqual(['groom', 'bride']);
    expect(insights.splitGaps[0]).toMatchObject({
      splitLabel: '신랑',
      gap: 3_000_000,
      min: { id: 'b1', amount: 1_000_000 },
      max: { id: 'b2', amount: 4_000_000 },
    });
  });
});

describe('AI 응답 sessionStorage 캐시', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('캐시 키는 예산 id 순서와 무관하게 동일하다', () => {
    expect(buildInsightCacheKey(['b2', 'b1'])).toBe(buildInsightCacheKey(['b1', 'b2']));
    expect(buildInsightCacheKey(['b1'])).not.toBe(buildInsightCacheKey(['b1', 'b2']));
  });

  it('write → read 라운드트립이 동일 값을 돌려준다', () => {
    const key = buildInsightCacheKey(['b1', 'b2']);
    const value = { tips: [{ title: 't', description: 'd', example: 'e', savings_estimate: 's' }], confidence: 0.8 };
    writeInsightCache(key, value);
    expect(readInsightCache(key)).toEqual(value);
  });

  it('손상된 JSON·형태 불일치는 null 로 방어한다', () => {
    const key = buildInsightCacheKey(['b1']);
    sessionStorage.setItem(key, '{not-json');
    expect(readInsightCache(key)).toBeNull();
    sessionStorage.setItem(key, JSON.stringify({ notTips: true }));
    expect(readInsightCache(key)).toBeNull();
    expect(readInsightCache(buildInsightCacheKey(['missing']))).toBeNull();
  });
});

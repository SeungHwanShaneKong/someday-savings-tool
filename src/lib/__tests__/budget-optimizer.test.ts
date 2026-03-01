import { describe, it, expect } from 'vitest';
import {
  generateBudgetInsights,
  getInlineWarning,
  type BudgetInsight,
} from '../budget-optimizer';

describe('budget-optimizer', () => {
  describe('generateBudgetInsights', () => {
    it('returns empty array when no items have amount', () => {
      const insights = generateBudgetInsights([
        { categoryId: 'main-ceremony', subCategoryId: 'venue-fee', amount: 0 },
      ]);
      expect(insights).toEqual([]);
    });

    it('returns empty array for empty input', () => {
      const insights = generateBudgetInsights([]);
      expect(insights).toEqual([]);
    });

    it('generates warning for items above average by >30%', () => {
      // venue-fee average is 5,000,000
      const insights = generateBudgetInsights([
        { categoryId: 'main-ceremony', subCategoryId: 'venue-fee', amount: 8000000 },
      ]);

      const warningInsight = insights.find((i) => i.type === 'warning' && i.id.startsWith('high-'));
      expect(warningInsight).toBeDefined();
      expect(warningInsight!.title).toContain('평균보다 높아요');
    });

    it('generates praise for items below average by >30%', () => {
      // venue-fee average is 5,000,000; 3,000,000 is 40% below
      const insights = generateBudgetInsights([
        { categoryId: 'main-ceremony', subCategoryId: 'venue-fee', amount: 3000000 },
      ]);

      const praiseInsight = insights.find((i) => i.type === 'praise');
      expect(praiseInsight).toBeDefined();
      expect(praiseInsight!.title).toContain('좋은 딜');
    });

    it('generates hidden cost insights for dress-main', () => {
      // dress-main triggers 'dress-fitting-fee'
      const insights = generateBudgetInsights([
        { categoryId: 'sudeme-styling', subCategoryId: 'dress-main', amount: 1500000 },
      ]);

      const hiddenCost = insights.find((i) => i.type === 'hidden_cost');
      expect(hiddenCost).toBeDefined();
      expect(hiddenCost!.title).toContain('피팅비');
    });

    it('generates contingency fund insight when hidden costs found', () => {
      const insights = generateBudgetInsights([
        { categoryId: 'sudeme-styling', subCategoryId: 'dress-main', amount: 1500000 },
        { categoryId: 'sudeme-styling', subCategoryId: 'studio', amount: 1500000 },
      ]);

      const contingency = insights.find((i) => i.id === 'contingency-fund');
      expect(contingency).toBeDefined();
      expect(contingency!.type).toBe('info');
      expect(contingency!.amount).toBeGreaterThan(0);
    });

    it('generates meal ratio warning when meal > 35% of total', () => {
      const insights = generateBudgetInsights([
        { categoryId: 'main-ceremony', subCategoryId: 'meal-cost', amount: 20000000 },
        { categoryId: 'main-ceremony', subCategoryId: 'venue-fee', amount: 5000000 },
      ]);

      const mealWarning = insights.find((i) => i.id === 'meal-ratio-high');
      expect(mealWarning).toBeDefined();
      expect(mealWarning!.description).toContain('식대가 전체 예산의');
    });

    it('generates total budget saving tip when >= 50M won', () => {
      const insights = generateBudgetInsights([
        { categoryId: 'main-ceremony', subCategoryId: 'meal-cost', amount: 30000000 },
        { categoryId: 'gifts-houseware', subCategoryId: 'electronics', amount: 20000000 },
      ]);

      const savingTip = insights.find((i) => i.id === 'total-budget-tip');
      expect(savingTip).toBeDefined();
      expect(savingTip!.type).toBe('saving');
    });

    it('sorts insights: hidden_cost > warning > saving > praise > info', () => {
      const insights = generateBudgetInsights([
        { categoryId: 'main-ceremony', subCategoryId: 'meal-cost', amount: 30000000 },
        { categoryId: 'main-ceremony', subCategoryId: 'venue-fee', amount: 3000000 },
        { categoryId: 'sudeme-styling', subCategoryId: 'dress-main', amount: 1500000 },
        { categoryId: 'gifts-houseware', subCategoryId: 'electronics', amount: 20000000 },
      ]);

      if (insights.length >= 2) {
        const ORDER: Record<string, number> = {
          hidden_cost: 0, warning: 1, saving: 2, praise: 3, info: 4,
        };
        for (let i = 1; i < insights.length; i++) {
          expect(ORDER[insights[i].type]).toBeGreaterThanOrEqual(ORDER[insights[i - 1].type]);
        }
      }
    });
  });

  describe('getInlineWarning', () => {
    it('returns null for zero amount', () => {
      expect(getInlineWarning('main-ceremony', 'venue-fee', 0)).toBeNull();
    });

    it('returns null for items without average data', () => {
      expect(getInlineWarning('nonexistent', 'nonexistent', 5000000)).toBeNull();
    });

    it('returns warning for >50% above average', () => {
      // venue-fee avg: 5,000,000. 8,000,000 = 60% above
      const warning = getInlineWarning('main-ceremony', 'venue-fee', 8000000);
      expect(warning).toContain('평균 대비');
      expect(warning).toContain('높아요');
    });

    it('returns praise for >50% below average', () => {
      // venue-fee avg: 5,000,000. 2,000,000 = 60% below
      const praise = getInlineWarning('main-ceremony', 'venue-fee', 2000000);
      expect(praise).toContain('저렴해요');
    });

    it('returns null when within normal range', () => {
      // venue-fee avg: 5,000,000. 4,500,000 = only 10% below
      expect(getInlineWarning('main-ceremony', 'venue-fee', 4500000)).toBeNull();
    });
  });
});

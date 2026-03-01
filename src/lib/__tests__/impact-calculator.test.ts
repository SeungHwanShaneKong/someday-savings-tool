import { describe, it, expect } from 'vitest';
import {
  calculateImpact,
  getImpactHeadline,
  type BudgetForImpact,
} from '../impact-calculator';

describe('impact-calculator', () => {
  describe('calculateImpact', () => {
    it('returns empty impact for no budgets', () => {
      const result = calculateImpact([]);
      expect(result.totalBudgets).toBe(0);
      expect(result.activeBudgets).toBe(0);
      expect(result.avgSavingsRate).toBe(0);
    });

    it('returns empty impact for budgets with zero amounts', () => {
      const budgets: BudgetForImpact[] = [
        {
          id: 'b1',
          items: [
            { category: 'main-ceremony', sub_category: 'venue-fee', amount: 0 },
          ],
        },
      ];
      const result = calculateImpact(budgets);
      expect(result.totalBudgets).toBe(1);
      expect(result.activeBudgets).toBe(0);
    });

    it('calculates savings for items below average', () => {
      const budgets: BudgetForImpact[] = [
        {
          id: 'b1',
          items: [
            // venue-fee avg: 5,000,000. User: 3,000,000 → saves 2M
            { category: 'main-ceremony', sub_category: 'venue-fee', amount: 3000000 },
          ],
        },
      ];
      const result = calculateImpact(budgets);
      expect(result.activeBudgets).toBe(1);
      expect(result.avgSavingsAmount).toBe(2000000);
      expect(result.avgSavingsRate).toBeGreaterThan(0);
      expect(result.belowAvgPercent).toBe(100);
    });

    it('detects hidden costs', () => {
      const budgets: BudgetForImpact[] = [
        {
          id: 'b1',
          items: [
            { category: 'sudeme-styling', sub_category: 'dress-main', amount: 1500000 },
            { category: 'sudeme-styling', sub_category: 'studio', amount: 1500000 },
          ],
        },
      ];
      const result = calculateImpact(budgets);
      expect(result.avgHiddenCostsIdentified).toBeGreaterThan(0);
      expect(result.totalContingencyFund).toBeGreaterThan(0);
    });

    it('handles multiple budgets correctly', () => {
      const budgets: BudgetForImpact[] = [
        {
          id: 'b1',
          items: [
            { category: 'main-ceremony', sub_category: 'venue-fee', amount: 3000000 },
          ],
        },
        {
          id: 'b2',
          items: [
            { category: 'main-ceremony', sub_category: 'venue-fee', amount: 7000000 },
          ],
        },
      ];
      const result = calculateImpact(budgets);
      expect(result.totalBudgets).toBe(2);
      expect(result.activeBudgets).toBe(2);
      // b1 saves 2M, b2 saves 0
      expect(result.totalSavingsEstimate).toBe(2000000);
      expect(result.avgSavingsAmount).toBe(1000000);
    });

    it('generates category breakdown', () => {
      const budgets: BudgetForImpact[] = [
        {
          id: 'b1',
          items: [
            { category: 'main-ceremony', sub_category: 'venue-fee', amount: 4000000 },
            { category: 'sudeme-styling', sub_category: 'dress-main', amount: 1200000 },
          ],
        },
      ];
      const result = calculateImpact(budgets);
      expect(result.categoryBreakdown.length).toBeGreaterThan(0);
      const mainCeremony = result.categoryBreakdown.find(
        (c) => c.categoryId === 'main-ceremony'
      );
      expect(mainCeremony).toBeDefined();
      expect(mainCeremony!.avgUserAmount).toBe(4000000);
    });

    it('handles items without average cost data', () => {
      const budgets: BudgetForImpact[] = [
        {
          id: 'b1',
          items: [
            { category: 'nonexistent', sub_category: 'nonexistent', amount: 1000000 },
          ],
        },
      ];
      const result = calculateImpact(budgets);
      expect(result.activeBudgets).toBe(1);
      // No average data → no savings calculated
      expect(result.avgSavingsAmount).toBe(0);
    });
  });

  describe('getImpactHeadline', () => {
    it('returns appropriate message when no budgets', () => {
      const impact = calculateImpact([]);
      const headline = getImpactHeadline(impact);
      expect(headline).toContain('아직');
    });

    it('returns savings message when savings exist', () => {
      const budgets: BudgetForImpact[] = [
        {
          id: 'b1',
          items: [
            { category: 'main-ceremony', sub_category: 'venue-fee', amount: 3000000 },
          ],
        },
      ];
      const impact = calculateImpact(budgets);
      const headline = getImpactHeadline(impact);
      expect(headline).toContain('절감');
    });
  });
});

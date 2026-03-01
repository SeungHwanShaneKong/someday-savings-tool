import { describe, it, expect } from 'vitest';
import {
  getHiddenCostsForItem,
  calculateTotalHiddenCosts,
  HIDDEN_COST_RULES,
} from '../hidden-costs';

describe('hidden-costs', () => {
  describe('HIDDEN_COST_RULES', () => {
    it('has at least 10 rules', () => {
      expect(HIDDEN_COST_RULES.length).toBeGreaterThanOrEqual(10);
    });

    it('every rule has required fields', () => {
      for (const rule of HIDDEN_COST_RULES) {
        expect(rule.id).toBeTruthy();
        expect(rule.triggerCategory).toBeTruthy();
        expect(rule.triggerSubCategory).toBeTruthy();
        expect(rule.title).toBeTruthy();
        expect(rule.description).toBeTruthy();
        expect(rule.estimatedCost).toBeGreaterThan(0);
        expect(rule.emoji).toBeTruthy();
      }
    });

    it('has unique rule IDs', () => {
      const ids = HIDDEN_COST_RULES.map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('getHiddenCostsForItem', () => {
    it('returns matching rules for dress-main', () => {
      const rules = getHiddenCostsForItem('sudeme-styling', 'dress-main');
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some((r) => r.id === 'dress-fitting-fee')).toBe(true);
    });

    it('returns matching rules for studio', () => {
      const rules = getHiddenCostsForItem('sudeme-styling', 'studio');
      expect(rules.length).toBeGreaterThanOrEqual(2);
      // studio triggers: studio-helper-fee, photo-bouquet-extra, original-photo-fee
      const ruleIds = rules.map((r) => r.id);
      expect(ruleIds).toContain('studio-helper-fee');
      expect(ruleIds).toContain('original-photo-fee');
    });

    it('returns empty array for categories without hidden costs', () => {
      const rules = getHiddenCostsForItem('nonexistent', 'nonexistent');
      expect(rules).toEqual([]);
    });

    it('returns matching rules for flight (honeymoon)', () => {
      const rules = getHiddenCostsForItem('honeymoon', 'flight');
      expect(rules.length).toBeGreaterThanOrEqual(1);
      expect(rules.some((r) => r.id === 'travel-insurance')).toBe(true);
    });
  });

  describe('calculateTotalHiddenCosts', () => {
    it('returns zero for empty input', () => {
      const result = calculateTotalHiddenCosts([]);
      expect(result.total).toBe(0);
      expect(result.rules).toEqual([]);
    });

    it('calculates total for single category', () => {
      const result = calculateTotalHiddenCosts([
        ['sudeme-styling', 'dress-main'],
      ]);
      expect(result.total).toBe(200000); // dress-fitting-fee only
      expect(result.rules.length).toBe(1);
    });

    it('calculates total for multiple categories', () => {
      const result = calculateTotalHiddenCosts([
        ['sudeme-styling', 'dress-main'],
        ['sudeme-styling', 'studio'],
        ['honeymoon', 'flight'],
      ]);
      expect(result.total).toBeGreaterThan(0);
      expect(result.rules.length).toBeGreaterThanOrEqual(4);
    });

    it('does not double-count same rule from duplicate input', () => {
      const result1 = calculateTotalHiddenCosts([
        ['sudeme-styling', 'studio'],
      ]);
      const result2 = calculateTotalHiddenCosts([
        ['sudeme-styling', 'studio'],
        ['sudeme-styling', 'studio'],
      ]);
      expect(result1.total).toBe(result2.total);
      expect(result1.rules.length).toBe(result2.rules.length);
    });
  });
});

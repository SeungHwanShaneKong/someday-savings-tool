import { describe, it, expect } from 'vitest';
import { isIncomeItem, calculateNetTotal } from '@/lib/budget-categories';

describe('isIncomeItem', () => {
  it('should return true for expected-gift-money in main-ceremony', () => {
    expect(isIncomeItem('main-ceremony', 'expected-gift-money')).toBe(true);
  });

  it('should return false for other items', () => {
    expect(isIncomeItem('main-ceremony', 'venue-fee')).toBe(false);
    expect(isIncomeItem('honeymoon', 'flight')).toBe(false);
  });
});

describe('calculateNetTotal', () => {
  it('should subtract income items from total', () => {
    const items = [
      { category: 'main-ceremony', sub_category: 'venue-fee', amount: 5000000 },
      { category: 'main-ceremony', sub_category: 'meal-cost', amount: 3000000 },
      { category: 'main-ceremony', sub_category: 'expected-gift-money', amount: 2000000 },
      { category: 'honeymoon', sub_category: 'flight', amount: 1000000 },
    ];
    // (5M + 3M + 1M) - 2M = 7M
    expect(calculateNetTotal(items)).toBe(7000000);
  });

  it('should return 0 for empty items', () => {
    expect(calculateNetTotal([])).toBe(0);
  });

  it('should return full sum when no income items', () => {
    const items = [
      { category: 'main-ceremony', sub_category: 'venue-fee', amount: 5000000 },
      { category: 'honeymoon', sub_category: 'flight', amount: 1000000 },
    ];
    expect(calculateNetTotal(items)).toBe(6000000);
  });

  it('should return negative when income exceeds expenses', () => {
    const items = [
      { category: 'main-ceremony', sub_category: 'venue-fee', amount: 1000000 },
      { category: 'main-ceremony', sub_category: 'expected-gift-money', amount: 5000000 },
    ];
    expect(calculateNetTotal(items)).toBe(-4000000);
  });
});

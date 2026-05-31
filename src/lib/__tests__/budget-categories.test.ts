/** [CL-QA100-BTN-20260531] lib 버튼-로직 단위 검증 */
import { describe, it, expect } from 'vitest';
import {
  formatKoreanWon,
  parseKoreanWon,
  getCategoryById,
  getSubCategoryById,
  BUDGET_CATEGORIES,
} from '../budget-categories';

// ─── BC.1–BC.8: formatKoreanWon() ───

describe('BC: formatKoreanWon()', () => {
  it('BC.1 0 → "0원"', () => {
    expect(formatKoreanWon(0)).toBe('0원');
  });

  it('BC.2 999 (under 만) → "999원"', () => {
    expect(formatKoreanWon(999)).toBe('999원');
  });

  it('BC.3 9,999 (under 만) → "9,999원"', () => {
    expect(formatKoreanWon(9999)).toBe('9,999원');
  });

  it('BC.4 10,000 → "1만원"', () => {
    expect(formatKoreanWon(10000)).toBe('1만원');
  });

  it('BC.5 50,000 → "5만원"', () => {
    expect(formatKoreanWon(50000)).toBe('5만원');
  });

  it('BC.6 1,000,000 → "100만원"', () => {
    expect(formatKoreanWon(1000000)).toBe('100만원');
  });

  it('BC.7 100,000,000 (1억) → "1억원"', () => {
    expect(formatKoreanWon(100000000)).toBe('1억원');
  });

  it('BC.8 150,000,000 (1억 5000만) → "1억 5,000만원"', () => {
    expect(formatKoreanWon(150000000)).toBe('1억 5,000만원');
  });

  it('BC.9 200,000,000 (2억, no remainder) → "2억원"', () => {
    expect(formatKoreanWon(200000000)).toBe('2억원');
  });
});

// ─── BC.10–BC.14: parseKoreanWon() ───

describe('BC: parseKoreanWon()', () => {
  it('BC.10 "10,000원" → 10000', () => {
    expect(parseKoreanWon('10,000원')).toBe(10000);
  });

  it('BC.11 "5만원" → 50000', () => {
    expect(parseKoreanWon('5만원')).toBe(50000);
  });

  it('BC.12 "1억 5000만" → 150000000', () => {
    expect(parseKoreanWon('1억 5000만')).toBe(150000000);
  });

  it('BC.13 "1억" → 100000000', () => {
    expect(parseKoreanWon('1억')).toBe(100000000);
  });

  it('BC.14 empty string → 0', () => {
    expect(parseKoreanWon('')).toBe(0);
  });

  it('BC.15 "abc" (NaN) → 0', () => {
    expect(parseKoreanWon('abc')).toBe(0);
  });
});

// ─── BC.16–BC.18: getCategoryById() / getSubCategoryById() / structure ───

describe('BC: category lookup helpers', () => {
  it('BC.16 getCategoryById returns correct category', () => {
    const cat = getCategoryById('honeymoon');
    expect(cat).toBeDefined();
    expect(cat!.name).toBe('신혼여행');
  });

  it('BC.17 getCategoryById returns undefined for unknown id', () => {
    expect(getCategoryById('nonexistent-xyz')).toBeUndefined();
  });

  it('BC.18 getSubCategoryById returns correct sub-category', () => {
    const sub = getSubCategoryById('honeymoon', 'flight');
    expect(sub).toBeDefined();
    expect(sub!.name).toBe('비행기');
  });

  it('BC.19 getSubCategoryById returns undefined for unknown sub-id', () => {
    expect(getSubCategoryById('honeymoon', 'unknown-sub')).toBeUndefined();
  });

  it('BC.20 BUDGET_CATEGORIES contains 6 categories', () => {
    expect(BUDGET_CATEGORIES).toHaveLength(6);
  });

  it('BC.21 all categories have non-empty subCategories', () => {
    for (const cat of BUDGET_CATEGORIES) {
      expect(cat.subCategories.length).toBeGreaterThan(0);
    }
  });
});

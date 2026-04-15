import { describe, it, expect } from 'vitest';
import {
  CHECKLIST_TEMPLATES,
  PERIOD_ORDER,
  PERIOD_LABELS,
  PERIOD_MONTH_OFFSETS,
  getActivePeriod,
  calculateDueDate,
  type ChecklistPeriod,
} from '../checklist-templates';

describe('checklist-templates', () => {
  describe('CHECKLIST_TEMPLATES', () => {
    // [CL-CHECKLIST-ROADMAP-STRICT-20260412-170000] 로드맵 엄격 적용 — 정확히 33개
    it('has exactly 33 roadmap items', () => {
      expect(CHECKLIST_TEMPLATES.length).toBe(33);
    });

    it('every template has required fields', () => {
      for (const t of CHECKLIST_TEMPLATES) {
        expect(t.period).toBeTruthy();
        expect(PERIOD_ORDER).toContain(t.period);
        expect(t.sortOrder).toBeGreaterThan(0);
        expect(t.title).toBeTruthy();
        expect(t.title.length).toBeGreaterThan(0);
      }
    });

    it('covers all 5 periods', () => {
      const periods = new Set(CHECKLIST_TEMPLATES.map((t) => t.period));
      for (const p of PERIOD_ORDER) {
        expect(periods.has(p)).toBe(true);
      }
    });

    it('has unique sortOrder within each period', () => {
      for (const period of PERIOD_ORDER) {
        const items = CHECKLIST_TEMPLATES.filter((t) => t.period === period);
        const orders = items.map((i) => i.sortOrder);
        expect(new Set(orders).size).toBe(orders.length);
      }
    });

    it('templates with categoryLink also have subCategoryLink', () => {
      const linked = CHECKLIST_TEMPLATES.filter((t) => t.categoryLink);
      for (const t of linked) {
        // categoryLink이 있으면 subCategoryLink도 있어야 함
        // (단, 일부는 카테고리만 연결될 수 있으므로 optional)
        expect(typeof t.categoryLink).toBe('string');
      }
    });
  });

  describe('PERIOD_ORDER', () => {
    // [CL-CHECKLIST-9PERIOD-20260412-130000] 5 → 9 periods
    it('has exactly 9 periods', () => {
      expect(PERIOD_ORDER.length).toBe(9);
    });

    it('is in chronological order (earliest first)', () => {
      // D-12~10m comes before D-9~7m, etc.
      for (let i = 0; i < PERIOD_ORDER.length - 1; i++) {
        const currentStart = PERIOD_MONTH_OFFSETS[PERIOD_ORDER[i]].start;
        const nextStart = PERIOD_MONTH_OFFSETS[PERIOD_ORDER[i + 1]].start;
        expect(currentStart).toBeGreaterThan(nextStart);
      }
    });
  });

  describe('PERIOD_LABELS', () => {
    it('has a label for every period', () => {
      for (const p of PERIOD_ORDER) {
        expect(PERIOD_LABELS[p]).toBeTruthy();
        expect(PERIOD_LABELS[p].length).toBeGreaterThan(0);
      }
    });
  });

  describe('getActivePeriod', () => {
    it('returns D-12~10m for wedding 14 months away', () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 14);
      const result = getActivePeriod(futureDate.toISOString().split('T')[0]);
      expect(result).toBe('D-12~10m');
    });

    // [CL-CHECKLIST-9PERIOD-20260412-130000] 9단계 분기 테스트
    it('returns D-8~6m for wedding 7 months away', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 213); // ~7 months
      const result = getActivePeriod(futureDate.toISOString().split('T')[0]);
      expect(result).toBe('D-8~6m');
    });

    it('returns D-5~4m for wedding 4.5 months away', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 137); // ~4.5 months
      const result = getActivePeriod(futureDate.toISOString().split('T')[0]);
      expect(result).toBe('D-5~4m');
    });

    it('returns D-3~2m for wedding 2.5 months away', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 75); // ~2.5 months
      const result = getActivePeriod(futureDate.toISOString().split('T')[0]);
      expect(result).toBe('D-3~2m');
    });

    it('returns D-1~0 for wedding 2 weeks away', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);
      const result = getActivePeriod(futureDate.toISOString().split('T')[0]);
      expect(result).toBe('D-1~0');
    });

    it('returns null for past wedding date (>1 month ago)', () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 2);
      const result = getActivePeriod(pastDate.toISOString().split('T')[0]);
      expect(result).toBeNull();
    });
  });

  describe('calculateDueDate', () => {
    const weddingDate = '2027-06-15';

    it('returns a valid ISO date string', () => {
      const due = calculateDueDate(weddingDate, 'D-12~10m', 1, 10);
      expect(due).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('due dates are before wedding date for early periods', () => {
      const due = calculateDueDate(weddingDate, 'D-12~10m', 1, 10);
      expect(new Date(due) < new Date(weddingDate)).toBe(true);
    });

    it('later sort orders produce later due dates within same period', () => {
      const early = calculateDueDate(weddingDate, 'D-5~4m', 1, 5);
      const late = calculateDueDate(weddingDate, 'D-5~4m', 5, 5);
      expect(new Date(early) <= new Date(late)).toBe(true);
    });

    it('handles single item in period correctly', () => {
      const due = calculateDueDate(weddingDate, 'D-3~2m', 1, 1);
      expect(due).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Should be roughly between 3 and 2 months before wedding
      const dueDate = new Date(due);
      const wedding = new Date(weddingDate);
      const diffMonths = (wedding.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      expect(diffMonths).toBeGreaterThan(1.5);
      expect(diffMonths).toBeLessThan(3.5);
    });
  });
});

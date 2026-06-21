// [CL-QUALITY-DATE-20260621] calculateDueDate setMonth day-overflow 회귀 가드.
import { describe, it, expect } from 'vitest';
import { calculateDueDate } from '@/lib/checklist-templates';

describe('calculateDueDate — 월말 결혼 setMonth overflow', () => {
  it('DUE.1 31일 결혼 -1개월 → 이전 달(2월)로 정확히(같은 3월 붕괴 X)', () => {
    const due = calculateDueDate('2026-03-31', 'D-1~0', 1, 1);
    // overflow 시 'Feb 31' → 3월 초로 롤포워드되어 getUTCMonth()===2(March). 수정 후 1(Feb).
    expect(new Date(due + 'T00:00:00Z').getUTCMonth()).toBe(1);
  });

  it('DUE.2 말일 결혼이라도 due 일자는 대상 월 마지막 날 이하로 clamp', () => {
    const due = calculateDueDate('2026-03-31', 'D-1~0', 1, 1);
    const day = new Date(due + 'T00:00:00Z').getUTCDate();
    expect(day).toBeLessThanOrEqual(29); // 2026-02 last day = 28
  });

  it('DUE.3 중순(15일) 결혼은 overflow 무관 — 정상 동작 회귀', () => {
    const due = calculateDueDate('2027-06-15', 'D-1~0', 1, 1);
    expect(/^\d{4}-\d{2}-\d{2}$/.test(due)).toBe(true);
  });
});

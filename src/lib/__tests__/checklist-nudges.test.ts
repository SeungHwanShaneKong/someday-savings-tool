/** [CL-QA100-BTN-20260531] lib 버튼-로직 단위 검증 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getUrgencyLevel,
  getPraiseForCount,
  getStreakMessage,
  getProgressMessage,
  getRandomNoDdayNudge,
  getRandomIncompleteNudge,
  NO_DDAY_NUDGES,
  INCOMPLETE_NUDGES,
} from '../checklist-nudges';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// Fixed reference point: 2026-05-31 noon UTC
const FIXED_NOW = new Date('2026-05-31T12:00:00Z').getTime();

function fixDate() {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
}

// ─── NG.1–NG.7: getUrgencyLevel() boundary tests ───

describe('NG: getUrgencyLevel()', () => {
  it('NG.1 completed=true → always "done" regardless of date', () => {
    fixDate();
    expect(getUrgencyLevel('2025-01-01', true)).toBe('done');
    expect(getUrgencyLevel(null, true)).toBe('done');
    expect(getUrgencyLevel('2026-06-01', true)).toBe('done');
  });

  it('NG.2 no dueDate → "normal"', () => {
    fixDate();
    expect(getUrgencyLevel(null, false)).toBe('normal');
  });

  it('NG.3 overdue (yesterday) → "overdue"', () => {
    fixDate();
    expect(getUrgencyLevel('2026-05-30', false)).toBe('overdue');
  });

  it('NG.4 overdue (one month ago) → "overdue"', () => {
    fixDate();
    expect(getUrgencyLevel('2026-04-30', false)).toBe('overdue');
  });

  it('NG.5 due in 3 days → "urgent"', () => {
    fixDate();
    // 2026-06-03 is 3 days after 2026-05-31
    expect(getUrgencyLevel('2026-06-03', false)).toBe('urgent');
  });

  it('NG.6 due in exactly 7 days → "urgent"', () => {
    fixDate();
    expect(getUrgencyLevel('2026-06-07', false)).toBe('urgent');
  });

  it('NG.7 due in 15 days → "soon"', () => {
    fixDate();
    expect(getUrgencyLevel('2026-06-15', false)).toBe('soon');
  });

  it('NG.8 due in 31 days → "normal"', () => {
    fixDate();
    expect(getUrgencyLevel('2026-07-01', false)).toBe('normal');
  });
});

// ─── NG.9–NG.12: getPraiseForCount() ───

describe('NG: getPraiseForCount()', () => {
  it('NG.9 count=0 → null (no praise threshold met)', () => {
    expect(getPraiseForCount(0)).toBeNull();
  });

  it('NG.10 count=1 → first praise (첫 발걸음)', () => {
    const p = getPraiseForCount(1);
    expect(p).not.toBeNull();
    expect(p!.title).toContain('첫 발걸음');
  });

  it('NG.11 count=10 → higher tier (준비의 달인)', () => {
    const p = getPraiseForCount(10);
    expect(p!.title).toContain('준비의 달인');
  });

  it('NG.12 count=55 → highest tier (완벽한 준비, minCompleted=50)', () => {
    const p = getPraiseForCount(55);
    expect(p!.minCompleted).toBe(50);
    expect(p!.title).toContain('완벽한 준비');
  });
});

// ─── NG.13–NG.15: getStreakMessage() ───

describe('NG: getStreakMessage()', () => {
  it('NG.13 streak=2 → null (below first threshold of 3)', () => {
    expect(getStreakMessage(2)).toBeNull();
  });

  it('NG.14 streak=3 → streak-3 message', () => {
    const msg = getStreakMessage(3);
    expect(msg).not.toBeNull();
    expect(msg!.streak).toBe(3);
  });

  it('NG.15 streak=10 → highest threshold message (streak=10)', () => {
    const msg = getStreakMessage(10);
    expect(msg!.streak).toBe(10);
  });
});

// ─── NG.16–NG.18: getProgressMessage() ───

describe('NG: getProgressMessage()', () => {
  it('NG.16 0/5 → 시작 전 message', () => {
    expect(getProgressMessage(0, 5)).toContain('첫 항목');
  });

  it('NG.17 3/4 → 거의 다 했어요', () => {
    expect(getProgressMessage(3, 4)).toContain('거의');
  });

  it('NG.18 5/5 → 완벽 클리어', () => {
    expect(getProgressMessage(5, 5)).toContain('클리어');
  });

  it('NG.18b 0/0 (empty period) → 시작 전 (ratio 0 guard)', () => {
    expect(getProgressMessage(0, 0)).toContain('첫 항목');
  });
});

// ─── NG.19–NG.20: random nudge selectors ───

describe('NG: random nudge selectors', () => {
  it('NG.19 getRandomNoDdayNudge returns a member of NO_DDAY_NUDGES', () => {
    for (let i = 0; i < 20; i++) {
      const nudge = getRandomNoDdayNudge();
      expect(NO_DDAY_NUDGES).toContainEqual(nudge);
    }
  });

  it('NG.20 getRandomIncompleteNudge returns a member of INCOMPLETE_NUDGES', () => {
    for (let i = 0; i < 20; i++) {
      const nudge = getRandomIncompleteNudge();
      expect(INCOMPLETE_NUDGES).toContainEqual(nudge);
    }
  });
});

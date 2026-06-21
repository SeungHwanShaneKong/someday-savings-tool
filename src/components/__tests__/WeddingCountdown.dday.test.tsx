// [CL-QUALITY-DDAY-20260621] D-day off-by-one 회귀 가드 — 달력 일수(24h 주기 아님).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calculateCountdown } from '@/components/WeddingCountdown';

describe('calculateCountdown — 달력 일수(off-by-one 회귀)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('DD.1 결혼 전날 저녁(24h 미만 남음)도 D-1 (이전 floor 버그면 D-0)', () => {
    vi.setSystemTime(new Date(2026, 5, 21, 20, 0, 0));
    const r = calculateCountdown(new Date(2026, 5, 22, 11, 0, 0));
    expect(r.isPast).toBe(false);
    expect(r.days).toBe(1);
  });

  it('DD.2 자정 직전→직후(2h 남음)도 달력상 1일', () => {
    vi.setSystemTime(new Date(2026, 5, 21, 23, 0, 0));
    expect(calculateCountdown(new Date(2026, 5, 22, 1, 0, 0)).days).toBe(1);
  });

  it('DD.3 당일(식 전)은 D-0, isPast=false', () => {
    vi.setSystemTime(new Date(2026, 5, 22, 8, 0, 0));
    const r = calculateCountdown(new Date(2026, 5, 22, 14, 0, 0));
    expect(r.days).toBe(0);
    expect(r.isPast).toBe(false);
  });

  it('DD.4 미래 30일은 D-30', () => {
    vi.setSystemTime(new Date(2026, 5, 1, 10, 0, 0));
    expect(calculateCountdown(new Date(2026, 5, 31, 10, 0, 0)).days).toBe(30);
  });
});

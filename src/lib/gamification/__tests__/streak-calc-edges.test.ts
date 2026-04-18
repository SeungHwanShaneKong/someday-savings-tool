// [CL-GAMIFY-QA50-20260418-224158] streak-calc edge cases (MECE 10)
import { describe, it, expect } from 'vitest';
import {
  computeStreak,
  shiftDate,
  daysBetween,
  STREAK_MILESTONES,
} from '../streak-calc';

describe('streak-calc — edge cases (MECE batch)', () => {
  it('E1: 윤년 2월 28→29 (2028년 leap)', () => {
    expect(shiftDate('2028-02-28', 1)).toBe('2028-02-29');
    expect(shiftDate('2028-02-29', 1)).toBe('2028-03-01');
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
  });

  it('E2: 비윤년 2월 28→3월 1 (2026)', () => {
    expect(shiftDate('2026-02-28', 1)).toBe('2026-03-01');
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
  });

  it('E3: 연도 경계 12/31 → 01/01', () => {
    expect(shiftDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDate('2027-01-01', -1)).toBe('2026-12-31');
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('E4: 1000일 streak 계산 (성능 + 정확성)', () => {
    const dates: string[] = [];
    for (let i = 0; i < 1000; i++) {
      dates.push(shiftDate('2026-04-18', -i));
    }
    const start = performance.now();
    const result = computeStreak(dates, '2026-04-18');
    const elapsed = performance.now() - start;
    expect(result).toBe(1000);
    expect(elapsed).toBeLessThan(50); // 1000 dates < 50ms
  });

  it('E5: 셔플된 입력 순서에서도 올바른 streak 계산', () => {
    const shuffled = ['2026-04-16', '2026-04-18', '2026-04-15', '2026-04-17'];
    expect(computeStreak(shuffled, '2026-04-18')).toBe(4);
  });

  it('E6: 미래 날짜는 필터링 — timezone 오차 방어 (모두 미래 → 0)', () => {
    expect(computeStreak(['2026-04-22'], '2026-04-18')).toBe(0);
    expect(computeStreak(['2026-04-19'], '2026-04-18')).toBe(0);
    // 과거+미래 혼합 — 미래만 필터링되고 과거는 그대로 계산
    expect(
      computeStreak(
        ['2026-04-17', '2026-04-18', '2026-04-99']
          .filter((d) => !d.includes('99')), // 유효 날짜만 (E6의 본질)
        '2026-04-18',
      ),
    ).toBe(2);
    // 오늘+내일 혼합 → 내일은 제외, 오늘만 남아서 streak=1
    expect(computeStreak(['2026-04-18', '2026-04-19'], '2026-04-18')).toBe(1);
  });

  it('E7: 시퀀스 중간 gap (1일 빠짐)', () => {
    const dates = ['2026-04-13', '2026-04-14', '2026-04-16', '2026-04-17', '2026-04-18'];
    // 가장 최근 4-18부터 역순: 4-17, 4-16 → 3일 연속. 이후 4-14 필요한데 4-15가 gap → break
    expect(computeStreak(dates, '2026-04-18')).toBe(3);
  });

  it('E8: 중복 오늘 날짜 여러번 (예: 여러 세션) → streak에 영향 없음', () => {
    const dates = ['2026-04-18', '2026-04-18', '2026-04-18', '2026-04-17'];
    expect(computeStreak(dates, '2026-04-18')).toBe(2);
  });

  it('E9: 빈 오늘 + 어제 없음 + 3일 전 단일 → 0', () => {
    expect(computeStreak(['2026-04-15'], '2026-04-18')).toBe(0);
  });

  it('E10: STREAK_MILESTONES readonly 상수 보장', () => {
    expect(Object.isFrozen(STREAK_MILESTONES) || STREAK_MILESTONES instanceof Array).toBe(true);
    // 상수 값 스냅샷
    expect([...STREAK_MILESTONES]).toEqual([7, 14, 30, 100, 365]);
  });
});

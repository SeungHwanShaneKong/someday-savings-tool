// [CL-GAMIFY-INT-20260418-222329] Streak 계산 순수 함수 테스트
import { describe, it, expect } from 'vitest';
import {
  computeStreak,
  daysBetween,
  shiftDate,
  canUseFreezeToken,
  currentMilestone,
  daysToNextMilestone,
  isStreakActiveToday,
  STREAK_MILESTONES,
} from '../streak-calc';

describe('streak-calc — pure functions', () => {
  // ─── 기본 날짜 유틸 ───
  it('daysBetween: 같은 날짜는 0', () => {
    expect(daysBetween('2026-04-18', '2026-04-18')).toBe(0);
  });

  it('daysBetween: 하루 차이', () => {
    expect(daysBetween('2026-04-17', '2026-04-18')).toBe(1);
  });

  it('daysBetween: 월 경계 넘김', () => {
    expect(daysBetween('2026-03-31', '2026-04-02')).toBe(2);
  });

  it('shiftDate: +1 / -1', () => {
    expect(shiftDate('2026-04-18', 1)).toBe('2026-04-19');
    expect(shiftDate('2026-04-18', -1)).toBe('2026-04-17');
  });

  it('shiftDate: 월 경계', () => {
    expect(shiftDate('2026-04-30', 1)).toBe('2026-05-01');
    expect(shiftDate('2026-04-01', -1)).toBe('2026-03-31');
  });

  // ─── computeStreak 핵심 시나리오 ───
  it('computeStreak: 빈 배열 → 0', () => {
    expect(computeStreak([], '2026-04-18')).toBe(0);
  });

  it('computeStreak: 오늘 하루만 → 1', () => {
    expect(computeStreak(['2026-04-18'], '2026-04-18')).toBe(1);
  });

  it('computeStreak: 어제·오늘 연속 → 2', () => {
    expect(
      computeStreak(['2026-04-17', '2026-04-18'], '2026-04-18'),
    ).toBe(2);
  });

  it('computeStreak: 어제만 활동 (오늘 아직) → 1 (grace)', () => {
    expect(computeStreak(['2026-04-17'], '2026-04-18')).toBe(1);
  });

  it('computeStreak: 그제·어제·오늘 연속 → 3', () => {
    expect(
      computeStreak(
        ['2026-04-16', '2026-04-17', '2026-04-18'],
        '2026-04-18',
      ),
    ).toBe(3);
  });

  it('computeStreak: 중복 날짜 제거됨', () => {
    expect(
      computeStreak(
        ['2026-04-18', '2026-04-18', '2026-04-17', '2026-04-17'],
        '2026-04-18',
      ),
    ).toBe(2);
  });

  it('computeStreak: 2일 전 + 오늘 (어제 끊김) → 1', () => {
    expect(
      computeStreak(['2026-04-16', '2026-04-18'], '2026-04-18'),
    ).toBe(1);
  });

  it('computeStreak: 3일 전 활동뿐 (모두 끊김) → 0', () => {
    expect(computeStreak(['2026-04-15'], '2026-04-18')).toBe(0);
  });

  it('computeStreak: 30일 연속 활동', () => {
    const dates: string[] = [];
    for (let i = 0; i < 30; i++) {
      dates.push(shiftDate('2026-04-18', -i));
    }
    expect(computeStreak(dates, '2026-04-18')).toBe(30);
  });

  it('computeStreak: 월 경계 넘어가는 연속 (3/30~4/2)', () => {
    expect(
      computeStreak(
        ['2026-03-30', '2026-03-31', '2026-04-01', '2026-04-02'],
        '2026-04-02',
      ),
    ).toBe(4);
  });

  // ─── isStreakActiveToday ───
  it('isStreakActiveToday: 오늘 포함 → true', () => {
    expect(
      isStreakActiveToday(['2026-04-17', '2026-04-18'], '2026-04-18'),
    ).toBe(true);
  });

  it('isStreakActiveToday: 오늘 미포함 → false', () => {
    expect(isStreakActiveToday(['2026-04-17'], '2026-04-18')).toBe(false);
  });

  // ─── canUseFreezeToken ───
  it('canUseFreezeToken: 토큰 0개 → false', () => {
    expect(
      canUseFreezeToken(['2026-04-16', '2026-04-17'], 0, '2026-04-18'),
    ).toBe(false);
  });

  it('canUseFreezeToken: 어제 활동 존재 → false (아직 끊기지 않음)', () => {
    expect(
      canUseFreezeToken(['2026-04-17'], 2, '2026-04-18'),
    ).toBe(false);
  });

  it('canUseFreezeToken: 그제 활동 + 어제·오늘 공백 → true', () => {
    expect(
      canUseFreezeToken(['2026-04-16'], 2, '2026-04-18'),
    ).toBe(true);
  });

  it('canUseFreezeToken: 오늘 이미 활동 → false (이미 OK)', () => {
    expect(
      canUseFreezeToken(['2026-04-16', '2026-04-18'], 2, '2026-04-18'),
    ).toBe(false);
  });

  // ─── 마일스톤 ───
  it('currentMilestone: 임계값 경계 정확', () => {
    expect(currentMilestone(0)).toBe(0);
    expect(currentMilestone(6)).toBe(0);
    expect(currentMilestone(7)).toBe(7);
    expect(currentMilestone(13)).toBe(7);
    expect(currentMilestone(14)).toBe(14);
    expect(currentMilestone(29)).toBe(14);
    expect(currentMilestone(30)).toBe(30);
    expect(currentMilestone(99)).toBe(30);
    expect(currentMilestone(100)).toBe(100);
    expect(currentMilestone(364)).toBe(100);
    expect(currentMilestone(365)).toBe(365);
    expect(currentMilestone(9999)).toBe(365);
  });

  it('daysToNextMilestone: 다음 마일스톤까지 남은 일', () => {
    expect(daysToNextMilestone(0)).toBe(7);
    expect(daysToNextMilestone(6)).toBe(1);
    expect(daysToNextMilestone(7)).toBe(7); // 14 - 7
    expect(daysToNextMilestone(100)).toBe(265); // 365 - 100
    expect(daysToNextMilestone(365)).toBe(null);
    expect(daysToNextMilestone(9999)).toBe(null);
  });

  it('STREAK_MILESTONES 상수는 오름차순', () => {
    const arr = [...STREAK_MILESTONES];
    const sorted = [...arr].sort((a, b) => a - b);
    expect(arr).toEqual(sorted);
  });
});

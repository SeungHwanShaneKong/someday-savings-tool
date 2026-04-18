// [CL-GAMIFY-QA50-20260418-224158] calculateLevel + pointsToNextLevel (MECE 5)
import { describe, it, expect } from 'vitest';
import {
  calculateLevel,
  pointsToNextLevel,
  DEFAULT_GAMIFICATION_STATE,
} from '../types';

describe('types — calculateLevel / pointsToNextLevel', () => {
  it('E1: 레벨 경계값 정확 (sqrt 공식: level = floor(sqrt(pt/100))+1)', () => {
    // level 1: 0 ~ 99pt
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(1)).toBe(1);
    expect(calculateLevel(99)).toBe(1);
    // level 2: 100 ~ 399pt (1^2*100 = 100, 2^2*100 = 400)
    expect(calculateLevel(100)).toBe(2);
    expect(calculateLevel(399)).toBe(2);
    // level 3: 400 ~ 899pt
    expect(calculateLevel(400)).toBe(3);
    expect(calculateLevel(899)).toBe(3);
    // level 4: 900 ~ 1599pt
    expect(calculateLevel(900)).toBe(4);
    // level 10: 8100 ~ 9999pt
    expect(calculateLevel(8100)).toBe(10);
  });

  it('E2: 음수/0 포인트 → 레벨 1 (안전)', () => {
    expect(calculateLevel(-1)).toBe(1);
    expect(calculateLevel(-1000)).toBe(1);
    expect(calculateLevel(0)).toBe(1);
  });

  it('E3: 매우 큰 포인트 (1M+) 처리', () => {
    // sqrt(1_000_000 / 100) = sqrt(10000) = 100 → level 101
    expect(calculateLevel(1_000_000)).toBe(101);
    // sqrt(999_999_999 / 100) ≈ 3162.27 → level 3163
    expect(calculateLevel(999_999_999)).toBe(3163);
  });

  it('E4: pointsToNextLevel — 각 레벨에서 필요한 포인트', () => {
    // level 1 (0pt), 다음 level(=2)까지 = 1^2*100 - 0 = 100
    expect(pointsToNextLevel(0)).toBe(100);
    // level 1 (50pt), 다음 = 100 - 50 = 50
    expect(pointsToNextLevel(50)).toBe(50);
    // level 2 (100pt), 다음 level(=3)까지 = 2^2*100 - 100 = 300
    expect(pointsToNextLevel(100)).toBe(300);
    // 정확히 레벨 경계 (level 3 시작점 400pt), 다음 = 900 - 400 = 500
    expect(pointsToNextLevel(400)).toBe(500);
  });

  it('E5: DEFAULT_GAMIFICATION_STATE 기본값 일관성', () => {
    expect(DEFAULT_GAMIFICATION_STATE.total_points).toBe(0);
    expect(DEFAULT_GAMIFICATION_STATE.level).toBe(1);
    expect(DEFAULT_GAMIFICATION_STATE.login_streak_days).toBe(0);
    expect(DEFAULT_GAMIFICATION_STATE.freeze_tokens).toBe(2);
    expect(DEFAULT_GAMIFICATION_STATE.cohort_opted_in).toBe(false);
    expect(DEFAULT_GAMIFICATION_STATE.unlocked_badge_slugs).toEqual([]);
    expect(DEFAULT_GAMIFICATION_STATE.opt_in_phases).toEqual([
      'streak',
      'passport',
      'score_card',
      'leaderboard',
    ]);
  });
});

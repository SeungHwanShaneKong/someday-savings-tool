// [CL-TOP20-P4-GAMIFY-20260703-040000] milestoneProgress / pickNextVisitReason 경계 테스트
import { describe, it, expect } from 'vitest';
import {
  milestoneProgress,
  pickNextVisitReason,
} from '../milestone-progress';

describe('milestoneProgress — 마일스톤(7/14/30/100/365) 경계', () => {
  it('B1: 0일 → 구간 [0,7), ratio 0, 7일 남음', () => {
    expect(milestoneProgress(0)).toEqual({
      start: 0,
      next: 7,
      ratio: 0,
      daysToNext: 7,
    });
  });

  it('B2: 각 마일스톤 직전(6/13/29/99/364) → daysToNext 1', () => {
    for (const [days, next] of [
      [6, 7],
      [13, 14],
      [29, 30],
      [99, 100],
      [364, 365],
    ] as const) {
      const p = milestoneProgress(days);
      expect(p.next).toBe(next);
      expect(p.daysToNext).toBe(1);
      expect(p.ratio).toBeGreaterThan(0.8);
      expect(p.ratio).toBeLessThan(1);
    }
  });

  it('B3: 마일스톤 정확 도달(7/14/30/100) → 다음 구간 시작(ratio 0)', () => {
    for (const [days, start, next] of [
      [7, 7, 14],
      [14, 14, 30],
      [30, 30, 100],
      [100, 100, 365],
    ] as const) {
      expect(milestoneProgress(days)).toEqual({
        start,
        next,
        ratio: 0,
        daysToNext: next - days,
      });
    }
  });

  it('B4: 365 정확 도달 → next null, ratio 1, daysToNext null (최고 마일스톤)', () => {
    expect(milestoneProgress(365)).toEqual({
      start: 365,
      next: null,
      ratio: 1,
      daysToNext: null,
    });
  });

  it('B5: 365 초과(400) → next null, ratio 1 유지', () => {
    const p = milestoneProgress(400);
    expect(p.next).toBeNull();
    expect(p.ratio).toBe(1);
    expect(p.daysToNext).toBeNull();
  });

  it('B6: 음수·소수·NaN 방어 — 0 클램프/버림', () => {
    expect(milestoneProgress(-3)).toEqual(milestoneProgress(0));
    expect(milestoneProgress(6.9).daysToNext).toBe(1); // 버림 → 6
    expect(milestoneProgress(Number.NaN)).toEqual(milestoneProgress(0));
  });

  it('B7: 0~400 전 구간에서 ratio 는 항상 [0,1]', () => {
    for (let d = 0; d <= 400; d++) {
      const { ratio } = milestoneProgress(d);
      expect(ratio).toBeGreaterThanOrEqual(0);
      expect(ratio).toBeLessThanOrEqual(1);
    }
  });
});

describe('pickNextVisitReason — 더 가까운 마일스톤 1개 선택', () => {
  it('P1: login 이 더 가까우면 login + target = days+in', () => {
    const r = pickNextVisitReason({
      loginStreakDays: 6,
      checklistStreakDays: 2,
      loginNextMilestoneIn: 1,
      checklistNextMilestoneIn: 5,
    });
    expect(r).toEqual({ kind: 'login', daysToNext: 1, targetMilestone: 7 });
  });

  it('P2: checklist 가 더 가까우면 checklist 선택', () => {
    const r = pickNextVisitReason({
      loginStreakDays: 1,
      checklistStreakDays: 12,
      loginNextMilestoneIn: 6,
      checklistNextMilestoneIn: 2,
    });
    expect(r).toEqual({ kind: 'checklist', daysToNext: 2, targetMilestone: 14 });
  });

  it('P3: 동률이면 login 우선', () => {
    const r = pickNextVisitReason({
      loginStreakDays: 4,
      checklistStreakDays: 4,
      loginNextMilestoneIn: 3,
      checklistNextMilestoneIn: 3,
    });
    expect(r?.kind).toBe('login');
  });

  it('P4: 한쪽 null(최고 달성) → 다른 쪽 선택', () => {
    const r = pickNextVisitReason({
      loginStreakDays: 365,
      checklistStreakDays: 10,
      loginNextMilestoneIn: null,
      checklistNextMilestoneIn: 4,
    });
    expect(r).toEqual({ kind: 'checklist', daysToNext: 4, targetMilestone: 14 });
  });

  it('P5: 둘 다 null → null (양쪽 최고 마일스톤)', () => {
    expect(
      pickNextVisitReason({
        loginStreakDays: 365,
        checklistStreakDays: 400,
        loginNextMilestoneIn: null,
        checklistNextMilestoneIn: null,
      }),
    ).toBeNull();
  });
});

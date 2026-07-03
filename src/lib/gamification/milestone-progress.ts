/**
 * [CL-TOP20-P4-GAMIFY-20260703-040000] 스트릭 마일스톤 진행률 순수 함수
 * - StreakProgressRing(원형 진행 링)·NextMilestoneCard(다음 방문 이유)가 소비
 * - streak-calc 의 STREAK_MILESTONES(7/14/30/100/365)를 단일 진실원으로 재사용
 * - DB/훅 의존 0 — 결정론적 순수 계산 (테스트: __tests__/milestone-progress.test.ts)
 */
import { STREAK_MILESTONES } from './streak-calc';

export interface MilestoneProgress {
  /** 현재 구간 시작 마일스톤 (아직 7 미만이면 0) */
  start: number;
  /** 다음 마일스톤 (최고 마일스톤 365 이상이면 null) */
  next: number | null;
  /** 구간 내 진행률 0~1 (next=null 이면 1) */
  ratio: number;
  /** 다음 마일스톤까지 남은 일수 (next=null 이면 null) */
  daysToNext: number | null;
}

/**
 * 현재 스트릭 일수가 다음 마일스톤까지 얼마나 왔는지(구간 내 위치) 계산.
 * 음수·소수 입력은 0 클램프·버림으로 방어한다.
 */
export function milestoneProgress(streakDays: number): MilestoneProgress {
  const days = Math.max(0, Math.floor(Number.isFinite(streakDays) ? streakDays : 0));
  const next = STREAK_MILESTONES.find((m) => days < m) ?? null;
  const start = [...STREAK_MILESTONES].reverse().find((m) => days >= m) ?? 0;
  if (next === null) {
    return { start, next: null, ratio: 1, daysToNext: null };
  }
  const span = next - start;
  const ratio = span > 0 ? Math.min(1, Math.max(0, (days - start) / span)) : 1;
  return { start, next, ratio, daysToNext: next - days };
}

export type StreakKind = 'login' | 'checklist';

export interface NextVisitReason {
  kind: StreakKind;
  /** 다음 마일스톤까지 남은 일수 (≥1) */
  daysToNext: number;
  /** 도달하게 될 마일스톤 일수 (예: 7) */
  targetMilestone: number;
}

export interface NextVisitInput {
  loginStreakDays: number;
  checklistStreakDays: number;
  loginNextMilestoneIn: number | null;
  checklistNextMilestoneIn: number | null;
}

/**
 * login/checklist 스트릭 중 다음 마일스톤이 더 가까운 쪽 1개를 선택.
 * - 동률이면 login 우선(방문 자체가 이유가 되도록)
 * - 둘 다 null(최고 마일스톤 달성)이면 null
 * - useStreak 의 기존 반환값(NextMilestoneIn)만 소비 — 재계산 없음
 */
export function pickNextVisitReason(input: NextVisitInput): NextVisitReason | null {
  const candidates: NextVisitReason[] = [];
  if (input.loginNextMilestoneIn !== null && input.loginNextMilestoneIn > 0) {
    candidates.push({
      kind: 'login',
      daysToNext: input.loginNextMilestoneIn,
      targetMilestone: Math.max(0, input.loginStreakDays) + input.loginNextMilestoneIn,
    });
  }
  if (input.checklistNextMilestoneIn !== null && input.checklistNextMilestoneIn > 0) {
    candidates.push({
      kind: 'checklist',
      daysToNext: input.checklistNextMilestoneIn,
      targetMilestone: Math.max(0, input.checklistStreakDays) + input.checklistNextMilestoneIn,
    });
  }
  if (candidates.length === 0) return null;
  // 더 가까운 쪽 우선, 동률이면 login 우선
  candidates.sort((a, b) => {
    if (a.daysToNext !== b.daysToNext) return a.daysToNext - b.daysToNext;
    return a.kind === 'login' ? -1 : 1;
  });
  return candidates[0];
}

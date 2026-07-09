// [CL-CHECKUX-20260709-232512]
/**
 * AI 일정 최적화 결과 → 체크리스트 적용 계획 (순수 함수, 클라이언트 전용)
 *
 * 계약(검증됨): timeline-optimizer Edge/로컬 폴백 모두
 *   { timeline: [{ month:'YYYY-MM', tasks:[{ task, priority, tip, deadline:'YYYY-MM-DD' }] }], dday_count }
 * 동일 shape → 여기서는 { task, deadline } 구조 타입만 요구(hooks 레이어에 의존하지 않음).
 *
 * 매칭 규칙:
 * - 정규화(소문자·트림·가운뎃점 제거·공백 압축) 후 ①압축문자열 완전일치 ②양방향 includes
 *   ③토큰 중첩 비율 ≥ 0.5 순으로 스코어링, 최고점 항목 1개에 그리디 귀속(항목당 1회).
 * - **미완료 항목만** 기한 적용 대상. 완료 항목과만 매치되면 skip(중복 추가 방지).
 * - newDue === oldDue 면 skip(무의미한 쓰기 방지).
 * - 무매치 task 는 "내 리스트에 추가" 후보 — 기간은 getPeriodForDate(결혼일, deadline),
 *   결혼식 이후(null)는 마지막 버킷 'D-1~0' 로 클램프. 동일 제목 중복 추가는 1회만.
 */
import { getPeriodForDate, type ChecklistPeriod } from './checklist-templates';

/** 매칭 대상 체크리스트 항목의 최소 형태 */
export interface ApplyTargetItem {
  id: string;
  title: string;
  due_date: string | null;
  is_completed: boolean;
}

/** 타임라인 task 의 최소 형태 (useTimelineOptimizer.TimelineTask 의 부분집합) */
export interface TimelineTaskLike {
  task: string;
  deadline: string;
}

export interface TimelineResultLike<T extends TimelineTaskLike = TimelineTaskLike> {
  timeline: { month: string; tasks: T[] }[];
}

export interface TimelineMatch {
  itemId: string;
  title: string;
  oldDue: string | null;
  newDue: string;
}

export interface TimelineAddition {
  title: string;
  deadline: string;
  period: ChecklistPeriod;
}

export type TimelineTaskDecision =
  | ({ kind: 'apply' } & TimelineMatch)
  | ({ kind: 'add' } & TimelineAddition)
  | { kind: 'skip'; reason: 'same-due' | 'already-done' | 'invalid-deadline' | 'duplicate' };

export interface TimelineApplyPlan<T extends TimelineTaskLike = TimelineTaskLike> {
  matches: TimelineMatch[];
  additions: TimelineAddition[];
  /** task 객체 identity → 결정(패널 렌더용). 같은 result 객체가 양쪽에 흐르므로 안전 */
  decisions: Map<T, TimelineTaskDecision>;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 소문자·가운뎃점→공백·트림·공백 압축 */
function normalize(s: string): string {
  return s.toLowerCase().replace(/·/g, ' ').replace(/\s+/g, ' ').trim();
}

/** 비교용 압축 문자열(공백 완전 제거) */
function compact(s: string): string {
  return normalize(s).replace(/\s+/g, '');
}

/** 토큰 분해 — 공백·구두점 경계 */
function tokenize(s: string): string[] {
  return normalize(s)
    .split(/[\s/()[\]{},&+~-]+/)
    .filter(Boolean);
}

/** 토큰 중첩 비율 = |교집합| / min(|A|,|B|) */
function tokenOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let inter = 0;
  for (const t of new Set(a)) {
    if (setB.has(t)) inter++;
  }
  return inter / Math.min(new Set(a).size, setB.size);
}

/** 매칭 스코어: 0=무매치 · 1=토큰중첩≥0.5 · 2=includes · 3=압축 완전일치 */
function matchScore(taskCompact: string, taskTokens: string[], item: ApplyTargetItem): number {
  const itemCompact = compact(item.title);
  if (itemCompact.length === 0 || taskCompact.length === 0) return 0;
  if (taskCompact === itemCompact) return 3;
  if (taskCompact.includes(itemCompact) || itemCompact.includes(taskCompact)) return 2;
  if (tokenOverlap(taskTokens, tokenize(item.title)) >= 0.5) return 1;
  return 0;
}

export function matchTimelineToChecklist<T extends TimelineTaskLike>(
  result: TimelineResultLike<T>,
  items: readonly ApplyTargetItem[],
  weddingDate: string | null,
): TimelineApplyPlan<T> {
  const matches: TimelineMatch[] = [];
  const additions: TimelineAddition[] = [];
  const decisions = new Map<T, TimelineTaskDecision>();

  const claimedItemIds = new Set<string>(); // 항목당 1회 귀속(그리디)
  const addedTitles = new Set<string>(); // 동일 제목 중복 추가 방지

  const incomplete = items.filter((i) => !i.is_completed);
  const completed = items.filter((i) => i.is_completed);

  for (const monthData of result.timeline) {
    for (const task of monthData.tasks) {
      const taskCompact = compact(task.task);
      const taskTokens = tokenize(task.task);

      if (!DATE_RE.test(task.deadline) || Number.isNaN(Date.parse(`${task.deadline}T00:00:00Z`))) {
        decisions.set(task, { kind: 'skip', reason: 'invalid-deadline' });
        continue;
      }

      // ① 미완료 항목에서 최고점 매치 탐색(이미 귀속된 항목 제외)
      let best: ApplyTargetItem | null = null;
      let bestScore = 0;
      for (const item of incomplete) {
        if (claimedItemIds.has(item.id)) continue;
        const score = matchScore(taskCompact, taskTokens, item);
        if (score > bestScore) {
          best = item;
          bestScore = score;
        }
      }

      if (best) {
        claimedItemIds.add(best.id);
        const oldDue = best.due_date ? best.due_date.slice(0, 10) : null;
        if (oldDue === task.deadline) {
          decisions.set(task, { kind: 'skip', reason: 'same-due' });
          continue;
        }
        const match: TimelineMatch = {
          itemId: best.id,
          title: best.title,
          oldDue,
          newDue: task.deadline,
        };
        matches.push(match);
        decisions.set(task, { kind: 'apply', ...match });
        continue;
      }

      // ② 완료 항목과만 매치 → 이미 끝난 일(중복 추가 방지)
      const doneMatch = completed.some(
        (item) => matchScore(taskCompact, taskTokens, item) > 0,
      );
      if (doneMatch) {
        decisions.set(task, { kind: 'skip', reason: 'already-done' });
        continue;
      }

      // ③ 무매치 → 추가 후보 (동일 제목 1회만)
      if (addedTitles.has(taskCompact)) {
        decisions.set(task, { kind: 'skip', reason: 'duplicate' });
        continue;
      }
      addedTitles.add(taskCompact);
      const period: ChecklistPeriod =
        (weddingDate ? getPeriodForDate(weddingDate, task.deadline) : null) ?? 'D-1~0';
      const addition: TimelineAddition = {
        title: task.task,
        deadline: task.deadline,
        period,
      };
      additions.push(addition);
      decisions.set(task, { kind: 'add', ...addition });
    }
  }

  return { matches, additions, decisions };
}

// [CL-TOP20-P3-CHECK-20260703-030000]
/**
 * 체크리스트 긴급도 위계 집계 — 순수 함수 모음
 *
 * 경계 정의(기존 getUrgencyLevel 과 동일 — 항목 배지와 섹션 도트가 항상 일치):
 * - overdue : 미완료 && due_date(UTC 자정) < 현재 시각
 * - dueSoon : 미완료 && 현재 ≤ due_date ≤ 7일 이내 (getUrgencyLevel 'urgent')
 * - 완료 항목·due_date 없는 항목은 집계 제외
 *
 * D-day 프리뷰는 화면 표시 전용이라 사용자 로컬 달력 기준으로 계산한다.
 * (저장값 계산은 checklist-templates.calculateDueDate 의 UTC 통일 규약을 따르며 여기와 역할 분리)
 */
import { getUrgencyLevel } from './checklist-nudges';
import { PERIOD_ORDER, type ChecklistPeriod } from './checklist-templates';

export interface UrgencyCounts {
  /** 기한 초과(미완료) 개수 */
  overdue: number;
  /** 7일 내 마감(미완료) 개수 */
  dueSoon: number;
}

/** 집계에 필요한 최소 형태 — useChecklist.ChecklistItem 의 부분집합 */
export interface UrgencyItemLike {
  period: ChecklistPeriod;
  due_date: string | null;
  is_completed: boolean;
}

export interface UrgencySummary extends UrgencyCounts {
  /** 기간(period)별 알럿 카운트 — 알럿이 있는 기간만 포함 */
  sectionAlerts: Partial<Record<ChecklistPeriod, UrgencyCounts>>;
  /** PERIOD_ORDER 순서상 첫 번째 overdue 보유 기간(스크롤 타깃), 없으면 null */
  firstOverduePeriod: ChecklistPeriod | null;
}

/**
 * 긴급 카운트 → 사람이 읽을 라벨 조각 (헤더 aria-label/title 합성용)
 */
export function urgencyLabelParts(counts: UrgencyCounts): string[] {
  const parts: string[] = [];
  if (counts.overdue > 0) parts.push(`기한 초과 ${counts.overdue}개`);
  if (counts.dueSoon > 0) parts.push(`7일 내 마감 ${counts.dueSoon}개`);
  return parts;
}

/**
 * 항목 목록의 긴급 카운트(섹션/그룹 헤더 도트용). 완료 항목 제외.
 */
export function countUrgency(
  items: readonly Pick<UrgencyItemLike, 'due_date' | 'is_completed'>[],
): UrgencyCounts {
  let overdue = 0;
  let dueSoon = 0;
  for (const item of items) {
    if (item.is_completed) continue;
    const level = getUrgencyLevel(item.due_date, false);
    if (level === 'overdue') overdue++;
    else if (level === 'urgent') dueSoon++;
  }
  return { overdue, dueSoon };
}

/**
 * 전체 목록 → 페이지 단위 긴급도 요약(상단 배너·기간별 도트).
 */
export function aggregateUrgency(items: readonly UrgencyItemLike[]): UrgencySummary {
  const sectionAlerts: Partial<Record<ChecklistPeriod, UrgencyCounts>> = {};
  let overdue = 0;
  let dueSoon = 0;

  for (const item of items) {
    if (item.is_completed) continue;
    const level = getUrgencyLevel(item.due_date, false);
    if (level !== 'overdue' && level !== 'urgent') continue;

    let bucket = sectionAlerts[item.period];
    if (!bucket) {
      bucket = { overdue: 0, dueSoon: 0 };
      sectionAlerts[item.period] = bucket;
    }
    if (level === 'overdue') {
      overdue++;
      bucket.overdue++;
    } else {
      dueSoon++;
      bucket.dueSoon++;
    }
  }

  let firstOverduePeriod: ChecklistPeriod | null = null;
  for (const period of PERIOD_ORDER) {
    if ((sectionAlerts[period]?.overdue ?? 0) > 0) {
      firstOverduePeriod = period;
      break;
    }
  }

  return { overdue, dueSoon, sectionAlerts, firstOverduePeriod };
}

/**
 * "긴급순 보기" 정렬 — 원본 불변(새 배열 반환), 안정 정렬 보장.
 * - 미완료 우선, 미완료끼리는 due_date 임박순(오름차순), due 없는 항목은 그 뒤
 * - 완료 항목은 하단(기존 상대 순서 유지)
 * - due_date 는 'YYYY-MM-DD' 이므로 사전순 == 시간순
 */
export function sortItemsByUrgency<
  T extends Pick<UrgencyItemLike, 'due_date' | 'is_completed'>,
>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      if (a.item.is_completed !== b.item.is_completed) {
        return a.item.is_completed ? 1 : -1;
      }
      if (!a.item.is_completed) {
        const aDue = a.item.due_date;
        const bDue = b.item.due_date;
        if (aDue !== bDue) {
          if (aDue === null) return 1;
          if (bDue === null) return -1;
          if (aDue < bDue) return -1;
          if (aDue > bDue) return 1;
        }
      }
      return a.index - b.index; // 동률은 기존 순서 유지(안정성)
    })
    .map(({ item }) => item);
}

// ─── "지금 할 일" 포커스 셀렉터 ───

// [CL-CHECKUX-20260709-232512] FocusNowCard 입력 — 순수 셀렉터.
// 정렬 위계: ① overdue(due 오래된 순) → ② dueSoon(≤7일, getUrgencyLevel 'urgent'와 동일 프레임
//   — 항목 배지와 카드가 항상 일치) → ③ activePeriod 미완료(sort_order 순).
// 완료 항목 제외 · ①②에 이미 포함된 항목은 ③에서 중복 제거 · limit 캡 + 전체 후보 수 반환.
// 내부 정렬은 기존 sortItemsByUrgency 재사용(안정 정렬·null due 후순위 규약 공유).

/** 포커스 선정에 필요한 최소 형태 — useChecklist.ChecklistItem 의 부분집합 */
export interface FocusItemLike extends UrgencyItemLike {
  id: string;
  sort_order: number;
}

export interface FocusSelection<T> {
  /** 상위 limit 개 포커스 항목(위계 정렬 완료) */
  focus: T[];
  /** limit 적용 전 전체 후보 수 — "+n개 더 보기" 계산용 */
  totalCandidates: number;
}

export function selectFocusItems<T extends FocusItemLike>(
  items: readonly T[],
  activePeriod: ChecklistPeriod | null,
  { limit = 5 }: { limit?: number } = {},
): FocusSelection<T> {
  const overdue: T[] = [];
  const dueSoon: T[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (item.is_completed) continue;
    const level = getUrgencyLevel(item.due_date, false);
    if (level === 'overdue') {
      overdue.push(item);
      seen.add(item.id);
    } else if (level === 'urgent') {
      dueSoon.push(item);
      seen.add(item.id);
    }
  }

  // activePeriod 미완료 — ①②와 중복 제거 후 sort_order 순
  const activeRest: T[] = [];
  if (activePeriod) {
    for (const item of items) {
      if (item.is_completed || seen.has(item.id) || item.period !== activePeriod) continue;
      activeRest.push(item);
    }
    activeRest.sort((a, b) => a.sort_order - b.sort_order);
  }

  // overdue: due 오름차순 = 가장 오래 밀린 순 · dueSoon: due 오름차순 = 임박순
  const ordered = [
    ...sortItemsByUrgency(overdue),
    ...sortItemsByUrgency(dueSoon),
    ...activeRest,
  ];

  return {
    focus: ordered.slice(0, Math.max(0, limit)),
    totalCandidates: ordered.length,
  };
}

// ─── D-day 온보딩 프리뷰 ───

const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export interface DdayPreview {
  /** 남은 일수(양수=미래, 0=당일, 음수=지난 날짜) */
  dday: number;
  /** 'D-127' | 'D-Day' | 'D+3' */
  ddayLabel: string;
  /** '2026년 11월 7일 (토)' */
  dateLabel: string;
}

/**
 * 날짜 선택 Popover 실시간 프리뷰 — 로컬 달력일 기준 D-day 계산(표시 전용).
 */
export function getDdayPreview(selectedDate: Date, now: Date = new Date()): DdayPreview {
  const startOfLocalDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  // Math.round 로 DST 경계(±1h)에서도 달력일 차이가 정확
  const dday = Math.round(
    (startOfLocalDay(selectedDate) - startOfLocalDay(now)) / 86_400_000,
  );
  const ddayLabel = dday > 0 ? `D-${dday}` : dday === 0 ? 'D-Day' : `D+${Math.abs(dday)}`;
  const dateLabel = `${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 (${KO_WEEKDAYS[selectedDate.getDay()]})`;
  return { dday, ddayLabel, dateLabel };
}

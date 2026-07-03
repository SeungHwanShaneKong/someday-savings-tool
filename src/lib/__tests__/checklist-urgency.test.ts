// [CL-TOP20-P3-CHECK-20260703-030000] 긴급도 위계 집계 순수 함수 단위 검증
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  aggregateUrgency,
  countUrgency,
  sortItemsByUrgency,
  getDdayPreview,
  type UrgencyItemLike,
} from '../checklist-urgency';
import type { ChecklistPeriod } from '../checklist-templates';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// checklist-nudges.test.ts 와 동일한 고정 기준점: 2026-05-31 12:00 UTC
const FIXED_NOW = new Date('2026-05-31T12:00:00Z').getTime();

function fixDate() {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
}

function makeItem(
  period: ChecklistPeriod,
  due_date: string | null,
  is_completed = false,
): UrgencyItemLike {
  return { period, due_date, is_completed };
}

// ─── U: aggregateUrgency / countUrgency ───

describe('U: aggregateUrgency()', () => {
  it('U1 빈 목록 → 전부 0, sectionAlerts 빈 객체, firstOverduePeriod null', () => {
    fixDate();
    const summary = aggregateUrgency([]);
    expect(summary.overdue).toBe(0);
    expect(summary.dueSoon).toBe(0);
    expect(summary.sectionAlerts).toEqual({});
    expect(summary.firstOverduePeriod).toBeNull();
  });

  it('U2 경계: 어제=overdue, +7일=dueSoon, +8일=집계 제외(soon)', () => {
    fixDate();
    const summary = aggregateUrgency([
      makeItem('D-12~10m', '2026-05-30'), // 어제 → overdue
      makeItem('D-12~10m', '2026-06-07'), // 7일 후 → dueSoon (getUrgencyLevel 'urgent' 경계와 동일)
      makeItem('D-12~10m', '2026-06-08'), // 7.5일 후 → soon, 집계 제외
    ]);
    expect(summary.overdue).toBe(1);
    expect(summary.dueSoon).toBe(1);
    expect(summary.sectionAlerts['D-12~10m']).toEqual({ overdue: 1, dueSoon: 1 });
  });

  it('U3 완료 항목은 기한이 지났어도 집계 제외', () => {
    fixDate();
    const summary = aggregateUrgency([
      makeItem('D-12~10m', '2026-01-01', true),
      makeItem('D-10~8m', '2026-06-03', true),
    ]);
    expect(summary.overdue).toBe(0);
    expect(summary.dueSoon).toBe(0);
    expect(summary.firstOverduePeriod).toBeNull();
  });

  it('U4 due_date 없는 미완료 항목은 집계 제외', () => {
    fixDate();
    const summary = aggregateUrgency([makeItem('D-12~10m', null)]);
    expect(summary.overdue).toBe(0);
    expect(summary.dueSoon).toBe(0);
    expect(summary.sectionAlerts).toEqual({});
  });

  it('U5 기간별 sectionAlerts 분리 집계 + firstOverduePeriod 는 PERIOD_ORDER 우선(입력 순서 무관)', () => {
    fixDate();
    // 입력은 늦은 기간(D-8~6m)이 먼저 오지만, 스크롤 타깃은 로드맵 순서상 앞선 D-12~10m
    const summary = aggregateUrgency([
      makeItem('D-8~6m', '2026-05-01'),   // overdue
      makeItem('D-8~6m', '2026-06-02'),   // dueSoon
      makeItem('D-12~10m', '2026-04-01'), // overdue
      makeItem('D-10~8m', '2026-06-05'),  // dueSoon
    ]);
    expect(summary.overdue).toBe(2);
    expect(summary.dueSoon).toBe(2);
    expect(summary.sectionAlerts['D-8~6m']).toEqual({ overdue: 1, dueSoon: 1 });
    expect(summary.sectionAlerts['D-12~10m']).toEqual({ overdue: 1, dueSoon: 0 });
    expect(summary.sectionAlerts['D-10~8m']).toEqual({ overdue: 0, dueSoon: 1 });
    expect(summary.firstOverduePeriod).toBe('D-12~10m');
  });

  it('U6 overdue 없이 dueSoon 만 있으면 firstOverduePeriod=null (배너 미노출 조건)', () => {
    fixDate();
    const summary = aggregateUrgency([makeItem('D-10~8m', '2026-06-04')]);
    expect(summary.dueSoon).toBe(1);
    expect(summary.firstOverduePeriod).toBeNull();
  });

  it('U7 countUrgency 는 aggregateUrgency 총계와 일치(섹션 헤더용 부분집계)', () => {
    fixDate();
    const items = [
      makeItem('D-12~10m', '2026-05-01'),
      makeItem('D-12~10m', '2026-06-03'),
      makeItem('D-12~10m', '2026-08-01'),
      makeItem('D-12~10m', '2026-05-01', true),
    ];
    expect(countUrgency(items)).toEqual({ overdue: 1, dueSoon: 1 });
    const summary = aggregateUrgency(items);
    expect(summary.overdue).toBe(1);
    expect(summary.dueSoon).toBe(1);
  });
});

// ─── S: sortItemsByUrgency ───

describe('S: sortItemsByUrgency()', () => {
  it('S1 미완료 due 임박순 → due 없는 미완료 → 완료 하단', () => {
    const items = [
      { id: 'a', due_date: '2026-08-01', is_completed: false },
      { id: 'b', due_date: null, is_completed: false },
      { id: 'c', due_date: '2026-06-01', is_completed: false },
      { id: 'd', due_date: '2026-01-01', is_completed: true },
      { id: 'e', due_date: '2026-07-01', is_completed: false },
    ];
    const sorted = sortItemsByUrgency(items);
    expect(sorted.map((i) => i.id)).toEqual(['c', 'e', 'a', 'b', 'd']);
  });

  it('S2 완료 항목끼리는 기존 상대 순서 유지 + 원본 배열 불변', () => {
    const items = [
      { id: 'done-1', due_date: '2026-09-01', is_completed: true },
      { id: 'todo', due_date: '2026-06-01', is_completed: false },
      { id: 'done-2', due_date: '2026-01-01', is_completed: true },
    ];
    const original = [...items];
    const sorted = sortItemsByUrgency(items);
    expect(sorted.map((i) => i.id)).toEqual(['todo', 'done-1', 'done-2']);
    expect(items).toEqual(original); // 순수성: 입력 미변경
  });

  it('S3 동일 due_date 는 기존 순서 유지(안정 정렬)', () => {
    const items = [
      { id: 'x', due_date: '2026-06-01', is_completed: false },
      { id: 'y', due_date: '2026-06-01', is_completed: false },
      { id: 'z', due_date: '2026-06-01', is_completed: false },
    ];
    expect(sortItemsByUrgency(items).map((i) => i.id)).toEqual(['x', 'y', 'z']);
  });

  it('S4 빈 목록 → 빈 배열(새 참조)', () => {
    const items: { due_date: string | null; is_completed: boolean }[] = [];
    const sorted = sortItemsByUrgency(items);
    expect(sorted).toEqual([]);
    expect(sorted).not.toBe(items);
  });
});

// ─── D: getDdayPreview (now 명시 주입 — 타임존/타이머 비의존) ───

describe('D: getDdayPreview()', () => {
  it('D1 미래 날짜 → D-N + 한국어 날짜/요일 라벨', () => {
    // 2026-06-03 → 2026-11-07(토) = 157일
    const preview = getDdayPreview(new Date(2026, 10, 7), new Date(2026, 5, 3));
    expect(preview.dday).toBe(157);
    expect(preview.ddayLabel).toBe('D-157');
    expect(preview.dateLabel).toBe('2026년 11월 7일 (토)');
  });

  it('D2 당일 → D-Day (시각이 달라도 같은 달력일이면 0)', () => {
    const preview = getDdayPreview(
      new Date(2026, 10, 7, 23, 59),
      new Date(2026, 10, 7, 0, 1),
    );
    expect(preview.dday).toBe(0);
    expect(preview.ddayLabel).toBe('D-Day');
  });

  it('D3 지난 날짜 → D+N', () => {
    const preview = getDdayPreview(new Date(2026, 5, 1), new Date(2026, 5, 4));
    expect(preview.dday).toBe(-3);
    expect(preview.ddayLabel).toBe('D+3');
  });

  it('D4 내일 경계 → D-1', () => {
    const preview = getDdayPreview(
      new Date(2026, 5, 4, 0, 0),
      new Date(2026, 5, 3, 23, 59),
    );
    expect(preview.ddayLabel).toBe('D-1');
  });
});

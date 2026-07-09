// [CL-CHECKUX-20260709-232512] selectFocusItems — "지금 할 일" 포커스 셀렉터 단위 검증
// 위계: overdue(오래된 순) → dueSoon(≤7일 임박순) → activePeriod 미완료(sort_order) · 완료 제외 · 중복 제거 · limit 캡
import { describe, it, expect, vi, afterEach } from 'vitest';
import { selectFocusItems, type FocusItemLike } from '../checklist-urgency';
import type { ChecklistPeriod } from '../checklist-templates';

afterEach(() => {
  vi.useRealTimers();
});

// checklist-urgency.test.ts 와 동일한 고정 기준점: 2026-05-31 12:00 UTC (KST 21:00 → 오늘 KST = 2026-05-31)
const FIXED_NOW = new Date('2026-05-31T12:00:00Z').getTime();

function fixDate() {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
}

let seq = 0;
function makeItem(
  over: Partial<FocusItemLike> & { id: string },
): FocusItemLike {
  return {
    period: 'D-12~10m' as ChecklistPeriod,
    due_date: null,
    is_completed: false,
    sort_order: ++seq,
    ...over,
  };
}

const ids = (r: { focus: FocusItemLike[] }) => r.focus.map((i) => i.id);

describe('selectFocusItems — 위계 정렬', () => {
  it('F1 overdue(오래된 due 우선) → dueSoon(임박순) → activePeriod(sort_order순)', () => {
    fixDate();
    const items = [
      makeItem({ id: 'active-2', period: 'D-4~3m', sort_order: 2 }),
      makeItem({ id: 'soon-far', due_date: '2026-06-07' }), // +7일 dueSoon
      makeItem({ id: 'over-recent', due_date: '2026-05-30' }), // -1일 overdue
      makeItem({ id: 'active-1', period: 'D-4~3m', sort_order: 1 }),
      makeItem({ id: 'soon-near', due_date: '2026-06-03' }), // +3일 dueSoon
      makeItem({ id: 'over-old', due_date: '2026-05-25' }), // -6일 overdue(가장 오래 밀림)
      makeItem({ id: 'normal', due_date: '2026-08-01' }), // normal — 비활성 기간이라 제외
    ];
    const result = selectFocusItems(items, 'D-4~3m', { limit: 10 });
    expect(ids(result)).toEqual([
      'over-old',
      'over-recent',
      'soon-near',
      'soon-far',
      'active-1',
      'active-2',
    ]);
    expect(result.totalCandidates).toBe(6);
  });

  it('F2 limit 캡(기본 5) + totalCandidates 는 캡 이전 전체 후보 수', () => {
    fixDate();
    const items = Array.from({ length: 8 }, (_, i) =>
      makeItem({ id: `a-${i}`, period: 'D-4~3m', sort_order: i + 1 }),
    );
    const capped = selectFocusItems(items, 'D-4~3m');
    expect(capped.focus).toHaveLength(5);
    expect(capped.totalCandidates).toBe(8);

    const raised = selectFocusItems(items, 'D-4~3m', { limit: 7 });
    expect(raised.focus).toHaveLength(7);
    expect(raised.totalCandidates).toBe(8);
  });

  it('F3 완료 항목은 overdue/activePeriod 어느 경로로도 제외', () => {
    fixDate();
    const items = [
      makeItem({ id: 'done-over', due_date: '2026-01-01', is_completed: true }),
      makeItem({ id: 'done-active', period: 'D-4~3m', is_completed: true }),
      makeItem({ id: 'live', period: 'D-4~3m' }),
    ];
    const result = selectFocusItems(items, 'D-4~3m');
    expect(ids(result)).toEqual(['live']);
    expect(result.totalCandidates).toBe(1);
  });

  it('F4 7일 경계 — +7일은 dueSoon 포함, +8일은 제외(getUrgencyLevel 프레임 일치)', () => {
    fixDate();
    const items = [
      makeItem({ id: 'in-7', due_date: '2026-06-07' }),
      makeItem({ id: 'out-8', due_date: '2026-06-08' }),
    ];
    const result = selectFocusItems(items, null);
    expect(ids(result)).toEqual(['in-7']);
    expect(result.totalCandidates).toBe(1);
  });

  it('F5 빈 입력 → 빈 focus + totalCandidates 0', () => {
    fixDate();
    expect(selectFocusItems([], 'D-4~3m')).toEqual({ focus: [], totalCandidates: 0 });
  });

  it('F6 activePeriod null → 긴급(overdue/dueSoon) 버킷만 선정', () => {
    fixDate();
    const items = [
      makeItem({ id: 'over', due_date: '2026-05-20' }),
      makeItem({ id: 'plain', period: 'D-4~3m' }), // 기간 후보였을 항목 — null 이라 제외
    ];
    const result = selectFocusItems(items, null);
    expect(ids(result)).toEqual(['over']);
  });

  it('F7 activePeriod 항목이 overdue 이기도 하면 한 번만(중복 제거) — overdue 버킷 우선', () => {
    fixDate();
    const items = [
      makeItem({ id: 'dup', period: 'D-4~3m', due_date: '2026-05-25', sort_order: 1 }),
      makeItem({ id: 'rest', period: 'D-4~3m', sort_order: 2 }),
    ];
    const result = selectFocusItems(items, 'D-4~3m', { limit: 10 });
    expect(ids(result)).toEqual(['dup', 'rest']);
    expect(result.totalCandidates).toBe(2);
  });
});

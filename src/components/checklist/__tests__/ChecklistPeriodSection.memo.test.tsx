// [CL-SEC-AUDIT-20260703-101500] #1+#3 perf — ChecklistPeriodSection 파생 배열 캐시 안정성 계약
//   재현: 내용 동일·참조만 다른 items 로 부모 리렌더 → groupItemsByCategory / countUrgency 가
//   재실행(캐시 미스)되면 실패. 수정 후엔 items 참조가 안정(부모 memo)이라 재호출 0.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { ChecklistItem as ChecklistItemType } from '@/hooks/useChecklist';

// ── 순수 함수 spy: importOriginal 로 실제 구현 유지하며 호출 카운트만 계측 ──
const treeSpies = vi.hoisted(() => ({ groupItemsByCategory: vi.fn() }));
vi.mock('@/lib/checklist-tree', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/checklist-tree')>();
  treeSpies.groupItemsByCategory.mockImplementation(actual.groupItemsByCategory);
  return { ...actual, groupItemsByCategory: treeSpies.groupItemsByCategory };
});

const urgencySpies = vi.hoisted(() => ({ countUrgency: vi.fn() }));
vi.mock('@/lib/checklist-urgency', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/checklist-urgency')>();
  urgencySpies.countUrgency.mockImplementation(actual.countUrgency);
  return { ...actual, countUrgency: urgencySpies.countUrgency };
});

// mock 선언 이후 import (호이스팅 순서 안전)
import { ChecklistPeriodSection } from '../ChecklistPeriodSection';

let seq = 0;
function makeItem(over: Partial<ChecklistItemType> = {}): ChecklistItemType {
  seq += 1;
  return {
    id: `item-${seq}`,
    user_id: 'u1',
    template_id: null,
    budget_id: null,
    title: `할 일 ${seq}`,
    period: 'D-12~10m',
    sort_order: seq,
    is_completed: false,
    completed_at: null,
    due_date: null,
    notes: null,
    depends_on: null,
    category_link: null,
    sub_category_link: null,
    is_custom: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...over,
  };
}

const noop = vi.fn();

function renderSection(items: ChecklistItemType[]) {
  return render(
    <ChecklistPeriodSection
      period="D-12~10m"
      items={items}
      isActive
      onToggle={noop}
      onDelete={noop}
      onUpdateNotes={noop}
    />,
  );
}

beforeEach(() => {
  treeSpies.groupItemsByCategory.mockClear();
  urgencySpies.countUrgency.mockClear();
});

describe('ChecklistPeriodSection — 파생 배열 캐시 안정성(#1+#3 perf)', () => {
  it('M1 동일 items 참조로 리렌더 → groupItemsByCategory/countUrgency 재호출 0 (memo 유지)', () => {
    const items = [makeItem({ due_date: '2020-01-01' }), makeItem()];
    const { rerender } = renderSection(items);

    const groupCalls0 = treeSpies.groupItemsByCategory.mock.calls.length;
    const urgencyCalls0 = urgencySpies.countUrgency.mock.calls.length;

    // 동일 참조로 리렌더 → useMemo 가 재계산하지 않아야 함
    rerender(
      <ChecklistPeriodSection
        period="D-12~10m"
        items={items}
        isActive
        onToggle={noop}
        onDelete={noop}
        onUpdateNotes={noop}
      />,
    );

    expect(treeSpies.groupItemsByCategory.mock.calls.length).toBe(groupCalls0);
    expect(urgencySpies.countUrgency.mock.calls.length).toBe(urgencyCalls0);
  });

  it('M2 내용 동일·참조만 다른 items 로 리렌더 → groupItemsByCategory 재호출 0 (props 안정화 계약)', () => {
    // 소스(Checklist.tsx)가 기간별 파생 배열을 memo 로 안정화하면,
    // 이 컴포넌트는 "내용 같으면 참조 같은" items 만 받는다.
    // 그러나 이 컴포넌트 단독으로도, 동일 참조 재사용 시 groupItemsByCategory 는
    // 반드시 memo 되어야 한다(매 렌더 새 CategoryGroup 배열 → 자식 리렌더 폭증 방지).
    const items = [makeItem({ due_date: '2020-01-01' }), makeItem()];
    const { rerender } = renderSection(items);
    const baseline = treeSpies.groupItemsByCategory.mock.calls.length;

    // 부모가 props(예: forceExpand)만 바꿔 리렌더 — items 참조는 동일
    for (let i = 0; i < 3; i++) {
      rerender(
        <ChecklistPeriodSection
          period="D-12~10m"
          items={items}
          isActive
          forceExpand={null}
          onToggle={noop}
          onDelete={noop}
          onUpdateNotes={noop}
        />,
      );
    }

    // groupItemsByCategory 는 items 불변이면 재실행되지 않아야 한다(memo)
    expect(treeSpies.groupItemsByCategory.mock.calls.length).toBe(baseline);
  });
});

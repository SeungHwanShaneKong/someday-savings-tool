// [CL-TOP20-P3-CHECK-20260703-030000] 카테고리 그룹 — 소형 긴급 도트 + 긴급순 정렬
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChecklistCategoryGroup } from '../ChecklistCategoryGroup';
import { CATEGORY_GROUP_META, type CategoryGroup } from '@/lib/checklist-tree';
import type { ChecklistItem as ChecklistItemType } from '@/hooks/useChecklist';

function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString().split('T')[0];
}

function makeItem(
  id: string,
  over: Partial<ChecklistItemType> = {},
): ChecklistItemType {
  return {
    id,
    user_id: 'u1',
    template_id: null,
    budget_id: null,
    title: id,
    period: 'D-12~10m',
    sort_order: 1,
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

function makeGroup(items: ChecklistItemType[]): CategoryGroup {
  return {
    key: 'general',
    meta: CATEGORY_GROUP_META['general'],
    items,
    completed: items.filter((i) => i.is_completed).length,
  };
}

const noop = vi.fn();

function renderGroup(items: ChecklistItemType[], urgencySort: boolean) {
  return render(
    <ChecklistCategoryGroup
      group={makeGroup(items)}
      urgencySort={urgencySort}
      onToggle={noop}
      onDelete={noop}
      onUpdateNotes={noop}
    />,
  );
}

/** 렌더된 항목 제목의 DOM 순서 */
function renderedOrder(): string[] {
  return screen.getAllByText(/^item-/).map((el) => el.textContent as string);
}

const FIXTURE = () => [
  makeItem('item-late', { due_date: daysFromNow(20) }),
  makeItem('item-overdue', { due_date: daysFromNow(-2) }),
  makeItem('item-nodue', { due_date: null }),
  makeItem('item-done', {
    due_date: daysFromNow(-10),
    is_completed: true,
    completed_at: '2026-01-02T00:00:00Z',
  }),
];

describe('ChecklistCategoryGroup — 긴급순 보기', () => {
  it('G1 off(기본) → 전달된 순서 그대로 렌더(회귀 0)', () => {
    renderGroup(FIXTURE(), false);
    expect(renderedOrder()).toEqual(['item-late', 'item-overdue', 'item-nodue', 'item-done']);
  });

  it('G2 on → due 임박순, due 없는 항목은 그 뒤, 완료는 하단', () => {
    renderGroup(FIXTURE(), true);
    expect(renderedOrder()).toEqual(['item-overdue', 'item-late', 'item-nodue', 'item-done']);
  });

  it('G3 overdue 포함 그룹 → 헤더에 소형 빨강 도트(카운트 없음) + aria-label 반영', () => {
    renderGroup(FIXTURE(), false);
    const dot = screen.getByTestId('urgency-dot');
    expect(dot.querySelector('.bg-destructive')).not.toBeNull();
    // 소형 도트 모드 — 숫자 텍스트 미노출
    expect(dot.textContent).toBe('');
    expect(
      screen.getByRole('button', { name: /일반 준비 그룹.*기한 초과 1개/ }),
    ).toBeInTheDocument();
  });

  it('G4 긴급 항목 없는 그룹 → 도트 미노출', () => {
    renderGroup([makeItem('item-a', { due_date: daysFromNow(60) })], false);
    expect(screen.queryByTestId('urgency-dot')).toBeNull();
  });
});

// [CL-TOP20-P3-CHECK-20260703-030000] 기간 섹션 헤더 긴급 알럿 도트 노출/미노출
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ChecklistPeriodSection } from '../ChecklistPeriodSection';
import type { ChecklistItem as ChecklistItemType } from '@/hooks/useChecklist';

/** 상대 날짜(경계에서 충분히 떨어진 값만 사용 → 결정론) */
function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString().split('T')[0];
}

let seq = 0;
function makeItem(over: Partial<ChecklistItemType>): ChecklistItemType {
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

/** 기간 섹션 헤더 버튼(카테고리 그룹 헤더와 구분 — aria-label 에 '체크리스트' 포함) */
function periodHeader() {
  return screen.getByRole('button', { name: /체크리스트,/ });
}

describe('ChecklistPeriodSection — 긴급 알럿 도트', () => {
  it('P1 overdue 항목 존재 → 헤더에 빨강 도트 + 카운트 + aria-label 반영', () => {
    renderSection([
      makeItem({ due_date: daysFromNow(-3) }), // 기한 초과
      makeItem({ due_date: daysFromNow(60) }), // normal
    ]);
    const dot = within(periodHeader()).getByTestId('urgency-dot');
    expect(dot).toHaveAttribute('title', '기한 초과 1개');
    expect(dot.querySelector('.bg-destructive')).not.toBeNull();
    expect(dot).toHaveTextContent('1'); // 카운트 배지
    // 헤더 버튼 aria-label 에 긴급 정보 포함(스크린리더)
    expect(periodHeader().getAttribute('aria-label')).toContain('기한 초과 1개');
  });

  it('P2 7일 내(dueSoon) 항목만 → 앰버(warning) 도트 + 카운트', () => {
    renderSection([
      makeItem({ due_date: daysFromNow(3) }),
      makeItem({ due_date: daysFromNow(60) }),
    ]);
    const dot = within(periodHeader()).getByTestId('urgency-dot');
    expect(dot).toHaveAttribute('title', '7일 내 마감 1개');
    expect(dot.querySelector('.bg-warning')).not.toBeNull();
    expect(dot.querySelector('.bg-destructive')).toBeNull();
    expect(periodHeader().getAttribute('aria-label')).toContain('7일 내 마감 1개');
  });

  it('P3 overdue 항목이라도 완료면 도트 미노출', () => {
    renderSection([
      makeItem({
        due_date: daysFromNow(-5),
        is_completed: true,
        completed_at: '2026-01-02T00:00:00Z',
      }),
      makeItem({ due_date: daysFromNow(60) }),
    ]);
    expect(screen.queryAllByTestId('urgency-dot')).toHaveLength(0);
  });

  it('P4 overdue + dueSoon 동시 존재 → 두 카운트 모두 표기', () => {
    renderSection([
      makeItem({ due_date: daysFromNow(-2) }),
      makeItem({ due_date: daysFromNow(2) }),
    ]);
    const dot = within(periodHeader()).getByTestId('urgency-dot');
    expect(dot).toHaveAttribute('title', '기한 초과 1개, 7일 내 마감 1개');
    expect(dot.querySelector('.bg-destructive')).not.toBeNull();
    expect(dot.querySelector('.bg-warning')).not.toBeNull();
  });

  it('P5 긴급 항목 0 (전부 normal) → 도트 미노출 + aria-label 기존 형식 유지(회귀 0)', () => {
    renderSection([makeItem({ due_date: daysFromNow(60) }), makeItem({ due_date: null })]);
    expect(screen.queryAllByTestId('urgency-dot')).toHaveLength(0);
    expect(
      screen.getByRole('button', {
        name: '12~10개월 전 체크리스트, 2개 항목 중 0개 완료',
      }),
    ).toBeInTheDocument();
  });
});

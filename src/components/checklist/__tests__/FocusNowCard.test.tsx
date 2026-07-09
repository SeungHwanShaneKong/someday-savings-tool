// [CL-CHECKUX-20260709-232512] FocusNowCard — 상시 "지금 할 일" 카드 상호작용 검증
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { FocusNowCard } from '../FocusNowCard';
import type { ChecklistItem } from '@/hooks/useChecklist';

// 경계(±0일)를 피한 여유 오프셋 — 시스템 시각 고정 없이도 KST/UTC 어긋남에 안전
function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString().split('T')[0];
}

function makeItem(id: string, over: Partial<ChecklistItem> = {}): ChecklistItem {
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

const baseProps = {
  activePeriod: 'D-12~10m' as const,
  onToggle: vi.fn(),
  onNavigateToPeriod: vi.fn(),
};

const rowButtons = () => screen.getAllByRole('button', { name: /구간으로 이동/ });

describe('FocusNowCard', () => {
  it('FC1 위계 정렬 렌더 + 헤더에 "기한 지난 할 일 n개" 카운트', () => {
    const items = [
      makeItem('active-task', { sort_order: 1 }),
      makeItem('soon-task', { period: 'D-10~8m', due_date: daysFromNow(2) }),
      makeItem('overdue-task', { due_date: daysFromNow(-5) }),
    ];
    render(<FocusNowCard {...baseProps} items={items} />);

    const card = screen.getByRole('region', { name: '지금 할 일' });
    expect(within(card).getByText('기한 지난 할 일 1개')).toBeInTheDocument();

    // overdue → dueSoon → activePeriod 순
    expect(rowButtons().map((b) => b.getAttribute('aria-label'))).toEqual([
      'overdue-task — 12~10개월 전 구간으로 이동',
      'soon-task — 10~8개월 전 구간으로 이동',
      'active-task — 12~10개월 전 구간으로 이동',
    ]);
  });

  it('FC2 원탭 체크 — 체크박스 클릭 시 onToggle(id), 행 이동 콜백은 미발화', () => {
    const onToggle = vi.fn();
    const onNavigateToPeriod = vi.fn();
    render(
      <FocusNowCard
        {...baseProps}
        onToggle={onToggle}
        onNavigateToPeriod={onNavigateToPeriod}
        items={[makeItem('overdue-task', { due_date: daysFromNow(-5) })]}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'overdue-task 완료로 표시' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith('overdue-task');
    expect(onNavigateToPeriod).not.toHaveBeenCalled();
  });

  it('FC3 행 본문 클릭 → 해당 기간으로 onNavigateToPeriod', () => {
    const onNavigateToPeriod = vi.fn();
    render(
      <FocusNowCard
        {...baseProps}
        onNavigateToPeriod={onNavigateToPeriod}
        items={[makeItem('soon-task', { period: 'D-10~8m', due_date: daysFromNow(2) })]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /soon-task — 10~8개월 전 구간으로 이동/ }));
    expect(onNavigateToPeriod).toHaveBeenCalledTimes(1);
    expect(onNavigateToPeriod).toHaveBeenCalledWith('D-10~8m');
  });

  it('FC4 "+n개 더 보기" — 5개 캡 → 클릭 시 로컬 limit 상승, 전부 보이면 버튼 제거', () => {
    const items = Array.from({ length: 7 }, (_, i) =>
      makeItem(`task-${i}`, { sort_order: i + 1 }),
    );
    render(<FocusNowCard {...baseProps} items={items} />);

    expect(rowButtons()).toHaveLength(5);
    const more = screen.getByRole('button', { name: '+2개 더 보기' });
    fireEvent.click(more);

    expect(rowButtons()).toHaveLength(7);
    expect(screen.queryByRole('button', { name: /더 보기/ })).toBeNull();
  });

  it('FC5 후보 0(전부 완료) → 카드는 유지하고 안심 문구 노출(상시 노출 계약)', () => {
    render(
      <FocusNowCard
        {...baseProps}
        items={[makeItem('done', { is_completed: true, due_date: daysFromNow(-3) })]}
      />,
    );

    expect(screen.getByRole('region', { name: '지금 할 일' })).toBeInTheDocument();
    expect(screen.getByText(/지금 처리할 급한 할 일이 없어요/)).toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /구간으로 이동/ })).toHaveLength(0);
  });

  it('FC6 체크박스 44px 히트영역 클래스(min-h-11/min-w-11) + 시각 크기 h-5 w-5 유지', () => {
    render(
      <FocusNowCard {...baseProps} items={[makeItem('overdue-task', { due_date: daysFromNow(-5) })]} />,
    );

    const hit = screen.getByTestId('focus-checkbox-hit');
    expect(hit.className).toContain('min-h-11');
    expect(hit.className).toContain('min-w-11');
    const checkbox = screen.getByRole('checkbox', { name: 'overdue-task 완료로 표시' });
    expect(checkbox.className).toContain('h-5');
    expect(checkbox.className).toContain('w-5');
  });
});

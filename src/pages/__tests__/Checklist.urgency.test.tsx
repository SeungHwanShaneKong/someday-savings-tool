// [CL-TOP20-P3-CHECK-20260703-030000] Checklist 페이지 — 긴급도 위계 배선 통합 검증
// [CL-CHECKUX-20260709-232512] C1/C2 재타깃: 세션 1회 OverdueAlertBanner → 상시 FocusNowCard 승계.
//   "세션 1회" 단언은 설계상 삭제 — 카드는 새로고침/재방문에도 항상 보이는 것이 새 계약이다.
// (지금 할 일 카드 · 스크롤 앵커 · 긴급순 토글 end-to-end)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import Checklist from '@/pages/Checklist';
import type { ChecklistItem } from '@/hooks/useChecklist';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, loading: false }),
}));

vi.mock('@/hooks/useTimelineOptimizer', () => ({
  useTimelineOptimizer: () => ({
    result: null,
    loading: false,
    error: null,
    isFallback: false,
    optimize: vi.fn(),
    retry: vi.fn(),
  }),
}));

vi.mock('@/hooks/useStreak', () => ({
  useStreak: () => ({
    isLoading: false,
    loginStreakDays: 0,
    checklistStreakDays: 0,
    loginActiveToday: false,
    checklistActiveToday: false,
    canRestoreLogin: false,
    canRestoreChecklist: false,
  }),
}));

vi.mock('@/hooks/useChecklist', () => ({
  useChecklist: () => buildChecklistMock(),
}));

function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString().split('T')[0];
}

function makeItem(
  id: string,
  over: Partial<ChecklistItem> = {},
): ChecklistItem {
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

function buildChecklistMock() {
  // 첫 기간에 overdue 1 + 미래 1 (긴급순 정렬 검증용 — sort_order 상 미래가 먼저)
  const items: ChecklistItem[] = [
    makeItem('item-future', { due_date: daysFromNow(60), sort_order: 1 }),
    makeItem('item-overdue', { due_date: daysFromNow(-5), sort_order: 2 }),
    makeItem('item-soon', { period: 'D-10~8m', due_date: daysFromNow(3), sort_order: 1 }),
  ];
  return {
    items,
    loading: false,
    stats: {
      total: 3,
      completed: 0,
      percentage: 50, // <30 미완료 넛지 배너 미노출(테스트 노이즈 제거)
      byPeriod: {},
    },
    activePeriod: 'D-12~10m' as const,
    praiseEvent: null,
    setPraiseEvent: vi.fn(),
    toggleItem: vi.fn(),
    addCustomItem: vi.fn(),
    deleteItem: vi.fn(),
    updateNotes: vi.fn(),
    updateWeddingDate: vi.fn(),
    hasWeddingDate: true,
    weddingDate: daysFromNow(365),
  };
}

beforeEach(() => {
  sessionStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});

describe('Checklist 페이지 — 긴급도 위계 통합', () => {
  it('C1 overdue 존재 → 지금 할 일 카드에 카운트 노출, 행 클릭 → 대상 기간 앵커로 scrollIntoView', () => {
    renderWithProviders(<Checklist />, { route: '/checklist' });

    const card = screen.getByRole('region', { name: '지금 할 일' });
    expect(card).toHaveTextContent('기한 지난 할 일 1개');
    // overdue 항목 행이 최상단(위계 정렬)에 노출
    expect(card).toHaveTextContent('item-overdue');

    // 스크롤 앵커가 실제 DOM 에 존재
    const anchor = document.getElementById('checklist-period-D-12~10m');
    expect(anchor).not.toBeNull();

    fireEvent.click(
      within(card).getByRole('button', {
        name: 'item-overdue — 12~10개월 전 구간으로 이동',
      }),
    );
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('C2 상시 노출 — 구 배너의 세션 1회 마킹이 있어도 카드는 항상 보인다(설계 변경)', () => {
    // 의도 문서화: OverdueAlertBanner 는 세션 1회 후 사라져 "한눈에 안 들어옴" 문제를 남겼다.
    // FocusNowCard 는 sessionStorage 게이트 없이 상시 노출이 새 계약이다.
    sessionStorage.setItem('wsem-checklist-overdue-banner-seen', '1');
    renderWithProviders(<Checklist />, { route: '/checklist' });

    const card = screen.getByRole('region', { name: '지금 할 일' });
    expect(card).toHaveTextContent('기한 지난 할 일 1개');
  });

  it('C3 긴급순 토글 → 첫 기간 섹션 항목이 due 임박순으로 재배열, off 복귀 시 원순서', () => {
    renderWithProviders(<Checklist />, { route: '/checklist' });

    // [CL-CHECKUX-20260709-232512] FocusNowCard 도 항목 제목을 렌더하므로 기간 섹션으로 스코핑
    const section = document.getElementById('checklist-period-D-12~10m')!;
    const order = () =>
      within(section)
        .getAllByText(/^item-(future|overdue)$/)
        .map((el) => el.textContent as string);

    // off 기본: sort_order 순(미래 → 오버듀)
    expect(order()).toEqual(['item-future', 'item-overdue']);

    const toggle = screen.getByRole('button', { name: '긴급순 보기' });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(order()).toEqual(['item-overdue', 'item-future']);

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(order()).toEqual(['item-future', 'item-overdue']);
  });

  it('C4 기간 섹션 헤더에 긴급 카운트 도트 노출(overdue 1 · dueSoon 1 각 기간)', () => {
    renderWithProviders(<Checklist />, { route: '/checklist' });

    const firstHeader = screen.getByRole('button', {
      name: /12~10개월 전 체크리스트.*기한 초과 1개/,
    });
    expect(within(firstHeader).getByTestId('urgency-dot')).toBeInTheDocument();

    const secondHeader = screen.getByRole('button', {
      name: /10~8개월 전 체크리스트.*7일 내 마감 1개/,
    });
    expect(within(secondHeader).getByTestId('urgency-dot')).toBeInTheDocument();
  });
});

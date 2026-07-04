// [CL-BTNAUDIT3-20260704 | praise-slot] 축하 모달(PraiseModal)이 전역 모달 코디네이터(useNoticeSlot)에
//   편입돼 '한 번에 하나'만 열리는지 계약 검증.
//   재현 배경: PraiseModal 이 코디네이터 미등록이면 자동 안내(update-notice/mobile-desktop/onboarding)와
//   동시 발화 시 Radix Dialog 오버레이가 스택돼 겹침 UX 저하. 슬롯화 후엔 점유 중이면 지연·상호배제.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, renderHook, act } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import {
  useNoticeSlot,
  currentNoticeHolder,
  __resetNoticeSlot,
} from '@/hooks/useNoticeSlot';
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

// praiseEvent 를 켜두면 Checklist 가 useNoticeSlot('praise-modal', true, 4) 를 요청한다.
const checklistMock = {
  items: [makeItem('item-a')],
  loading: false,
  stats: { total: 1, completed: 1, percentage: 100, byPeriod: {} },
  activePeriod: 'D-12~10m' as const,
  praiseEvent: {
    emoji: '🎉',
    title: '축하해요!',
    description: '항목을 완료했어요.',
  },
  setPraiseEvent: vi.fn(),
  toggleItem: vi.fn(),
  addCustomItem: vi.fn(),
  deleteItem: vi.fn(),
  updateNotes: vi.fn(),
  updateWeddingDate: vi.fn(),
  hasWeddingDate: true,
  weddingDate: '2027-01-01',
};

vi.mock('@/hooks/useChecklist', () => ({
  useChecklist: () => checklistMock,
}));

beforeEach(() => {
  sessionStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
  __resetNoticeSlot();
});

describe('Checklist — PraiseModal 전역 모달 코디네이터 편입', () => {
  it('T1 슬롯을 다른 알림이 점유 중이면 축하 모달은 지연(상호배제) — 다이얼로그 미표시', async () => {
    // 더 이른(선점) 알림이 슬롯을 점유: 우선순위와 무관하게 이미 holder 면 신규 요청은 대기.
    const occupier = renderHook(() => useNoticeSlot('occupier', true, 9));
    expect(occupier.result.current).toBe(true);
    expect(currentNoticeHolder()).toBe('occupier');

    const Checklist = (await import('@/pages/Checklist')).default;
    renderWithProviders(<Checklist />, { route: '/checklist' });

    // praiseEvent 는 non-null 이라 PraiseModal 은 마운트되지만, 슬롯 미점유 → Dialog open=false.
    // Radix Dialog 는 닫힘 시 내용을 렌더하지 않으므로 제목이 문서에 없어야 한다.
    expect(screen.queryByText('축하해요!')).not.toBeInTheDocument();
    // 슬롯 점유자는 여전히 occupier (축하 모달이 뺏지 않음).
    expect(currentNoticeHolder()).toBe('occupier');

    occupier.unmount();
  });

  it('T2 슬롯이 비어 있으면 축하 모달이 즉시 슬롯을 점유하고 표시', async () => {
    expect(currentNoticeHolder()).toBeNull();

    const Checklist = (await import('@/pages/Checklist')).default;
    renderWithProviders(<Checklist />, { route: '/checklist' });

    // 경쟁자 없음 → priority 4 축하 모달이 슬롯을 승계·표시.
    expect(currentNoticeHolder()).toBe('praise-modal');
    expect(screen.getByText('축하해요!')).toBeInTheDocument();
  });

  it('T3 점유자 해제 후 대기 중이던 축하 모달이 슬롯을 승계(핸드오프)', async () => {
    const occupier = renderHook(() => useNoticeSlot('occupier', true, 9));
    expect(currentNoticeHolder()).toBe('occupier');

    const Checklist = (await import('@/pages/Checklist')).default;
    renderWithProviders(<Checklist />, { route: '/checklist' });

    // 대기 상태(다이얼로그 미표시)
    expect(screen.queryByText('축하해요!')).not.toBeInTheDocument();

    // 선점 알림이 닫히면(want=false) 슬롯 해제 → setup 의 handoff delay 0(동기)으로 즉시 승계
    act(() => occupier.unmount());

    expect(currentNoticeHolder()).toBe('praise-modal');
    expect(screen.getByText('축하해요!')).toBeInTheDocument();
  });
});

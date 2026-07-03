// [CL-SEC-AUDIT-20260703-101500] #1+#3 perf — Checklist 페이지 파생 배열 참조 안정성 통합 계약
//   재현: 페이지 내부 state 변경으로 리렌더가 일어나도(items 불변), 각 기간 섹션에 전달되는
//   items 참조가 안정되어 groupItemsByCategory 가 재호출되지 않음을 입증한다.
//   수정 전: 렌더 본문의 items.filter(...) 가 매 렌더 새 배열 → 하위 memo 상시 캐시 미스.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
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

// ── 순수 함수 spy: 실제 구현 유지하며 호출 카운트 계측 ──
const treeSpies = vi.hoisted(() => ({ groupItemsByCategory: vi.fn() }));
vi.mock('@/lib/checklist-tree', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/checklist-tree')>();
  treeSpies.groupItemsByCategory.mockImplementation(actual.groupItemsByCategory);
  return { ...actual, groupItemsByCategory: treeSpies.groupItemsByCategory };
});

// useChecklist mock — 안정 참조 items 를 반환(모듈 스코프에 고정)
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

// 안정 참조: 매 렌더 동일 배열을 돌려줘 memo 효과만 격리 측정
const STABLE_ITEMS: ChecklistItem[] = [
  makeItem('item-a', { period: 'D-12~10m', due_date: daysFromNow(-3), sort_order: 1 }),
  makeItem('item-b', { period: 'D-12~10m', due_date: daysFromNow(60), sort_order: 2 }),
  makeItem('item-c', { period: 'D-10~8m', due_date: daysFromNow(3), sort_order: 1 }),
];

const checklistMock = {
  items: STABLE_ITEMS,
  loading: false,
  stats: { total: 3, completed: 0, percentage: 50, byPeriod: {} },
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

vi.mock('@/hooks/useChecklist', () => ({
  useChecklist: () => checklistMock,
}));

beforeEach(() => {
  sessionStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
  treeSpies.groupItemsByCategory.mockClear();
});

describe('Checklist 페이지 — 파생 배열 참조 안정성(#1+#3 perf)', () => {
  it('T1 페이지 리렌더(내부 state 변경)에도 groupItemsByCategory 재호출 0 (items 참조 안정)', async () => {
    const Checklist = (await import('@/pages/Checklist')).default;
    renderWithProviders(<Checklist />, { route: '/checklist' });

    // 초기 렌더 후 호출 수 기록(기간 섹션당 1회 = 2회 기대)
    const baseline = treeSpies.groupItemsByCategory.mock.calls.length;
    expect(baseline).toBeGreaterThan(0);

    // 페이지 내부 state 변경으로 리렌더 유발 — items 는 불변(STABLE_ITEMS)
    // '긴급순 보기' 토글은 urgencySort state 만 바꿔 페이지 전체 리렌더
    const toggle = screen.getByRole('button', { name: '긴급순 보기' });
    fireEvent.click(toggle);
    fireEvent.click(toggle);

    // items 참조가 memo 로 안정 → 각 섹션의 groupItemsByCategory 는 재실행되지 않음
    expect(treeSpies.groupItemsByCategory.mock.calls.length).toBe(baseline);
  });

  it('T2 기존 시맨틱 보존 — 두 기간 섹션 모두 정상 렌더(빈 기간 제외·순서 유지)', async () => {
    const Checklist = (await import('@/pages/Checklist')).default;
    renderWithProviders(<Checklist />, { route: '/checklist' });

    // D-12~10m, D-10~8m 두 기간만 존재 → 헤더 2개
    expect(
      screen.getByRole('button', { name: /12~10개월 전 체크리스트/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /10~8개월 전 체크리스트/ }),
    ).toBeInTheDocument();

    // 앵커 id 존재(스크롤 타깃 시맨틱 유지)
    expect(document.getElementById('checklist-period-D-12~10m')).not.toBeNull();
    expect(document.getElementById('checklist-period-D-10~8m')).not.toBeNull();
  });
});

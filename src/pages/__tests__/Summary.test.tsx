/** [CL-QA100-BTN-20260531] 데이터 페이지 버튼 검증 — Summary 페이지 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, currentPath } from '@/test/test-utils';
import Summary from '../Summary';

// ── useSEO: no-op ──
vi.mock('@/hooks/useSEO', () => ({ useSEO: vi.fn() }));

// ── useToast: no-op ──
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

// ── useAuth ──
let mockAuth: any;
beforeEach(() => {
  mockAuth = {
    user: { id: 'u1', email: 't@t.com' } as any,
    loading: false,
    signOut: vi.fn(),
    signInWithGoogle: vi.fn(async () => ({ error: null })),
    signIn: vi.fn(async () => ({ error: null })),
    signUp: vi.fn(async () => ({ error: null })),
    session: null,
  };
});
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }: any) => children,
}));

// ── useMultipleBudgets: minimal valid shape ──
vi.mock('@/hooks/useMultipleBudgets', () => ({
  useMultipleBudgets: () => ({
    budgets: [{ id: 'b1', name: '옵션 1' }],
    activeBudgetId: 'b1',
    setActiveBudgetId: vi.fn(),
    items: [],
    loading: false,
    getTotal: () => 0,
    getBudgetsForComparison: () => [{ id: 'b1', name: '옵션 1', items: [] }],
    createNewBudget: vi.fn(),
    copyBudget: vi.fn(),
    renameBudget: vi.fn(),
    deleteBudget: vi.fn(),
    updateAmount: vi.fn(),
    togglePaid: vi.fn(),
    updateNotes: vi.fn(),
    renameItem: vi.fn(),
    updateCostSplit: vi.fn(),
    addCustomItem: vi.fn(),
    deleteCustomItem: vi.fn(),
    deleteItem: vi.fn(),
    snapshots: [],
    createSnapshot: vi.fn(),
    resetBudget: vi.fn(),
    restoreFromSnapshot: vi.fn(),
    deleteSnapshot: vi.fn(),
    isFullBackupData: vi.fn(),
    undoLastRestore: vi.fn(),
    isRestoring: false,
    restoreProgress: 0,
    canUndoRestore: false,
    refetch: vi.fn(),
  }),
}));

// ── useNegotiateCoach ──
vi.mock('@/hooks/useNegotiateCoach', () => ({
  useNegotiateCoach: () => ({
    result: null,
    loading: false,
    error: null,
    askCoach: vi.fn(),
  }),
}));

// ── NegotiationTips: stub (avoids Sheet/Radix side-effects) ──
vi.mock('@/components/planning/NegotiationTips', () => ({
  NegotiationTips: () => null,
}));

// ── LogoutButton: stub ──
vi.mock('@/components/LogoutButton', () => ({
  LogoutButton: () => <button>로그아웃</button>,
}));

// ── BudgetDonutChart: stub ──
vi.mock('@/components/BudgetDonutChart', () => ({
  BudgetDonutChart: () => <div data-testid="donut-chart" />,
}));

// ── download-image: stub ──
vi.mock('@/lib/download-image', () => ({
  downloadImage: vi.fn(async () => 'downloaded'),
}));

// ── recharts: stub ResponsiveContainer + BarChart (use ResizeObserver, unavailable in jsdom) ──
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    BarChart: ({ children }: any) => <svg data-testid="bar-chart">{children}</svg>,
    Bar: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Cell: () => null,
    Tooltip: () => null,
  };
});

describe('Summary — 버튼 / 네비게이션', () => {
  it('SM1: 뒤로가기 버튼 클릭 → "/" 로 이동', () => {
    renderWithProviders(<Summary />, { route: '/summary' });
    // The header ArrowLeft back button is the first icon-button
    const iconButtons = screen.getAllByRole('button');
    fireEvent.click(iconButtons[0]);
    expect(currentPath()).toBe('/');
  });

  it('SM2: "전체 비교" 버튼과 "개별 보기" 버튼 모두 화면에 존재한다', () => {
    renderWithProviders(<Summary />, { route: '/summary' });
    expect(screen.getByRole('button', { name: '전체 비교' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '개별 보기' })).toBeInTheDocument();
  });

  it('SM3: "개별 보기" 버튼 클릭 → 해당 버튼이 default variant(활성) 로 전환된다', () => {
    renderWithProviders(<Summary />, { route: '/summary' });
    const individualBtn = screen.getByRole('button', { name: '개별 보기' });
    fireEvent.click(individualBtn);
    // After click, "개별 보기" should have the 'default' variant class applied by shadcn
    // shadcn Button with variant="default" gets bg-primary class whereas ghost gets bg-transparent
    // We check class contains 'bg-primary' (default) as a proxy for active state
    expect(individualBtn.className).toMatch(/bg-primary|text-primary-foreground/);
  });

  it('SM4: "전체 비교" 버튼 클릭 → 전체 비교 뷰가 렌더된다 (옵션 1 텍스트 존재)', () => {
    renderWithProviders(<Summary />, { route: '/summary' });
    // Navigate to individual first, then back to comparison
    fireEvent.click(screen.getByRole('button', { name: '개별 보기' }));
    fireEvent.click(screen.getByRole('button', { name: '전체 비교' }));
    // In comparison view, budget name "옵션 1" appears in the summary card
    expect(screen.getAllByText('옵션 1').length).toBeGreaterThan(0);
  });
});

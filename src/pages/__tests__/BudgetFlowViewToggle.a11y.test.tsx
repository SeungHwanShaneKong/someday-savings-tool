// [CL-BTNAUDIT3-20260704 | 뷰토글 aria-pressed] 표/비교 세그먼트 토글이 활성상태를
//  시각 대비뿐 아니라 aria-pressed 로도 스크린리더에 전달하는지 검증(접근성 회귀 가드).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import BudgetFlow from '../BudgetFlow';

vi.mock('@/hooks/useSEO', () => ({ useSEO: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 't@t.com' }, loading: false }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/useRealtimeBudget', () => ({ useRealtimeBudget: vi.fn() }));

const h = vi.hoisted(() => ({
  budgets: [] as Array<{ id: string; name: string; user_id: string; isShared: boolean; updated_at: string }>,
}));

vi.mock('@/hooks/useMultipleBudgets', () => ({
  useMultipleBudgets: () => ({
    budgets: h.budgets,
    activeBudgetId: h.budgets[0]?.id ?? null,
    setActiveBudgetId: vi.fn(),
    items: [],
    loading: false,
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
    getTotal: () => 0,
    getBudgetsForComparison: () => [],
    realtimeApplier: {
      getLocal: () => undefined,
      pending: new Map(),
      knownUpdatedAt: new Map(),
      editingColumns: () => new Set<string>(),
      onUpsert: vi.fn(),
      onDelete: vi.fn(),
      setKnownUpdatedAt: vi.fn(),
    },
    snapshots: [],
    resetBudget: vi.fn(),
    restoreFromSnapshot: vi.fn(),
    deleteSnapshot: vi.fn(),
    isFullBackupData: vi.fn(),
    undoLastRestore: vi.fn(),
    isRestoring: false,
    restoreProgress: 0,
    canUndoRestore: false,
  }),
}));

const personal = (id: string, name: string) => ({ id, name, user_id: 'u1', isShared: false, updated_at: '2026-06-20T00:00:00Z' });

beforeEach(() => {
  try { localStorage.clear(); } catch { /* noop */ }
  h.budgets = [personal('p1', '개인옵션')];
});

describe('BudgetFlow 뷰 토글 접근성(aria-pressed)', () => {
  it('기본(표) 상태: 표=pressed, 비교=not pressed', () => {
    renderWithProviders(<BudgetFlow />, { route: '/budget' });
    expect(screen.getByRole('button', { name: '표' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '비교' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('비교 클릭 후: 비교=pressed, 표=not pressed (상태 반영)', () => {
    renderWithProviders(<BudgetFlow />, { route: '/budget' });
    fireEvent.click(screen.getByRole('button', { name: '비교' }));
    expect(screen.getByRole('button', { name: '비교' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '표' })).toHaveAttribute('aria-pressed', 'false');
  });
});

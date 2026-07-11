// [CL-POKE-VIS-20260711-173901] BudgetFlow 헤더 '콕 찌르기'(compact) 가시성 스모크 —
//   표 뷰·비교 뷰 전환에도 헤더 컨트롤 라인의 버튼이 존속하는지(상시 노출 계약).
//   모킹 셋업은 BudgetFlowViewToggle.a11y.test.tsx 패턴 복제(경량 별도 파일).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, within, waitFor } from '@/test/test-utils';
import { supabase } from '@/integrations/supabase/client';
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
    editSignal: 0,
    saveState: 'idle',
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
  // 전역 파트너 존재(get_my_partner) — 그 외 RPC 는 빈 결과(참여자 목록 등)
  vi.mocked(supabase.rpc).mockReset();
  vi.mocked(supabase.rpc).mockImplementation((async (fn: string) => {
    if (fn === 'get_my_partner') {
      return { data: [{ user_id: 'p-1', display_name: '민지', email: null }], error: null };
    }
    return { data: [], error: null };
  }) as never);
});

describe('BudgetFlow 헤더 콕 찌르기(compact) 가시성', () => {
  it('BF.1 파트너 존재 → 헤더 컨트롤 라인에 콕 찌르기 버튼 렌더', async () => {
    renderWithProviders(<BudgetFlow />, { route: '/budget' });
    const header = screen.getByRole('banner');
    await waitFor(() =>
      expect(within(header).getByRole('button', { name: '파트너 민지님에게 콕 찌르기' })).toBeInTheDocument(),
    );
  });

  it('BF.2 비교 뷰 전환 후에도 헤더 버튼 존속(상시 노출)', async () => {
    renderWithProviders(<BudgetFlow />, { route: '/budget' });
    const header = screen.getByRole('banner');
    await waitFor(() =>
      expect(within(header).getByRole('button', { name: '파트너 민지님에게 콕 찌르기' })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: '비교' }));
    expect(screen.getByRole('button', { name: '비교' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(header).getByRole('button', { name: '파트너 민지님에게 콕 찌르기' })).toBeInTheDocument();
  });

  it('BF.3 파트너 없음 → 헤더 버튼 미렌더(자체 null·헤더 무변화)', async () => {
    vi.mocked(supabase.rpc).mockReset();
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as never);
    renderWithProviders(<BudgetFlow />, { route: '/budget' });
    const header = screen.getByRole('banner');
    await Promise.resolve();
    expect(within(header).queryByRole('button', { name: /콕 찌르기/ })).toBeNull();
  });
});

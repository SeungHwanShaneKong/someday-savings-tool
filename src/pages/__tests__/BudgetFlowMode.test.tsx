// [CL-COEDIT-E2E-20260620-130000] BudgetFlow 개인/우리 모드 UX 통합 — 분리·누수 0 (M1/M2/M4)
// 모드 필터 순수로직은 workspace(8테스트)에서, 여기선 BudgetFlow 배선(visibleBudgets·토글·빈상태)을 검증.
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
// 실시간 구독은 모드-UX 검증과 무관 → no-op 격리
vi.mock('@/hooks/useRealtimeBudget', () => ({ useRealtimeBudget: vi.fn() }));

// 제어형 예산 목록 (per-test 변경)
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
const shared = (id: string, name: string) => ({ id, name, user_id: 'u1', isShared: true, updated_at: '2026-06-20T00:00:01Z' });

beforeEach(() => {
  try { localStorage.clear(); } catch { /* noop */ }
  h.budgets = [personal('p1', '개인옵션'), shared('s1', '우리옵션')];
});

describe('BudgetFlow 개인/우리 모드 분리', () => {
  it('M1 개인 모드(기본): 개인 예산만 표시, 공유 예산 누수 0', () => {
    renderWithProviders(<BudgetFlow />, { route: '/budget' });
    expect(screen.getByText('개인옵션')).toBeInTheDocument();
    expect(screen.queryByText('우리옵션')).toBeNull(); // 공유 예산 비노출 = 누수 0
  });

  it('M2 우리 모드 전환: 공유 예산만 표시, 개인 예산 비노출', () => {
    renderWithProviders(<BudgetFlow />, { route: '/budget' });
    fireEvent.click(screen.getByRole('button', { name: '우리' }));
    expect(screen.getByText('우리옵션')).toBeInTheDocument();
    expect(screen.queryByText('개인옵션')).toBeNull();
  });

  it('M4 우리 모드인데 공유 예산이 없음 → 빈 상태 초대 CTA', () => {
    h.budgets = [personal('p1', '개인옵션'), personal('p2', '개인옵션2')]; // 공유 0
    renderWithProviders(<BudgetFlow />, { route: '/budget' });
    fireEvent.click(screen.getByRole('button', { name: '우리' }));
    expect(screen.getByText('아직 공동 예산이 없어요')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /개인 예산으로 가기/ })).toBeInTheDocument();
  });

  it('M3 모드 왕복(개인→우리→개인): 각 모드 데이터가 서로 누수 없이 복귀', () => {
    renderWithProviders(<BudgetFlow />, { route: '/budget' });
    // 개인
    expect(screen.getByText('개인옵션')).toBeInTheDocument();
    // → 우리
    fireEvent.click(screen.getByRole('button', { name: '우리' }));
    expect(screen.getByText('우리옵션')).toBeInTheDocument();
    expect(screen.queryByText('개인옵션')).toBeNull();
    // → 다시 개인
    fireEvent.click(screen.getByRole('button', { name: '개인' }));
    expect(screen.getByText('개인옵션')).toBeInTheDocument();
    expect(screen.queryByText('우리옵션')).toBeNull();
  });

  // [CL-COEDIT-INVITE-DISCOVER-20260620] 발견성 개선: 우리 빈 화면의 '파트너 초대하기' 바로가기
  it('M5 우리 빈 상태 → "파트너 초대하기" 버튼: 클릭 시 개인 모드 전환(빈 상태 해소)', () => {
    h.budgets = [personal('p1', '개인옵션'), personal('p2', '개인옵션2')]; // 공유 0
    renderWithProviders(<BudgetFlow />, { route: '/budget' });
    fireEvent.click(screen.getByRole('button', { name: '우리' }));
    // 빈 상태에 초대 바로가기 노출
    const shortcut = screen.getByRole('button', { name: /파트너 초대하기/ });
    expect(shortcut).toBeInTheDocument();
    // 클릭 → 개인 전환 → 개인 예산 노출 + 빈 상태 사라짐
    fireEvent.click(shortcut);
    expect(screen.getByText('개인옵션')).toBeInTheDocument();
    expect(screen.queryByText('아직 공동 예산이 없어요')).toBeNull();
  });
});

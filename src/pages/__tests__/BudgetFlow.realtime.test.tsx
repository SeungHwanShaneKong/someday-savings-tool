// [CL-COEDIT-QA200-20260620] BudgetFlow 실시간 구독 배선 — useRealtimeBudget(budgetId) 가
// 모드/활성예산에 따라 정확히 호출/해제되는지 검증(개인=null, 우리=활성 공유 예산 id).
// 모드 필터 순수로직(workspace 8테스트)·모드 UX(BudgetFlowMode 4테스트)와 중복 회피:
// 여기선 오직 useRealtimeBudget 가 받는 budgetId 인자의 변화(구독 토글·active 보정·급속토글)를 단언.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useReducer } from 'react';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import { useRealtimeBudget } from '@/hooks/useRealtimeBudget';
import BudgetFlow from '../BudgetFlow';

vi.mock('@/hooks/useSEO', () => ({ useSEO: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 't@t.com' }, loading: false }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));

// useRealtimeBudget 를 spy 로 대체 — 호출 인자(budgetId, applier)를 캡처.
vi.mock('@/hooks/useRealtimeBudget', () => ({ useRealtimeBudget: vi.fn() }));

// 제어형 예산 상태 + 반응형 activeBudgetId.
// setActiveBudgetId 는 홀더를 변경하고 등록된 forceRender 로 재렌더를 유발해
// BudgetFlow 의 active 보정 useEffect 가 realtimeBudgetId 까지 전파되게 한다.
type Budget = { id: string; name: string; user_id: string; isShared: boolean; updated_at: string };
const h = vi.hoisted(() => ({
  budgets: [] as Budget[],
  activeBudgetId: null as string | null,
  forceRender: null as null | (() => void),
  setActiveBudgetId: vi.fn((id: string | null) => {
    h.activeBudgetId = id;
    h.forceRender?.();
  }),
  applier: {
    getLocal: () => undefined,
    pending: new Map(),
    knownUpdatedAt: new Map(),
    editingColumns: () => new Set<string>(),
    onUpsert: vi.fn(),
    onDelete: vi.fn(),
    setKnownUpdatedAt: vi.fn(),
  },
}));

vi.mock('@/hooks/useMultipleBudgets', () => ({
  useMultipleBudgets: () => {
    // 모킹 훅 자신이 forceUpdate 를 소유해 홀더 변경 시 BudgetFlow 가 재렌더되도록 등록.
    const [, force] = useReducer((x: number) => x + 1, 0);
    h.forceRender = force;
    return {
      budgets: h.budgets,
      activeBudgetId: h.activeBudgetId,
      setActiveBudgetId: h.setActiveBudgetId,
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
      realtimeApplier: h.applier,
      snapshots: [],
      resetBudget: vi.fn(),
      restoreFromSnapshot: vi.fn(),
      deleteSnapshot: vi.fn(),
      isFullBackupData: vi.fn(),
      undoLastRestore: vi.fn(),
      isRestoring: false,
      restoreProgress: 0,
      canUndoRestore: false,
    };
  },
}));

const personal = (id: string, name: string): Budget => ({
  id, name, user_id: 'u1', isShared: false, updated_at: '2026-06-20T00:00:00Z',
});
const shared = (id: string, name: string): Budget => ({
  id, name, user_id: 'u1', isShared: true, updated_at: '2026-06-20T00:00:01Z',
});

/** useRealtimeBudget 가 가장 최근 받은 budgetId(첫 인자). */
function lastBudgetId(): string | null | undefined {
  const calls = vi.mocked(useRealtimeBudget).mock.calls;
  return calls.length ? (calls[calls.length - 1][0] as string | null) : undefined;
}
/** useRealtimeBudget 가 받은 모든 budgetId 시퀀스(중복/토글 추적용). */
function budgetIdSequence(): Array<string | null> {
  return vi.mocked(useRealtimeBudget).mock.calls.map((c) => c[0] as string | null);
}

beforeEach(() => {
  try { localStorage.clear(); } catch { /* noop */ }
  vi.mocked(useRealtimeBudget).mockClear();
  h.setActiveBudgetId.mockClear();
  h.applier.onUpsert.mockClear();
  h.applier.onDelete.mockClear();
  h.forceRender = null;
  // 기본: 개인 1 + 공유 1, 활성=개인.
  h.budgets = [personal('p1', '개인옵션'), shared('s1', '우리옵션')];
  h.activeBudgetId = 'p1';
});

describe('BudgetFlow 실시간 구독 배선(useRealtimeBudget budgetId)', () => {
  it('I38 개인 모드(기본)에서는 budgetId=null 로 구독하지 않는다', () => {
    renderWithProviders(<BudgetFlow />, { route: '/budget' });
    // 개인 모드 → realtimeBudgetId = null (구독 안 함, 개인 예산 비동기화)
    expect(lastBudgetId()).toBeNull();
  });

  it('I38 우리 모드 전환 시 활성 공유 예산 id 로 구독한다(null→s1)', () => {
    renderWithProviders(<BudgetFlow />, { route: '/budget' });
    expect(lastBudgetId()).toBeNull();
    // '우리' 토글 → 보정 effect 가 활성예산을 s1(유일 공유)로 옮기고 구독 id 가 s1 이 됨
    fireEvent.click(screen.getByRole('button', { name: '우리' }));
    expect(lastBudgetId()).toBe('s1');
  });

  it('I39 우리→개인 복귀 시 다시 budgetId=null 로 구독 해제된다', () => {
    renderWithProviders(<BudgetFlow />, { route: '/budget' });
    fireEvent.click(screen.getByRole('button', { name: '우리' }));
    expect(lastBudgetId()).toBe('s1');
    // 개인 모드 복귀 → 구독 id 다시 null (우리 모드에서만 실시간)
    fireEvent.click(screen.getByRole('button', { name: '개인' }));
    expect(lastBudgetId()).toBeNull();
  });

  it('I40 우리 모드에서 활성 공유 예산 삭제 시 visibleBudgets[0] 로 보정되어 구독 id 가 따라간다', () => {
    // 공유 2개, 활성=s1. 우리 모드에서 s1 을 제거하면 보정 effect 가 s2 로 옮겨야 함.
    h.budgets = [personal('p1', '개인'), shared('s1', '우리A'), shared('s2', '우리B')];
    h.activeBudgetId = 's1';
    const { rerender } = renderWithProviders(<BudgetFlow />, { route: '/budget' });
    fireEvent.click(screen.getByRole('button', { name: '우리' }));
    expect(lastBudgetId()).toBe('s1');
    // 활성 공유 예산 s1 삭제 → 남은 공유는 s2
    h.budgets = [personal('p1', '개인'), shared('s2', '우리B')];
    rerender(<BudgetFlow />);
    // 보정 effect: activeBudgetId(s1) 가 visibleBudgets 에 없음 → visibleBudgets[0]=s2
    expect(h.setActiveBudgetId).toHaveBeenCalledWith('s2');
    expect(lastBudgetId()).toBe('s2');
  });

  it('I40 우리 모드에서 마지막 공유 예산까지 삭제되면 구독 id 가 null 로 보정된다', () => {
    h.budgets = [personal('p1', '개인'), shared('s1', '우리A')];
    h.activeBudgetId = 's1';
    const { rerender } = renderWithProviders(<BudgetFlow />, { route: '/budget' });
    fireEvent.click(screen.getByRole('button', { name: '우리' }));
    expect(lastBudgetId()).toBe('s1');
    // 유일 공유 예산 삭제 → 공유 0 → visibleBudgets[0]?.id ?? null = null
    h.budgets = [personal('p1', '개인')];
    rerender(<BudgetFlow />);
    expect(h.setActiveBudgetId).toHaveBeenCalledWith(null);
    expect(lastBudgetId()).toBeNull();
  });

  it('I43 개인 예산이 하나도 없어도(빈 개인) 개인 모드 구독 id 는 null 로 안전하다', () => {
    // 공유만 존재, 개인 0. 개인 모드(기본)에서 visibleBudgets=[] → active 보정 null, 구독 null.
    h.budgets = [shared('s1', '우리옵션')];
    h.activeBudgetId = null;
    renderWithProviders(<BudgetFlow />, { route: '/budget' });
    expect(lastBudgetId()).toBeNull();
    // 보정 effect: activeBudgetId 가 null(=visible 밖)이라 setActiveBudgetId(visibleBudgets[0]?.id ?? null)=null 로
    // 안전 보정. 어떤 비-null 예산 id 로도 보정되지 않아야 함(개인 0 → 구독 대상 없음).
    for (const call of h.setActiveBudgetId.mock.calls) {
      expect(call[0]).toBeNull();
    }
  });

  it('I44 우리 모드 구독 시 컴포넌트의 realtimeApplier(동일 참조) 를 두 번째 인자로 전달한다', () => {
    renderWithProviders(<BudgetFlow />, { route: '/budget' });
    fireEvent.click(screen.getByRole('button', { name: '우리' }));
    expect(lastBudgetId()).toBe('s1');
    const calls = vi.mocked(useRealtimeBudget).mock.calls;
    const applierArg = calls[calls.length - 1][1];
    // applier 는 useMultipleBudgets.realtimeApplier 와 동일 참조여야 함(머지 콜백 배선)
    expect(applierArg).toBe(h.applier);
    expect(applierArg).toHaveProperty('onUpsert');
    expect(applierArg).toHaveProperty('onDelete');
  });

  it('I44 개인 모드(budgetId=null)에서도 applier 는 항상 전달된다(훅 호출 자체는 무조건)', () => {
    renderWithProviders(<BudgetFlow />, { route: '/budget' });
    const calls = vi.mocked(useRealtimeBudget).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    // 첫 호출(개인 모드)도 budgetId=null + applier 동봉
    expect(calls[0][0]).toBeNull();
    expect(calls[0][1]).toBe(h.applier);
  });

  it('I45 급속 토글(개인→우리→개인→우리) 시 마지막 budgetId 와 모드가 일관되게 수렴한다', () => {
    renderWithProviders(<BudgetFlow />, { route: '/budget' });
    const btnUri = () => screen.getByRole('button', { name: '우리' });
    const btnPer = () => screen.getByRole('button', { name: '개인' });
    fireEvent.click(btnUri());
    fireEvent.click(btnPer());
    fireEvent.click(btnUri());
    // 급속 토글 후에도 최종 모드(우리)의 활성 공유 예산 s1 로 수렴
    expect(lastBudgetId()).toBe('s1');
    // 시퀀스에 비-null(s1)과 null(개인)이 모두 나타나며 마지막은 s1
    const seq = budgetIdSequence();
    expect(seq).toContain('s1');
    expect(seq).toContain(null);
    expect(seq[seq.length - 1]).toBe('s1');
  });

  it('I45 우리 모드에서 다른 공유 예산 탭 클릭 시 구독 id 가 그 예산으로 전환된다', () => {
    h.budgets = [shared('s1', '우리A'), shared('s2', '우리B')];
    h.activeBudgetId = 's1';
    renderWithProviders(<BudgetFlow />, { route: '/budget' });
    fireEvent.click(screen.getByRole('button', { name: '우리' }));
    expect(lastBudgetId()).toBe('s1');
    // 탭 영역에서 '우리B' 예산 탭 클릭 → setActiveBudgetId('s2') → 구독 id 전환
    const tabB = screen.getByText('우리B');
    fireEvent.click(tabB);
    expect(h.setActiveBudgetId).toHaveBeenCalledWith('s2');
    expect(lastBudgetId()).toBe('s2');
  });

  it('I39 모드는 우리지만 활성예산이 개인(필터밖)인 과도기에는 구독 id 가 개인 id 로 새지 않는다', () => {
    // realtimeBudgetId = mode==='shared' ? (activeBudget?.id ?? null) : null.
    // activeBudget 은 visibleBudgets(공유)에서만 find → 개인 활성예산은 활성으로 잡히지 않아 누수 0.
    h.budgets = [personal('p1', '개인옵션'), shared('s1', '우리옵션')];
    h.activeBudgetId = 'p1'; // 개인이 활성인 상태에서 우리 모드로
    renderWithProviders(<BudgetFlow />, { route: '/budget' });
    fireEvent.click(screen.getByRole('button', { name: '우리' }));
    // 어떤 렌더에서도 개인 예산 id('p1')로 구독한 적이 절대 없어야 함(개인↔공동 분리)
    expect(budgetIdSequence()).not.toContain('p1');
    // 보정 후 최종은 공유 s1
    expect(lastBudgetId()).toBe('s1');
  });

  it('I44 우리 모드에서 활성 예산 헤더에 협업 관리(CollaboratorManager)가 렌더된다', () => {
    renderWithProviders(<BudgetFlow />, { route: '/budget' });
    fireEvent.click(screen.getByRole('button', { name: '우리' }));
    // 우리 모드 + 활성 공유 예산(s1) → 협업 관리 UI 노출(빈 상태 아님)
    expect(screen.queryByText('아직 공동 예산이 없어요')).toBeNull();
    expect(screen.getByText('우리옵션')).toBeInTheDocument();
    // 구독도 s1 로 활성
    expect(lastBudgetId()).toBe('s1');
  });
});

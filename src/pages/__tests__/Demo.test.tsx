// [CL-TOP20-P1-DEMO-20260703-010000] /demo 게스트 체험 페이지 — 렌더·상호작용·전환 계측 검증
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { renderWithProviders, screen, fireEvent, within, currentPath } from '@/test/test-utils';
import Demo from '../Demo';
import { createDemoBudgetItems, getDemoTotal, DEMO_STORAGE_KEY } from '@/lib/demo-budget';
import { BUDGET_CATEGORIES } from '@/lib/budget-categories';
import { setCategoryOrderScopeOverride, useCategoryOrder } from '@/hooks/useCategoryOrder';

// [CL-SEC-AUDIT-20260703-101500] 취약점 #2 [데이터 경계] — 실사용자 카테고리 순서 키
const REAL_CATEGORY_ORDER_KEY = 'budget-category-order';
const DEMO_CATEGORY_ORDER_KEY = 'demo-category-order';

/* ─── funnel 계측 mock (hoisted) — 호출 인자·횟수를 직접 단언 ─── */
const funnel = vi.hoisted(() => ({
  trackFunnel: vi.fn(),
  trackFunnelOnce: vi.fn(),
}));
vi.mock('@/lib/analytics/funnel-events', () => ({
  trackFunnel: funnel.trackFunnel,
  trackFunnelOnce: funnel.trackFunnelOnce,
}));

/* ─── useSEO mock (jsdom document head 변조 회피 — Landing.test 컨벤션) ─── */
vi.mock('@/hooks/useSEO', () => ({ useSEO: () => {} }));

/* ─── use-mobile mock (AverageCostTooltip 데스크톱 경로 결정화 — BudgetTable.buffer.test 컨벤션) ─── */
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear(); // 데모 영속 격리
  localStorage.clear(); // useCategoryOrder 순서 격리(원본 카테고리 순서 결정화)
});

const renderDemo = () => renderWithProviders(<Demo />, { route: '/demo' });

const defaultItems = createDemoBudgetItems();
const defaultTotal = getDemoTotal(defaultItems);

/** '대관료' 항목의 테이블 행 스코핑(Footer 등 외부 동명 텍스트 회피) */
const venueRow = (): HTMLElement => {
  const tr = screen.getByText('대관료').closest('tr');
  if (!tr) throw new Error('대관료 행을 찾지 못함');
  return tr as HTMLElement;
};

describe('Demo — 게스트 체험 모드', () => {
  it('D1: 렌더 — 체험 배너·총액(스티키 바) 표시 + demo_start 계측', () => {
    renderDemo();
    // 상단 안내 배너
    expect(screen.getByText(/지금은 체험 모드예요/)).toBeInTheDocument();
    // 합계 스티키 바: 기본 샘플 총액(약 2억)
    expect(screen.getByTestId('demo-total')).toHaveTextContent(
      `₩${defaultTotal.toLocaleString()}`,
    );
    // 결제 완료율 표기
    expect(screen.getByText(/결제 완료 \d+\/\d+/)).toBeInTheDocument();
    // 진입 계측(세션 1회 API)
    expect(funnel.trackFunnelOnce).toHaveBeenCalledWith('demo_start');
  });

  it('D2: 금액 수정 → 합계 갱신 + sessionStorage 반영 + demo_interact 1회', () => {
    renderDemo();
    const row = venueRow();
    // 기본 대관료 20,000,000 → 편집 시작
    fireEvent.click(within(row).getByRole('button', { name: `₩${(20_000_000).toLocaleString()}` }));
    const input = within(row).getByPlaceholderText('금액 입력');
    fireEvent.change(input, { target: { value: '30000000' } });
    fireEvent.blur(input);

    const expected = defaultTotal - 20_000_000 + 30_000_000;
    expect(screen.getByTestId('demo-total')).toHaveTextContent(`₩${expected.toLocaleString()}`);
    // 영속: 수정분이 sessionStorage 에 저장됨
    expect(sessionStorage.getItem(DEMO_STORAGE_KEY)).toContain('30000000');
    // 첫 수정 계측 — demo_interact 정확히 1회
    const interactCalls = funnel.trackFunnelOnce.mock.calls.filter(
      (call) => call[0] === 'demo_interact',
    );
    expect(interactCalls).toHaveLength(1);
  });

  it('D3: 하단 CTA "내 예산 만들기" 클릭 → /auth 이동 + demo_convert_click(from) 계측', () => {
    renderDemo();
    fireEvent.click(screen.getByRole('button', { name: /내 예산 만들기/ }));
    expect(currentPath()).toBe('/auth');
    expect(funnel.trackFunnel).toHaveBeenCalledWith('demo_convert_click', { from: 'bottom_card' });
  });

  it('D4: 배너 CTA "무료 가입하고 저장하기" 클릭 → /auth 이동 + from=banner', () => {
    renderDemo();
    fireEvent.click(screen.getByRole('button', { name: /무료 가입하고 저장하기/ }));
    expect(currentPath()).toBe('/auth');
    expect(funnel.trackFunnel).toHaveBeenCalledWith('demo_convert_click', { from: 'banner' });
  });

  it('D5: 초기화 — 수정 후 확인 다이얼로그 승인 시 기본 샘플로 복원', () => {
    renderDemo();
    // 수정
    const row = venueRow();
    fireEvent.click(within(row).getByRole('button', { name: `₩${(20_000_000).toLocaleString()}` }));
    const input = within(row).getByPlaceholderText('금액 입력');
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.blur(input);
    expect(screen.getByTestId('demo-total')).not.toHaveTextContent(
      `₩${defaultTotal.toLocaleString()}`,
    );
    // 초기화(파괴적 작업 → 확인 다이얼로그 경유)
    fireEvent.click(screen.getByRole('button', { name: '샘플 예산 초기화' }));
    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));
    expect(screen.getByTestId('demo-total')).toHaveTextContent(
      `₩${defaultTotal.toLocaleString()}`,
    );
    // 초기화 직후 영속 effect 가 기본 샘플을 재저장 → 저장분 = 기본 샘플
    expect(JSON.parse(sessionStorage.getItem(DEMO_STORAGE_KEY) ?? 'null')).toEqual(defaultItems);
  });

  it('D6: 손상된 sessionStorage 로 진입해도 기본 샘플로 정상 렌더(무크래시)', () => {
    sessionStorage.setItem(DEMO_STORAGE_KEY, '{corrupted!!');
    renderDemo();
    expect(screen.getByTestId('demo-total')).toHaveTextContent(
      `₩${defaultTotal.toLocaleString()}`,
    );
  });
});

/* ─── [CL-SEC-AUDIT-20260703-101500] 취약점 #2 [데이터 경계] 격리 검증 ─── */
describe('Demo — 실사용자 카테고리 순서 격리(취약점 #2 근본수정)', () => {
  // 카테고리 헤더들의 화면 등장 순서(인덱스) — BudgetTable 은 orderedCategories 순서로 렌더
  const renderedCategoryOrder = (): string[] => {
    const names = BUDGET_CATEGORIES.map((c) => c.name);
    const text = document.body.textContent ?? '';
    return names
      .map((name) => ({ name, at: text.indexOf(name) }))
      .filter((x) => x.at >= 0)
      .sort((a, b) => a.at - b.at)
      .map((x) => x.name);
  };

  it('SEC1: 실키에 재정렬 순서가 있어도 데모는 상속하지 않는다(원본 기본순서 렌더)', () => {
    // 실사용자가 첫 두 카테고리를 뒤집어 저장한 상태
    const ids = BUDGET_CATEGORIES.map((c) => c.id);
    [ids[0], ids[1]] = [ids[1], ids[0]];
    localStorage.setItem(REAL_CATEGORY_ORDER_KEY, JSON.stringify(ids));

    renderDemo();

    const order = renderedCategoryOrder();
    // 데모는 실키 상속 없이 원본 순서 → 첫 카테고리 = BUDGET_CATEGORIES[0]
    expect(order[0]).toBe(BUDGET_CATEGORIES[0].name);
    expect(order[1]).toBe(BUDGET_CATEGORIES[1].name);
  });

  it('SEC2: 데모 마운트 중 오버라이드=데모키, 언마운트 후 해제(실키 복귀)', () => {
    // 초기 오버라이드 없음 보장
    setCategoryOrderScopeOverride(null);
    const { unmount } = renderDemo();

    // 마운트 중: 데모 셸이 오버라이드를 데모 전용키로 설정 → BudgetTable 내부 no-arg 훅이 격리됨.
    // (오버라이드 활성 증거: reorder 가 실키가 아닌 데모키에만 쓰이는지는 훅 단위테스트에서 커버.
    //  여기선 데모가 실키를 절대 건드리지 않았음을 통합 레벨에서 단언.)
    expect(localStorage.getItem(REAL_CATEGORY_ORDER_KEY)).toBeNull();

    unmount();
    cleanup();

    // 언마운트 후 오버라이드 해제 → no-arg 훅(=실사용 /budget 경로)이 기본 실키로 복귀.
    // 실키에 스왑 순서를 심고, 새 no-arg 훅이 그 실키를 상속하면 override 누수 없음이 입증됨.
    const ids = BUDGET_CATEGORIES.map((c) => c.id);
    [ids[0], ids[1]] = [ids[1], ids[0]];
    localStorage.setItem(REAL_CATEGORY_ORDER_KEY, JSON.stringify(ids));
    const { result } = renderHook(() => useCategoryOrder());
    // 실키(스왑) 상속 = override 가 데모키로 남아있지 않음(누수 0)
    expect(result.current.orderedCategories[0].id).toBe(BUDGET_CATEGORIES[1].id);
    expect(result.current.orderedCategories[1].id).toBe(BUDGET_CATEGORIES[0].id);
    // 데모키는 이 흐름에서 생성되지 않음
    expect(localStorage.getItem(DEMO_CATEGORY_ORDER_KEY)).toBeNull();
  });
});

// [CL-TOP20-P3-HIDDEN-20260703-030000] BudgetTable — 숨은 비용 경고 배선(고스트 HiddenCostWarning 활성화) 검증.
//  계약: ① 룰 매칭 + 금액 입력(>0) 행에만 amber 트리거 노출 → 클릭 시 Popover 로 제목·설명·합계
//        ② 비대상/금액 0 은 미노출(노이즈 0) ③ 카테고리 헤더 셀에 "숨은 비용 N건" 집계 배지(N>0 시만, 룰 id 중복 제거)
//  하네스는 BudgetTable.buffer.test 패턴 재사용(rowFor 스코핑·use-mobile 데스크톱 고정).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, within } from '@/test/test-utils';
import { BudgetTable, type ExtendedBudgetItem } from '../BudgetTable';
import { BudgetTableMobile } from '../BudgetTableMobile';

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));

beforeEach(() => {
  try { localStorage.clear(); } catch { /* noop */ }
});

const baseItem = (over: Partial<ExtendedBudgetItem> = {}): ExtendedBudgetItem => ({
  id: 'it-venue',
  budget_id: 'b1',
  category: 'main-ceremony',
  sub_category: 'venue-fee',
  amount: 0,
  is_paid: false,
  notes: null,
  ...over,
});

const noop = vi.fn();
const renderTable = (items: ExtendedBudgetItem[]) =>
  renderWithProviders(
    <BudgetTable items={items} onAmountChange={noop} onTogglePaid={noop} onNotesChange={noop} />,
    { route: '/budget' },
  );

const rowFor = (displayName: string): HTMLElement => {
  const label = screen.getByText(displayName);
  const tr = label.closest('tr');
  if (!tr) throw new Error(`row not found for ${displayName}`);
  return tr as HTMLElement;
};

describe('BudgetTable 숨은 비용 경고 — 행 트리거', () => {
  it('H1 룰 매칭(대관료) + 금액>0 → 행 트리거 노출, 클릭 시 제목·설명·합계 Popover', () => {
    renderTable([baseItem({ amount: 5_000_000 })]);

    const trigger = within(rowFor('대관료')).getByRole('button', {
      name: '대관료 숨은 비용 1건 보기',
    });
    fireEvent.click(trigger);

    // Popover(portal) 내용 — venue-overtime 룰
    expect(screen.getByText('놓치기 쉬운 숨은 비용 1건')).toBeInTheDocument();
    expect(screen.getByText(/예식장 시간 초과 요금/)).toBeInTheDocument();
    expect(screen.getByText(/30분당 추가 요금/)).toBeInTheDocument(); // 상세 설명 병기
    expect(screen.getByText('+20만원')).toBeInTheDocument(); // 예상 추가 비용 합계
  });

  it('H2 룰 매칭이어도 금액 0 → 트리거·집계 배지 모두 미노출(룰 엔진 발동 조건 준수)', () => {
    renderTable([baseItem({ amount: 0 })]);
    expect(screen.queryByRole('button', { name: /숨은 비용/ })).toBeNull();
    expect(screen.queryByText(/숨은 비용 \d+건/)).toBeNull();
  });

  it('H3 비대상 항목(답례품 준비비, 룰 없음) + 금액>0 → 트리거·배지 미노출', () => {
    renderTable([
      baseItem({ id: 'it-gifts', sub_category: 'thank-you-gifts', amount: 1_000_000 }),
    ]);
    expect(screen.queryByRole('button', { name: /숨은 비용/ })).toBeNull();
    expect(screen.queryByText(/숨은 비용 \d+건/)).toBeNull();
  });
});

describe('BudgetTable 숨은 비용 — 카테고리 집계 배지', () => {
  it('H4 금액 입력된 3개 항목(대관료·식대비·본식 스냅) → 헤더 셀 "숨은 비용 3건"', () => {
    renderTable([
      baseItem({ id: 'it-venue', sub_category: 'venue-fee', amount: 5_000_000 }),
      baseItem({ id: 'it-meal', sub_category: 'meal-cost', amount: 14_000_000 }),
      baseItem({ id: 'it-snap', sub_category: 'main-snap', amount: 1_500_000 }),
    ]);
    // 집계 배지는 카테고리 rowSpan 셀(첫 행)에 렌더
    expect(within(rowFor('대관료')).getByText('숨은 비용 3건')).toBeInTheDocument();
  });

  it('H5 혼합 — 금액 입력된 항목의 룰만 집계(대관료 0·식대비>0 → 1건), 트리거도 해당 행만', () => {
    renderTable([
      baseItem({ id: 'it-venue', sub_category: 'venue-fee', amount: 0 }),
      baseItem({ id: 'it-meal', sub_category: 'meal-cost', amount: 14_000_000 }),
    ]);
    expect(within(rowFor('대관료')).getByText('숨은 비용 1건')).toBeInTheDocument();
    expect(
      within(rowFor('식대비')).getByRole('button', { name: '식대비 숨은 비용 1건 보기' }),
    ).toBeInTheDocument();
    expect(
      within(rowFor('대관료')).queryByRole('button', { name: /숨은 비용.*보기/ }),
    ).toBeNull();
  });

  it('H6 모바일(BudgetTableMobile) — 접힌 카테고리 헤더에도 집계 배지 노출', () => {
    renderWithProviders(
      <BudgetTableMobile
        items={[baseItem({ amount: 5_000_000 })]}
        onAmountChange={noop}
        onTogglePaid={noop}
        onNotesChange={noop}
      />,
      { route: '/budget' },
    );
    expect(screen.getByText('숨은 비용 1건')).toBeInTheDocument();
  });
});

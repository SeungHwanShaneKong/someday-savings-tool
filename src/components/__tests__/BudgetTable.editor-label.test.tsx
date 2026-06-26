// [CL-EDITLABEL-20260626] BudgetTable — 항목별 최근 편집자(나/파트너) 배지 렌더 계약 검증.
//  개선2: showEditorLabels(공동편집 모드) + last_edited_by → "최근: 나/파트너이름" 정적 배지.
//  단일 슬롯 상호배타: changedItemIds(transient)면 amber "이름 변경" 승격, 그 외엔 정적 "최근:" 배지.
//  prop 미전달(개인모드/레거시) → 배지 0(회귀 안전). 하네스는 BudgetTable.buffer.test 패턴 재사용.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, within, cleanup } from '@/test/test-utils';
import { BudgetTable, type ExtendedBudgetItem } from '../BudgetTable';

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
interface LabelProps {
  myUserId?: string | null;
  partnerName?: string | null;
  showEditorLabels?: boolean;
  changedItemIds?: Set<string>;
}
const renderTable = (items: ExtendedBudgetItem[], labelProps: LabelProps = {}) =>
  renderWithProviders(
    <BudgetTable
      items={items}
      onAmountChange={noop}
      onTogglePaid={noop}
      onNotesChange={noop}
      {...labelProps}
    />,
    { route: '/budget' },
  );

const rowFor = (displayName: string): HTMLElement => {
  const label = screen.getByText(displayName);
  const tr = label.closest('tr');
  if (!tr) throw new Error(`row not found for ${displayName}`);
  return tr as HTMLElement;
};

describe('BudgetTable 최근 편집자 배지', () => {
  it('내 편집(last_edited_by===myUserId) → "최근: 나"', () => {
    renderTable([baseItem({ last_edited_by: 'me' })], { myUserId: 'me', partnerName: '지윤', showEditorLabels: true });
    expect(within(rowFor('대관료')).getByText('최근: 나')).toBeInTheDocument();
    cleanup();
  });

  it('파트너 편집 → "최근: {파트너이름}"', () => {
    renderTable([baseItem({ last_edited_by: 'partner' })], { myUserId: 'me', partnerName: '지윤', showEditorLabels: true });
    expect(within(rowFor('대관료')).getByText('최근: 지윤')).toBeInTheDocument();
    cleanup();
  });

  it('파트너 편집 + 이름 없음 → "최근: 파트너" 폴백', () => {
    renderTable([baseItem({ last_edited_by: 'partner' })], { myUserId: 'me', partnerName: null, showEditorLabels: true });
    expect(within(rowFor('대관료')).getByText('최근: 파트너')).toBeInTheDocument();
    cleanup();
  });

  it('last_edited_by null → 배지 숨김(오표시 0)', () => {
    renderTable([baseItem({ last_edited_by: null })], { myUserId: 'me', partnerName: '지윤', showEditorLabels: true });
    expect(within(rowFor('대관료')).queryByText(/^최근:/)).toBeNull();
    cleanup();
  });

  it('개인 모드(showEditorLabels=false) → 배지 숨김', () => {
    renderTable([baseItem({ last_edited_by: 'partner' })], { myUserId: 'me', partnerName: '지윤', showEditorLabels: false });
    expect(within(rowFor('대관료')).queryByText(/^최근:/)).toBeNull();
    cleanup();
  });

  it('transient↔정적 배타: changedItemIds 든 행은 amber "이름 변경"만, 정적 "최근:" 미동시', () => {
    renderTable(
      [baseItem({ id: 'it-venue', last_edited_by: 'partner' })],
      { myUserId: 'me', partnerName: '지윤', showEditorLabels: true, changedItemIds: new Set(['it-venue']) },
    );
    const row = rowFor('대관료');
    expect(within(row).getByText('지윤 변경')).toBeInTheDocument();
    expect(within(row).queryByText(/^최근:/)).toBeNull();
    cleanup();
  });

  it('회귀: 라벨 prop 미전달 → 어떤 "최근:" 배지도 없음', () => {
    renderTable([baseItem({ last_edited_by: 'partner' })]);
    expect(screen.queryByText(/^최근:/)).toBeNull();
    cleanup();
  });

  // [CL-AUDIT-A2-20260626] transient 분기 폴백이 trim 미적용이면 공백전용 이름이 '    변경'으로 새어나옴(정적 배지와 계약 불일치)
  it('A2: 공백전용 partnerName + 변경분 → amber 배지는 "파트너 변경" 폴백(공백 누출 금지)', () => {
    renderTable(
      [baseItem({ id: 'it-venue', last_edited_by: 'partner' })],
      { myUserId: 'me', partnerName: '   ', showEditorLabels: true, changedItemIds: new Set(['it-venue']) },
    );
    const row = rowFor('대관료');
    expect(within(row).getByText('파트너 변경')).toBeInTheDocument();
    cleanup();
  });
});

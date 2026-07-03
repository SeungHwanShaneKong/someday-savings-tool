// [CL-TOP20-P4-COLLAB-20260703-040000] BudgetTable — transient "{파트너} 변경" 배지 상대시간 병기 렌더 계약.
//  기존 BudgetTable.editor-label.test 하네스 미러(무수정). 검증: 상대시간 병기·updated_at 미상 생략·
//  기존 "이름 변경" 텍스트 계약 보존·정적 "최근:" 배지 불변(회귀 0).
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

const isoAgo = (ms: number) => new Date(Date.now() - ms).toISOString();
const shared: LabelProps = { myUserId: 'me', partnerName: '지윤', showEditorLabels: true };

describe('BudgetTable transient 배지 상대시간 [CL-TOP20-P4-COLLAB-20260703-040000]', () => {
  it('변경 행 + 5분 전 updated_at → "지윤 변경" 텍스트 계약 유지 + "· 5분 전" 병기', () => {
    renderTable(
      [baseItem({ last_edited_by: 'partner', updated_at: isoAgo(5 * 60_000 + 500) })],
      { ...shared, changedItemIds: new Set(['it-venue']) },
    );
    const row = rowFor('대관료');
    expect(within(row).getByText('지윤 변경')).toBeInTheDocument(); // 기존 getByText 계약 불변
    expect(within(row).getByText('· 5분 전')).toBeInTheDocument();
    cleanup();
  });

  it('변경 행 + 방금 updated_at → "· 방금" 병기', () => {
    renderTable(
      [baseItem({ last_edited_by: 'partner', updated_at: isoAgo(0) })],
      { ...shared, changedItemIds: new Set(['it-venue']) },
    );
    expect(within(rowFor('대관료')).getByText('· 방금')).toBeInTheDocument();
    cleanup();
  });

  it('변경 행 + updated_at 미상(레거시) → 상대시간 생략(배지 텍스트만)', () => {
    renderTable(
      [baseItem({ last_edited_by: 'partner' })], // updated_at 없음
      { ...shared, changedItemIds: new Set(['it-venue']) },
    );
    const row = rowFor('대관료');
    expect(within(row).getByText('지윤 변경')).toBeInTheDocument();
    expect(within(row).queryByText(/^·/)).toBeNull();
    cleanup();
  });

  it('회귀 0: 정적 "최근:" 배지(비변경 행)는 상대시간 미병기·불변', () => {
    renderTable(
      [baseItem({ last_edited_by: 'partner', updated_at: isoAgo(5 * 60_000) })],
      shared, // changedItemIds 없음 → 정적 배지 경로
    );
    const row = rowFor('대관료');
    expect(within(row).getByText('최근: 지윤')).toBeInTheDocument();
    expect(within(row).queryByText(/^·/)).toBeNull();
    cleanup();
  });
});

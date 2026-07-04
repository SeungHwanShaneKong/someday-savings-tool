// [CL-BTNAUDIT3-20260704 | 아이콘버튼 접근명] BudgetTable 항목 행의 아이콘 전용 버튼들이
//  접근명(aria-label)으로 조회 가능한지 검증(WCAG 4.1.2). 이름수정(Pencil)·삭제(Trash2)·
//  인원계산(Users)·저장(Check)·취소(X). Footer 링크명 충돌 회피 위해 within(row) 스코핑.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, within, cleanup, fireEvent } from '@/test/test-utils';
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

interface Handlers {
  onRenameItem?: (id: string, name: string) => void;
  onDeleteItem?: (id: string) => void;
}
const renderTable = (items: ExtendedBudgetItem[], handlers: Handlers = {}) =>
  renderWithProviders(
    <BudgetTable
      items={items}
      onAmountChange={noop}
      onTogglePaid={noop}
      onNotesChange={noop}
      {...handlers}
    />,
    { route: '/budget' },
  );

const rowFor = (displayName: string): HTMLElement => {
  const label = screen.getByText(displayName);
  const tr = label.closest('tr');
  if (!tr) throw new Error(`row not found for ${displayName}`);
  return tr as HTMLElement;
};

describe('BudgetTable 아이콘 버튼 접근명(a11y)', () => {
  it('이름 수정(Pencil) 버튼이 "{항목명} 이름 수정" 접근명으로 조회된다', () => {
    renderTable([baseItem()], { onRenameItem: noop, onDeleteItem: noop });
    const row = rowFor('대관료');
    expect(within(row).getByRole('button', { name: '대관료 이름 수정' })).toBeInTheDocument();
    cleanup();
  });

  it('삭제(Trash2) 버튼이 "{항목명} 삭제" 접근명으로 조회된다', () => {
    renderTable([baseItem()], { onRenameItem: noop, onDeleteItem: noop });
    const row = rowFor('대관료');
    expect(within(row).getByRole('button', { name: '대관료 삭제' })).toBeInTheDocument();
    cleanup();
  });

  it('인원수 계산(Users) 버튼이 "{항목명} 인원수 계산" 접근명으로 조회된다', () => {
    // main-ceremony/meal-cost(=식대비) 행에서만 인원계산 버튼 노출(isMealCostItem)
    renderTable([baseItem({ id: 'it-meal', sub_category: 'meal-cost' })]);
    const row = rowFor('식대비');
    expect(within(row).getByRole('button', { name: '식대비 인원수 계산' })).toBeInTheDocument();
    cleanup();
  });

  it('이름 편집 진입 시 저장(Check)·취소(X) 버튼이 접근명으로 조회된다', () => {
    renderTable([baseItem()], { onRenameItem: noop });
    const row = rowFor('대관료');
    // 연필 버튼 클릭 → 편집 모드 진입
    fireEvent.click(within(row).getByRole('button', { name: '대관료 이름 수정' }));
    // 편집 모드에선 이름이 <input> 값이 되어 getByText 로 재조회 불가 → 동일 <tr> 노드(React 재조정으로 persist) 재사용
    expect(within(row).getByRole('button', { name: '이름 저장' })).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: '편집 취소' })).toBeInTheDocument();
    cleanup();
  });

  it('아이콘은 aria-hidden 처리되어 접근 트리에서 이름이 새어나오지 않는다', () => {
    renderTable([baseItem()], { onRenameItem: noop, onDeleteItem: noop });
    const row = rowFor('대관료');
    const renameBtn = within(row).getByRole('button', { name: '대관료 이름 수정' });
    // lucide 아이콘(svg)이 aria-hidden — 접근명은 aria-label 단일 소스
    const svg = renameBtn.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    cleanup();
  });
});

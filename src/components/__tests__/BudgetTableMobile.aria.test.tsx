// [CL-BTNAUDIT3-20260704 | 접근명] BudgetTableMobile — 아이콘 전용 버튼 접근명(aria-label) 계약 검증.
//  결함: 저장(Check)/취소(X)/수정(Pencil)/삭제(Trash2) 버튼이 텍스트 없이 아이콘만 → SR/키보드 접근명 부재.
//  수정: 수정=`${항목명} 수정`, 삭제=`${항목명} 삭제`, 저장="이름 저장", 취소="편집 취소" + 아이콘 aria-hidden.
//  버튼은 카테고리 확장 시에만 렌더 → 헤더 클릭으로 펼친 뒤 접근명으로 조회.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, cleanup } from '@/test/test-utils';
import { BudgetTableMobile } from '../BudgetTableMobile';
import type { ExtendedBudgetItem } from '../BudgetTable';

// 모바일 표는 항상 렌더되므로 별도 모바일 게이트 모킹 불필요(컴포넌트를 직접 마운트).

beforeEach(() => {
  try { localStorage.clear(); } catch { /* noop */ }
});

const venueItem = (over: Partial<ExtendedBudgetItem> = {}): ExtendedBudgetItem => ({
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
  onRenameItem?: (itemId: string, newName: string) => void;
  onDeleteItem?: (itemId: string) => void;
}

const renderMobile = (items: ExtendedBudgetItem[], handlers: Handlers = {}) =>
  renderWithProviders(
    <BudgetTableMobile
      items={items}
      onAmountChange={noop}
      onTogglePaid={noop}
      onNotesChange={noop}
      onRenameItem={handlers.onRenameItem}
      onDeleteItem={handlers.onDeleteItem}
    />,
    { route: '/budget' },
  );

// '본식/예식장' 카테고리 헤더(대관료 항목 소속)를 펼쳐 행 버튼을 노출한다.
const expandVenueCategory = () => {
  // 카테고리 헤더 버튼은 아이콘+이름+개수+총계를 담은 확장 토글. 접근가능 이름에 '본식'이 포함.
  const headerToggle = screen.getByRole('button', { name: /본식/ });
  fireEvent.click(headerToggle);
};

describe('BudgetTableMobile 아이콘 버튼 접근명', () => {
  it('수정 버튼: aria-label="{항목명} 수정"', () => {
    renderMobile([venueItem()], { onRenameItem: noop, onDeleteItem: noop });
    expandVenueCategory();
    expect(screen.getByRole('button', { name: '대관료 수정' })).toBeInTheDocument();
    cleanup();
  });

  it('삭제 버튼: aria-label="{항목명} 삭제"', () => {
    renderMobile([venueItem()], { onRenameItem: noop, onDeleteItem: noop });
    expandVenueCategory();
    expect(screen.getByRole('button', { name: '대관료 삭제' })).toBeInTheDocument();
    cleanup();
  });

  it('저장/취소 버튼: rename 모드 진입 시 "이름 저장"/"편집 취소" 접근명 노출', () => {
    renderMobile([venueItem()], { onRenameItem: noop, onDeleteItem: noop });
    expandVenueCategory();
    // 수정 버튼 클릭 → rename 입력 + 저장/취소 아이콘 버튼 노출
    fireEvent.click(screen.getByRole('button', { name: '대관료 수정' }));
    expect(screen.getByRole('button', { name: '이름 저장' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '편집 취소' })).toBeInTheDocument();
    cleanup();
  });

  it('커스텀 항목명 반영: aria-label 에 표시명(custom_name)이 들어간다', () => {
    renderMobile(
      [venueItem({ id: 'it-custom', is_custom: true, custom_name: '드론 촬영', sub_category: 'custom-1' })],
      { onRenameItem: noop, onDeleteItem: noop },
    );
    expandVenueCategory();
    expect(screen.getByRole('button', { name: '드론 촬영 수정' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '드론 촬영 삭제' })).toBeInTheDocument();
    cleanup();
  });

  it('아이콘은 접근성 트리에서 숨김(aria-hidden) — 버튼 접근명은 aria-label 단일 소스', () => {
    renderMobile([venueItem()], { onRenameItem: noop, onDeleteItem: noop });
    expandVenueCategory();
    const editBtn = screen.getByRole('button', { name: '대관료 수정' });
    // 내부 lucide 아이콘(svg)에 aria-hidden 부여 → 접근명 중복/오염 방지
    const svg = editBtn.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    cleanup();
  });
});

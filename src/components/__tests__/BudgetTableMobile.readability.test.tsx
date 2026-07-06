// [CL-READ-UX-20260706-211360] BudgetTableMobile 가독성 구조 회귀 가드.
//  픽셀 대신 "겹침이 구조적으로 불가능함"을 DOM 구조로 단언:
//   ① 카테고리명 break-keep(음절 안 깨짐)·"(N개)" whitespace-nowrap(세로 안 찢어짐)
//   ② 항목 편집 배지가 이름 줄(줄1) 컨테이너 밖(줄2)에 위치 → 이름과 수평 경쟁·겹침 원천 차단
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent, cleanup } from '@/test/test-utils';
import { BudgetTableMobile } from '../BudgetTableMobile';
import type { ExtendedBudgetItem } from '../BudgetTable';

const noop = vi.fn();

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

interface RenderOpts {
  changedItemIds?: Set<string>;
  partnerName?: string | null;
  myUserId?: string | null;
  showEditorLabels?: boolean;
}

function renderMobile(items: ExtendedBudgetItem[], opts: RenderOpts = {}) {
  return renderWithProviders(
    <BudgetTableMobile
      items={items}
      onAmountChange={noop}
      onTogglePaid={noop}
      onNotesChange={noop}
      onRenameItem={noop}
      onDeleteItem={noop}
      changedItemIds={opts.changedItemIds}
      partnerName={opts.partnerName}
      myUserId={opts.myUserId}
      showEditorLabels={opts.showEditorLabels}
    />,
    { route: '/budget' },
  );
}

/** '본식 운영' 카테고리 헤더를 펼쳐 항목 행 노출 */
function expandVenueCategory() {
  fireEvent.click(screen.getByRole('button', { name: /본식/ }));
}

describe('BudgetTableMobile 가독성 — 카테고리 헤더', () => {
  it('카테고리명 span 에 break-keep(음절 중간 안 깨짐)', () => {
    renderMobile([venueItem()]);
    const nameSpan = screen.getByText('본식 운영');
    expect(nameSpan.className).toContain('break-keep');
    cleanup();
  });

  it('"(N개)" 카운트 span 에 whitespace-nowrap(세로 분리 차단)', () => {
    renderMobile([venueItem()]);
    const count = screen.getByText('(1개)');
    expect(count.className).toContain('whitespace-nowrap');
    cleanup();
  });
});

describe('BudgetTableMobile 가독성 — 항목 편집 배지 2줄 스택(겹침 0)', () => {
  it('변경 배지가 이름 줄(줄1) 컨테이너 밖에 위치 → 이름과 수평 겹침 불가', () => {
    renderMobile([venueItem()], {
      changedItemIds: new Set(['it-venue']),
      partnerName: '지윤',
      myUserId: 'me',
      showEditorLabels: true,
    });
    expandVenueCategory();

    const nameSpan = screen.getByText('대관료'); // 항목명(줄1)
    const badge = screen.getByText('지윤 변경'); // 편집 배지(줄2)

    // 이름과 배지가 동일 인라인 부모가 아니어야 한다(2줄 스택)
    expect(nameSpan.parentElement).not.toBe(badge.parentElement);
    // 이름의 줄1 컨테이너(flex row)가 배지를 포함하지 않아야 한다 → 수평 경쟁·겹침 원천 차단
    const line1 = nameSpan.parentElement; // 이름+아이콘 트리거 flex row
    expect(line1?.contains(badge)).toBe(false);
    cleanup();
  });

  it('긴 파트너 닉네임 → 배지에서 …로 축약(폭 잠식 방지)', () => {
    renderMobile([venueItem()], {
      changedItemIds: new Set(['it-venue']),
      partnerName: '공찌곰돌맹쿠천하무적',
      myUserId: 'me',
      showEditorLabels: true,
    });
    expandVenueCategory();
    expect(screen.getByText('공찌곰돌맹쿠천하… 변경')).toBeInTheDocument();
    cleanup();
  });

  it('비변경·공동편집 모드 → "최근:" 정적 배지도 줄2(이름 줄 밖)', () => {
    renderMobile([venueItem({ last_edited_by: 'partner' })], {
      partnerName: '지윤',
      myUserId: 'me',
      showEditorLabels: true,
    });
    expandVenueCategory();
    const nameSpan = screen.getByText('대관료');
    const badge = screen.getByText('최근: 지윤');
    expect(nameSpan.parentElement?.contains(badge)).toBe(false);
    cleanup();
  });
});

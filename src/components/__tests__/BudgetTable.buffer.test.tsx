// [CL-COEDIT-QA200-20260620] BudgetTable — 로컬 temp 버퍼(amount/notes)·IME 합성·셀 격리 계약 검증.
// 공동편집 "입력 안 뺏김"의 토대인 BudgetTable 로컬 버퍼(editingCell/tempValue/tempNotes)와
// IME(compositionStart/End) 경로를 단위 검증한다. BudgetFlowMode.test(모드 필터 배선)와 비중복.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, within, cleanup } from '@/test/test-utils';
import { BudgetTable, type ExtendedBudgetItem } from '../BudgetTable';

// AverageCostTooltip → use-mobile 의존(데스크톱 고정으로 Tooltip 경로 결정화)
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));

// 결정적 카테고리 순서(localStorage 영향 배제) — BUDGET_CATEGORIES 원본 순서 사용
beforeEach(() => {
  try { localStorage.clear(); } catch { /* noop */ }
});

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────
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

interface Handlers {
  onAmountChange: ReturnType<typeof vi.fn>;
  onTogglePaid: ReturnType<typeof vi.fn>;
  onNotesChange: ReturnType<typeof vi.fn>;
}
const makeHandlers = (): Handlers => ({
  onAmountChange: vi.fn(),
  onTogglePaid: vi.fn(),
  onNotesChange: vi.fn(),
});

const renderTable = (items: ExtendedBudgetItem[], h: Handlers) =>
  renderWithProviders(
    <BudgetTable
      items={items}
      onAmountChange={h.onAmountChange}
      onTogglePaid={h.onTogglePaid}
      onNotesChange={h.onNotesChange}
    />,
    { route: '/budget' },
  );

/** subCategory 표시명이 있는 행(<tr>)을 스코핑 — Footer 등 외부 동명 요소 회피 */
const rowFor = (displayName: string): HTMLElement => {
  const label = screen.getByText(displayName);
  const tr = label.closest('tr');
  if (!tr) throw new Error(`row not found for ${displayName}`);
  return tr as HTMLElement;
};

/** 행 안의 메모 Input (placeholder="메모...") */
const notesInputFor = (displayName: string): HTMLInputElement =>
  within(rowFor(displayName)).getByPlaceholderText('메모...') as HTMLInputElement;

/** 행의 금액 셀을 클릭해 편집 Input으로 전환 후 반환 */
const openAmountInput = (displayName: string): HTMLInputElement => {
  const row = rowFor(displayName);
  // 금액 트리거 버튼: 값 없으면 "금액 입력", 있으면 "₩..." 텍스트
  const triggers = within(row).getAllByRole('button');
  const amountBtn = triggers.find((b) => /금액 입력|₩/.test(b.textContent || ''));
  if (!amountBtn) throw new Error(`amount trigger not found for ${displayName}`);
  fireEvent.click(amountBtn);
  return within(rowFor(displayName)).getByPlaceholderText('금액 입력') as HTMLInputElement;
};

// ── I27 amount + notes 동시 커밋(독립 콜백) ─────────────────────────────────
describe('BudgetTable 로컬 버퍼 — amount/notes 커밋', () => {
  it('I27 금액 편집 blur + 메모 편집 blur → 두 콜백이 각자 정확값으로 1회씩 발화', () => {
    const h = makeHandlers();
    renderTable([baseItem()], h);

    // 금액: 150000 입력 후 blur
    const amt = openAmountInput('대관료');
    fireEvent.change(amt, { target: { value: '150000' } });
    fireEvent.blur(amt);
    expect(h.onAmountChange).toHaveBeenCalledTimes(1);
    expect(h.onAmountChange).toHaveBeenCalledWith('main-ceremony', 'venue-fee', 150000);

    // 메모: focus → 입력 → blur
    const notes = notesInputFor('대관료');
    fireEvent.focus(notes);
    fireEvent.change(notes, { target: { value: '계약금 완료' } });
    fireEvent.blur(notes);
    expect(h.onNotesChange).toHaveBeenCalledTimes(1);
    expect(h.onNotesChange).toHaveBeenCalledWith('it-venue', '계약금 완료');
  });

  // ── I28 blur 후 refocus 시 이중발화 0 ───────────────────────────────────────
  it('I28 메모 동일값으로 두 번째 focus→blur: 변경 없으면 추가 발화 0(이중발화 억제)', () => {
    const h = makeHandlers();
    renderTable([baseItem({ notes: '기존메모' })], h);

    const get = () => notesInputFor('대관료');
    // 1차: 값 변경 후 커밋
    fireEvent.focus(get());
    fireEvent.change(get(), { target: { value: '수정됨' } });
    fireEvent.blur(get());
    expect(h.onNotesChange).toHaveBeenCalledTimes(1);

    // 2차: refocus 후 같은(렌더된) 값에서 변경 없이 blur → 추가 발화 0.
    // (props.notes는 mock이라 갱신 안되므로 onFocus가 '기존메모'를 다시 채움;
    //  blur 시 '기존메모' === originalNotes('기존메모') → skip)
    fireEvent.focus(get());
    fireEvent.blur(get());
    expect(h.onNotesChange).toHaveBeenCalledTimes(1);
  });

  // ── I29 leading zeros 파싱 ───────────────────────────────────────────────
  it('I29 금액 "007000" → parseInt로 7000 커밋(leading zero 정규화)', () => {
    const h = makeHandlers();
    renderTable([baseItem()], h);
    const amt = openAmountInput('대관료');
    fireEvent.change(amt, { target: { value: '007000' } });
    fireEvent.blur(amt);
    expect(h.onAmountChange).toHaveBeenCalledWith('main-ceremony', 'venue-fee', 7000);
  });

  // ── I30 "" → 0 ──────────────────────────────────────────────────────────
  it('I30 금액 입력 비우고 blur → 0 커밋(parseInt("")||0)', () => {
    const h = makeHandlers();
    renderTable([baseItem({ amount: 50000 })], h);
    const amt = openAmountInput('대관료');
    fireEvent.change(amt, { target: { value: '' } });
    fireEvent.blur(amt);
    expect(h.onAmountChange).toHaveBeenCalledWith('main-ceremony', 'venue-fee', 0);
  });

  it('I29b 금액 입력에 비숫자 혼입("12a3,4") → 숫자만 정규화 1234 커밋', () => {
    const h = makeHandlers();
    renderTable([baseItem()], h);
    const amt = openAmountInput('대관료');
    fireEvent.change(amt, { target: { value: '12a3,4' } });
    fireEvent.blur(amt);
    expect(h.onAmountChange).toHaveBeenCalledWith('main-ceremony', 'venue-fee', 1234);
  });

  // ── I31 notes 무변경 skip ───────────────────────────────────────────────
  it('I31 메모 focus만 하고 그대로 blur(무변경) → onNotesChange 미발화', () => {
    const h = makeHandlers();
    renderTable([baseItem({ notes: '변경없음' })], h);
    const notes = notesInputFor('대관료');
    fireEvent.focus(notes);
    fireEvent.blur(notes);
    expect(h.onNotesChange).not.toHaveBeenCalled();
  });

  it('I31b notes(null) focus→blur 무입력 → "" vs null 동치로 미발화', () => {
    const h = makeHandlers();
    renderTable([baseItem({ notes: null })], h);
    const notes = notesInputFor('대관료');
    fireEvent.focus(notes);
    fireEvent.blur(notes);
    // newNotes('') === (originalNotes||'')('') → skip
    expect(h.onNotesChange).not.toHaveBeenCalled();
  });

  // ── I32 notes blur 후 tempNotes clear → 다음 focus는 props 기준 ──────────
  it('I32 메모 blur 후 버퍼 클리어: 재focus 시 입력값은 props.notes(미반영)로 복원', () => {
    const h = makeHandlers();
    renderTable([baseItem({ notes: '원본' })], h);
    const get = () => notesInputFor('대관료');

    fireEvent.focus(get());
    fireEvent.change(get(), { target: { value: '임시수정' } });
    expect(get().value).toBe('임시수정');
    fireEvent.blur(get());

    // blur로 tempNotes[item.id] 삭제 → value는 props.notes('원본')로 되돌아감(mock이라 props 불변)
    expect(get().value).toBe('원본');
  });

  // ── I37 셀간 temp 격리 ───────────────────────────────────────────────────
  it('I37 두 메모 셀: 한 셀 편집이 다른 셀 버퍼/값을 오염시키지 않음(셀 격리)', () => {
    const h = makeHandlers();
    const items = [
      baseItem({ id: 'it-venue', sub_category: 'venue-fee', notes: 'A원본' }),
      baseItem({ id: 'it-meal', sub_category: 'meal-cost', notes: 'B원본' }),
    ];
    renderTable(items, h);

    const venue = () => notesInputFor('대관료');
    const meal = () => notesInputFor('식대비');

    fireEvent.focus(venue());
    fireEvent.change(venue(), { target: { value: 'A수정' } });

    // 대관료만 버퍼에 'A수정', 식대비는 props 그대로 'B원본'
    expect(venue().value).toBe('A수정');
    expect(meal().value).toBe('B원본');

    fireEvent.blur(venue());
    expect(h.onNotesChange).toHaveBeenCalledTimes(1);
    expect(h.onNotesChange).toHaveBeenCalledWith('it-venue', 'A수정');
  });

  it('I35 두 금액 셀 순차 편집 → 각 셀 좌표로 onAmountChange 정확 발화(동시 편집 격리)', () => {
    const h = makeHandlers();
    const items = [
      baseItem({ id: 'it-venue', sub_category: 'venue-fee' }),
      baseItem({ id: 'it-meal', sub_category: 'meal-cost' }),
    ];
    renderTable(items, h);

    const a1 = openAmountInput('대관료');
    fireEvent.change(a1, { target: { value: '1000' } });
    fireEvent.blur(a1);

    const a2 = openAmountInput('식대비');
    fireEvent.change(a2, { target: { value: '2000' } });
    fireEvent.blur(a2);

    expect(h.onAmountChange).toHaveBeenNthCalledWith(1, 'main-ceremony', 'venue-fee', 1000);
    expect(h.onAmountChange).toHaveBeenNthCalledWith(2, 'main-ceremony', 'meal-cost', 2000);
  });

  it('I30b 금액 Enter 키로도 blur와 동일하게 커밋(handleKeyDown→handleAmountBlur)', () => {
    const h = makeHandlers();
    renderTable([baseItem()], h);
    const amt = openAmountInput('대관료');
    fireEvent.change(amt, { target: { value: '88000' } });
    fireEvent.keyDown(amt, { key: 'Enter' });
    expect(h.onAmountChange).toHaveBeenCalledWith('main-ceremony', 'venue-fee', 88000);
  });

  it('I30c 금액 편집 중 Escape → 커밋 없이 편집 취소(onAmountChange 미발화)', () => {
    const h = makeHandlers();
    renderTable([baseItem({ amount: 12345 })], h);
    const amt = openAmountInput('대관료');
    fireEvent.change(amt, { target: { value: '99999' } });
    fireEvent.keyDown(amt, { key: 'Escape' });
    expect(h.onAmountChange).not.toHaveBeenCalled();
    // 편집 종료 → 다시 트리거 버튼(₩12,345)이 보임
    expect(within(rowFor('대관료')).getByText(/₩12,345/)).toBeInTheDocument();
  });
});

// ── IME(한글 합성) 경로 ───────────────────────────────────────────────────────
describe('BudgetTable IME 합성 경로', () => {
  // I33 합성이벤트 존중: compositionStart/End가 핸들러를 던지지 않고,
  // compositionEnd 후 최종값이 blur 시 정확히 커밋된다.
  it('I33 한글 합성(start→change→end) 후 blur → 최종 합성문자열 1회 커밋', () => {
    const h = makeHandlers();
    renderTable([baseItem({ notes: null })], h);
    const get = () => notesInputFor('대관료');

    fireEvent.focus(get());
    fireEvent.compositionStart(get());
    // 합성 중간 onChange(자모) 후 완성
    fireEvent.change(get(), { target: { value: 'ㅇ' } });
    fireEvent.change(get(), { target: { value: '예' } });
    fireEvent.change(get(), { target: { value: '예약' } });
    fireEvent.compositionEnd(get());
    fireEvent.blur(get());

    // 커밋은 blur에서 1회, 최종 완성값
    expect(h.onNotesChange).toHaveBeenCalledTimes(1);
    expect(h.onNotesChange).toHaveBeenCalledWith('it-venue', '예약');
  });

  it('I36 IME 합성 중 Escape 키: 메모 Input은 ESC를 가로채지 않음 → 콜백 무영향', () => {
    const h = makeHandlers();
    renderTable([baseItem({ notes: null })], h);
    const get = () => notesInputFor('대관료');

    fireEvent.focus(get());
    fireEvent.compositionStart(get());
    fireEvent.change(get(), { target: { value: '취소될중간' } });
    fireEvent.keyDown(get(), { key: 'Escape' });
    fireEvent.compositionEnd(get());

    // 메모 input에는 onKeyDown 핸들러 없음 → ESC가 커밋/취소를 일으키지 않고,
    // 아직 blur 전이므로 onNotesChange는 미발화
    expect(h.onNotesChange).not.toHaveBeenCalled();
  });

  // I26 — [CL-COEDIT-QA200-FIX-20260620] FIXED: handleNotesBlur 가 isComposingRef 를 검사해
  // 합성 진행 중 blur 는 커밋을 보류하고 compositionEnd 에서 최종값을 커밋(미완성 조합 전파 0·유실 0).
  it('I26 합성 진행 중 blur는 compositionEnd 전까지 커밋 보류한다(IME-safe)', () => {
    // BUG[CL-COEDIT-QA200-20260620]: handleNotesBlur가 isComposingRef.current[itemId]를
    // 검사하지 않아, 합성이 끝나지 않은 상태(compositionEnd 미수신)의 blur에서
    // 미완성 조합값을 즉시 onNotesChange로 커밋한다. isComposingRef는 set만 되고 read되지 않는 dead ref.
    const h = makeHandlers();
    renderTable([baseItem({ notes: null })], h);
    const get = () => notesInputFor('대관료');

    fireEvent.focus(get());
    fireEvent.compositionStart(get());
    fireEvent.change(get(), { target: { value: 'ㅇㅖ' } }); // 미완성 조합
    // compositionEnd 없이 blur(예: 마우스로 다른 곳 클릭)
    fireEvent.blur(get());

    // 올바른 동작: 합성 진행 중이므로 커밋 보류 → 0회
    expect(h.onNotesChange).not.toHaveBeenCalled();
  });
});

// ── 안정성: 편집 중 언마운트 ──────────────────────────────────────────────────
describe('BudgetTable 안정성', () => {
  it('I34 금액/메모 편집 중 언마운트 → 크래시·콜백누수 없음', () => {
    const h = makeHandlers();
    const { unmount } = renderTable([baseItem()], h);

    // 금액 편집 진입
    const amt = openAmountInput('대관료');
    fireEvent.change(amt, { target: { value: '5000' } });
    // 메모 편집 진입(합성 시작 상태로 둠)
    const notes = notesInputFor('대관료');
    fireEvent.focus(notes);
    fireEvent.compositionStart(notes);
    fireEvent.change(notes, { target: { value: '진행중' } });

    // 커밋 전 언마운트 → throw 없어야 함
    expect(() => unmount()).not.toThrow();
    // 미커밋 상태였으므로 콜백 누수 0
    expect(h.onAmountChange).not.toHaveBeenCalled();
    expect(h.onNotesChange).not.toHaveBeenCalled();
  });

  it('I34b 빈 items로 렌더 → 크래시 없이 총계 ₩0 표시', () => {
    const h = makeHandlers();
    renderTable([], h);
    // 총계 행 존재(₩0 다수일 수 있으므로 존재만 확인)
    expect(screen.getByText('총계')).toBeInTheDocument();
    cleanup();
    expect(true).toBe(true);
  });
});

// [CL-VULN-R6C-A11Y-20260625] 파트너 변경 강조가 '색상 단독'이 아니라 텍스트 단서도 동반(WCAG 1.4.1·색맹/SR 가시).
describe('BudgetTable 파트너 변경 비색상 단서 (R6-C)', () => {
  it('R6-C changedItemIds 에 든 행에 "파트너 변경" 텍스트 단서가 표시된다', () => {
    const h = makeHandlers();
    renderWithProviders(
      <BudgetTable
        items={[baseItem({ id: 'it-venue' })]}
        onAmountChange={h.onAmountChange}
        onTogglePaid={h.onTogglePaid}
        onNotesChange={h.onNotesChange}
        changedItemIds={new Set(['it-venue'])}
      />,
      { route: '/budget' },
    );
    expect(within(rowFor('대관료')).getByText('파트너 변경')).toBeInTheDocument();
  });

  it('R6-C2 changedItemIds 가 비면 단서 미표시(노이즈 0)', () => {
    const h = makeHandlers();
    renderTable([baseItem({ id: 'it-venue' })], h);
    expect(screen.queryByText('파트너 변경')).toBeNull();
  });
});

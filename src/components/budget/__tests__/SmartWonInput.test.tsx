// [CL-TOP20-P3-INPUT-20260703-030000] SmartWonInput — 만/억 파싱·실시간 힌트·IME·평균 1탭·Enter/Escape 계약 검증.
// 기존 인라인 금액 입력의 커밋 계약(빈 입력→0, Enter=blur 동일, Escape=무커밋)을 그대로 보존하는지와
// 신규 스마트 기능(한국어 단위 인식, 해석 힌트, 평균 1탭 채움)을 함께 검증한다.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SmartWonInput } from '../SmartWonInput';
import { parseSmartWon, sanitizeWonText } from '@/lib/smart-won';

// ── 파서(순수 함수) 단위 계약 ────────────────────────────────────────────────
describe('parseSmartWon — 파싱 규칙', () => {
  it.each([
    // [입력, 기대값]
    ['500만', 5_000_000],
    ['1.2억', 120_000_000],
    ['5000000', 5_000_000],
    ['1억2000만', 120_000_000],
    ['1억 2,000만원', 120_000_000], // 공백·콤마·'원' 허용
    ['1억2000만3000', 120_003_000],
    ['0.5억', 50_000_000],
    ['1.5만', 15_000],
    ['3억500', 300_000_500], // 만 없이 억+원(기존 parseKoreanWon 계약 유지)
    ['₩5,000원', 5_000],
    ['007000', 7_000], // leading zero 정규화
    ['0', 0],
  ])('%s → %d', (input, expected) => {
    expect(parseSmartWon(input)).toBe(expected);
  });

  it.each([
    ['', null],
    ['만', null], // 숫자 없는 단위 단독
    ['1.2.3', null], // 이중 소수점
    ['1억2억', null], // 억 중복
    ['abc', null],
  ])('해석 불가 %j → null', (input, expected) => {
    expect(parseSmartWon(input)).toBe(expected);
  });

  it('sanitizeWonText — 숫자·소수점·억·만만 남긴다', () => {
    expect(sanitizeWonText('₩1,2a억 34만원')).toBe('12억34만');
  });
});

// ── 컴포넌트 시나리오 ────────────────────────────────────────────────────────
const setup = (props: Partial<Parameters<typeof SmartWonInput>[0]> = {}) => {
  const onCommit = vi.fn();
  const onCancel = vi.fn();
  render(
    <SmartWonInput value={0} onCommit={onCommit} onCancel={onCancel} {...props} />,
  );
  const input = screen.getByPlaceholderText('금액 입력') as HTMLInputElement;
  return { input, onCommit, onCancel };
};

describe('SmartWonInput — 입력·힌트·확정 계약', () => {
  it('S1 "500만" 입력 → 실시간 힌트 "= 500만원" → Enter 확정 시 5,000,000 커밋(이후 blur 중복발화 0)', () => {
    const { input, onCommit } = setup();
    fireEvent.change(input, { target: { value: '500만' } });
    expect(screen.getByText('= 500만원')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(5_000_000);

    // Enter 커밋 후 언마운트 전 blur 가 흘러도 이중 커밋 0(더블서밋 게이트)
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('S2 "1.2억" 입력 → blur 확정 시 120,000,000 커밋', () => {
    const { input, onCommit } = setup();
    fireEvent.change(input, { target: { value: '1.2억' } });
    expect(screen.getByText('= 1억 2,000만원')).toBeInTheDocument();
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(120_000_000);
  });

  it('S3 숫자 "5000000" 입력 → 힌트가 한국어 단위 "= 500만원"으로 변환 표시 + 커밋값 동일', () => {
    const { input, onCommit } = setup();
    fireEvent.change(input, { target: { value: '5000000' } });
    expect(screen.getByText('= 500만원')).toBeInTheDocument();
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith(5_000_000);
  });

  it('S4 IME 안전 — 합성 중 원문 보존·blur 보류, compositionEnd 후 최종값 커밋 1회', () => {
    const { input, onCommit } = setup();
    fireEvent.compositionStart(input);
    // 합성 중간(미완성 조합) — 살균하지 않고 원문 보존
    fireEvent.change(input, { target: { value: '500마' } });
    expect(input.value).toBe('500마');
    // 합성 중 blur(마우스로 다른 곳 클릭) → 커밋 보류
    fireEvent.blur(input);
    expect(onCommit).not.toHaveBeenCalled();
    // 조합 완성 후 compositionEnd → 보류된 blur 를 최종값으로 커밋
    fireEvent.change(input, { target: { value: '500만' } });
    fireEvent.compositionEnd(input);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(5_000_000);
  });

  it('S5 평균 1탭 — "평균 292만" 버튼 탭 시 값만 채움(즉시 커밋 없음), Enter 로 확정', () => {
    const { input, onCommit } = setup({ averageAmount: 2_920_000 });
    const avgBtn = screen.getByRole('button', { name: '평균 금액 292만원 채우기' });
    expect(avgBtn).toHaveTextContent('평균 292만');

    fireEvent.click(avgBtn);
    expect(input.value).toBe('2920000');
    expect(screen.getByText('= 292만원')).toBeInTheDocument();
    expect(onCommit).not.toHaveBeenCalled(); // 커밋은 기존 확정 동작으로

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith(2_920_000);
  });

  it('S6 Escape → onCancel 1회·onCommit 0회(커밋 없는 취소), 이후 blur 도 커밋 0', () => {
    const { input, onCommit, onCancel } = setup({ value: 12_345 });
    expect(input.value).toBe('12345'); // 초기값 시드
    fireEvent.change(input, { target: { value: '99999' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('S7 빈 입력 blur → 0 커밋(기존 parseInt(...)||0 계약 보존) + 힌트 미표시', () => {
    const { input, onCommit } = setup({ value: 50_000 });
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.queryByText(/^= /)).toBeNull();
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith(0);
  });

  it('S8 비숫자 혼입 "12a3,4" → 즉시 살균되어 "1234"로 표시·커밋(레거시 정규화 계약)', () => {
    const { input, onCommit } = setup();
    fireEvent.change(input, { target: { value: '12a3,4' } });
    expect(input.value).toBe('1234');
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith(1_234);
  });

  it('S9 averageAmount 0(무료)·미전달 → 평균 버튼 미노출', () => {
    setup({ averageAmount: 0 });
    expect(screen.queryByRole('button', { name: /평균 금액/ })).toBeNull();
  });
});

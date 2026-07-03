// [CL-TOP20-P1-SIM-20260703-010000]
// 랜딩 예산 미니 시뮬레이터 검증 — 5개 독립 시나리오:
// S1 기본 렌더 총액/브레이크다운, S2 스타일 변경 계산 정합, S3 하객 수 변경 계산 정합,
// S4 첫 조작 landing_calc_interact 1회, S5 CTA 콜백 + bridge 이벤트(dest).
// 기대값은 컴포넌트 내부 산식을 믿지 않고 AVERAGE_COSTS 로부터 독립 재계산한다(골든 검증).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LandingBudgetSimulator } from '@/components/landing/LandingBudgetSimulator';
import { AVERAGE_COSTS } from '@/lib/average-costs';
import { formatKoreanWon } from '@/lib/budget-categories';

// ── 기대값 독립 재계산 (average-costs 단일소스 기반) ──────────────────────────
const sumCategory = (categoryId: string): number =>
  Object.values(AVERAGE_COSTS[categoryId]).reduce((acc, item) => acc + item.amount, 0);

const MEAL_TOTAL_AT_200 = AVERAGE_COSTS['main-ceremony']['meal-cost'].amount;
const MEAL_PER_GUEST = MEAL_TOTAL_AT_200 / 200; // note '200명 기준' → 70,000원/인
const FIXED_BASE =
  sumCategory('main-ceremony') -
  MEAL_TOTAL_AT_200 +
  sumCategory('sudeme-styling') +
  sumCategory('gifts-houseware') +
  sumCategory('honeymoon') +
  sumCategory('preparation-promotion') +
  sumCategory('miscellaneous');

/** 총액 = (고정 합 + 하객 × 1인 식대) × 스타일 배수, 만원 단위 반올림. */
const expectedTotal = (guests: number, multiplier: number): number =>
  Math.round(((FIXED_BASE + guests * MEAL_PER_GUEST) * multiplier) / 10_000) * 10_000;

const roundToManwon = (value: number): number => Math.round(value / 10_000) * 10_000;

/** aria-live 총액 리전 — 카운트업 애니메이션과 무관하게 항상 최종값을 담는다. */
const getTotalRegion = () => screen.getByRole('status');

describe('LandingBudgetSimulator', () => {
  beforeEach(() => {
    sessionStorage.clear(); // trackFunnelOnce 세션 가드 초기화
  });
  afterEach(() => {
    delete (window as { gtag?: unknown }).gtag;
  });

  it('S1 기본 렌더: 250명·표준형 총액과 상위 브레이크다운, 데모 CTA 숨김', () => {
    render(<LandingBudgetSimulator onStartClick={vi.fn()} />);

    // 총액 = (54,970,000 + 250×70,000) × 1.0 = 72,470,000 → "7,247만원"
    expect(getTotalRegion()).toHaveTextContent(formatKoreanWon(expectedTotal(250, 1)));
    expect(screen.getByText('250명')).toBeInTheDocument();

    // 브레이크다운: 식대 = 250 × 70,000 = 17,500,000 → "1,750만원"
    expect(screen.getByText('식대·연회')).toBeInTheDocument();
    expect(screen.getByText(formatKoreanWon(roundToManwon(250 * MEAL_PER_GUEST)))).toBeInTheDocument();
    expect(screen.getByText('예물·혼수·가전')).toBeInTheDocument();
    expect(
      screen.getByText(formatKoreanWon(roundToManwon(sumCategory('gifts-houseware')))),
    ).toBeInTheDocument();

    // onDemoClick 미전달 → 데모 CTA 자체가 렌더되지 않는다
    expect(screen.getByRole('button', { name: '이 예산으로 시작하기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '체험판에서 자세히 보기' })).not.toBeInTheDocument();
  });

  it('S2 스타일 변경: 프리미엄(×1.4) 선택 시 총액이 재계산되고 aria-pressed 가 이동한다', () => {
    render(<LandingBudgetSimulator onStartClick={vi.fn()} />);

    const premium = screen.getByRole('button', { name: /프리미엄/ });
    expect(premium).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(premium);

    expect(premium).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /표준형/ })).toHaveAttribute('aria-pressed', 'false');
    // (54,970,000 + 17,500,000) × 1.4 = 101,458,000 → 만원 반올림 101,460,000 → "1억 146만원"
    expect(getTotalRegion()).toHaveTextContent(formatKoreanWon(expectedTotal(250, 1.4)));

    fireEvent.click(screen.getByRole('button', { name: /알뜰형/ }));
    // 72,470,000 × 0.75 = 54,352,500 → 만원 반올림 54,350,000 → "5,435만원"
    expect(getTotalRegion()).toHaveTextContent(formatKoreanWon(expectedTotal(250, 0.75)));
  });

  it('S3 하객 수 변경: 슬라이더 End/Home 키로 500명/50명 총액이 정합한다', () => {
    render(<LandingBudgetSimulator onStartClick={vi.fn()} />);
    const thumb = screen.getByRole('slider');

    fireEvent.keyDown(thumb, { key: 'End' });
    expect(screen.getByText('500명')).toBeInTheDocument();
    // 54,970,000 + 500×70,000 = 89,970,000 → "8,997만원"
    expect(getTotalRegion()).toHaveTextContent(formatKoreanWon(expectedTotal(500, 1)));

    fireEvent.keyDown(thumb, { key: 'Home' });
    expect(screen.getByText('50명')).toBeInTheDocument();
    // 54,970,000 + 50×70,000 = 58,470,000 → "5,847만원"
    expect(getTotalRegion()).toHaveTextContent(formatKoreanWon(expectedTotal(50, 1)));
    // 식대는 하객 수 반응성을 위해 소액이어도 브레이크다운에 항상 노출
    expect(screen.getByText('식대·연회')).toBeInTheDocument();
    expect(screen.getByText(formatKoreanWon(roundToManwon(50 * MEAL_PER_GUEST)))).toBeInTheDocument();
  });

  it('S4 첫 조작 계측: 슬라이더·스타일을 여러 번 조작해도 landing_calc_interact 는 1회만 전송된다', () => {
    const gtag = vi.fn();
    (window as { gtag?: unknown }).gtag = gtag;
    render(<LandingBudgetSimulator onStartClick={vi.fn()} />);

    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
    fireEvent.click(screen.getByRole('button', { name: /알뜰형/ }));
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });

    const interactCalls = gtag.mock.calls.filter((call) => call[1] === 'landing_calc_interact');
    expect(interactCalls).toHaveLength(1);
    expect(interactCalls[0][2]).toMatchObject({ app_area: 'visitor_funnel' });
  });

  it('S5 CTA: 콜백에 현재 추정 스냅샷이 전달되고 bridge 이벤트가 dest 와 함께 전송된다', () => {
    const gtag = vi.fn();
    (window as { gtag?: unknown }).gtag = gtag;
    const onStart = vi.fn();
    const onDemo = vi.fn();
    render(<LandingBudgetSimulator onStartClick={onStart} onDemoClick={onDemo} />);

    fireEvent.click(screen.getByRole('button', { name: '이 예산으로 시작하기' }));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith({
      guests: 250,
      styleId: 'standard',
      total: expectedTotal(250, 1),
    });

    fireEvent.click(screen.getByRole('button', { name: '체험판에서 자세히 보기' }));
    expect(onDemo).toHaveBeenCalledTimes(1);
    expect(onDemo).toHaveBeenCalledWith({
      guests: 250,
      styleId: 'standard',
      total: expectedTotal(250, 1),
    });

    const bridgeCalls = gtag.mock.calls.filter((call) => call[1] === 'landing_calc_bridge_click');
    expect(bridgeCalls.map((call) => (call[2] as { dest?: string }).dest)).toEqual(['start', 'demo']);
  });
});

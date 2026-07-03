// [CL-TOP20-P3-WIZARD-20260703-030000]
// 첫 예산 생성 위저드 컴포넌트 검증 — 계산 정합은 lib 테스트(budget-wizard.test.ts)가 담당,
// 여기선 UI 흐름을 단언: W1 1단계 기본 렌더 / W2 4단계 전이+적용 콜백 페이로드+완료 플래그 /
// W3 건너뛰기(콜백 미호출·플래그 설정·닫힘) / W4 카테고리 토글 반영 / W5 이전 왕복 시 선택 보존.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BudgetSetupWizard } from '@/components/budget/BudgetSetupWizard';
import {
  computeWizardPlan,
  flattenWizardPlan,
  sumWizardPlan,
  WIZARD_DONE_KEY,
  WIZARD_DEFAULT_GUESTS,
  WIZARD_GUESTS_MAX,
  type WizardCategoryGroup,
  type WizardPrefill,
} from '@/lib/budget-wizard';
import { formatKoreanWon } from '@/lib/budget-categories';

/* [CL-TOP20-R50-TRACK-20260703-094000] funnel 계측 mock — Demo.test 컨벤션(호출 인자 직접 단언) */
const funnel = vi.hoisted(() => ({
  trackFunnel: vi.fn(),
  trackFunnelOnce: vi.fn(),
}));
vi.mock('@/lib/analytics/funnel-events', () => ({
  trackFunnel: funnel.trackFunnel,
  trackFunnelOnce: funnel.trackFunnelOnce,
}));

beforeEach(() => {
  funnel.trackFunnel.mockClear();
  funnel.trackFunnelOnce.mockClear();
});

const allEnabled = (groups: readonly WizardCategoryGroup[]): Set<string> =>
  new Set(groups.map((g) => g.categoryId));

/** 기본 선택(250명·표준형·예식+혼수) 기준 플랜 — 컴포넌트 기본값과 동일해야 한다. */
const defaultPlan = () =>
  computeWizardPlan({ guests: WIZARD_DEFAULT_GUESTS, styleId: 'standard', templateId: 'honsu' });

const setup = () => {
  const onOpenChange = vi.fn();
  const onApply = vi.fn(async (_prefills: WizardPrefill[]) => {});
  render(<BudgetSetupWizard open onOpenChange={onOpenChange} onApply={onApply} />);
  return { onOpenChange, onApply };
};

const goToStep3 = () => {
  fireEvent.click(screen.getByRole('button', { name: '다음' })); // 1 → 2
  fireEvent.click(screen.getByRole('button', { name: '다음' })); // 2 → 3 (템플릿 기본: 예식+혼수)
};

beforeEach(() => {
  localStorage.clear();
});

describe('BudgetSetupWizard', () => {
  it('W1 1단계 기본 렌더: 환영 타이틀·하객 250명·스타일 3택(표준형 기본 선택)·건너뛰기 노출', () => {
    setup();

    expect(screen.getByText('결혼 예산, 1분 만에 밑그림 그리기')).toBeInTheDocument();
    expect(screen.getByText('250명')).toBeInTheDocument();
    // shadcn Slider 는 aria-label 이 Root 에 남고 thumb(role=slider)엔 name 이 없음 — 존재만 단언
    expect(screen.getByRole('slider')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /표준형/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /알뜰형/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /프리미엄/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '나중에 할게요' })).toBeInTheDocument();
  });

  it('W2 4단계 전이: 리뷰 총액 표시 → 적용 시 onApply 가 정확한 프리필 배열로 1회 호출되고 완료 화면·플래그·닫힘까지', async () => {
    const { onOpenChange, onApply } = setup();

    // 1 → 2: 템플릿 선택 화면
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('어디까지 관리할까요?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /예식 \+ 혼수/ })).toHaveAttribute('aria-pressed', 'true');

    // 2 → 3: 리뷰 화면 — 총액(=lib 계산)과 골든 표기(5,447만원) 확인
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('제안 금액을 확인해 주세요')).toBeInTheDocument();
    const plan = defaultPlan();
    const expectedTotal = sumWizardPlan(plan, allEnabled(plan));
    expect(expectedTotal).toBe(54_470_000);
    expect(screen.getByText(formatKoreanWon(expectedTotal))).toBeInTheDocument();

    // 적용 → onApply(정확 페이로드) → 4단계 완료 화면
    const expectedPrefills = flattenWizardPlan(plan, allEnabled(plan));
    fireEvent.click(screen.getByRole('button', { name: /이대로 채우기/ }));
    expect(await screen.findByText('예산 밑그림 완성!')).toBeInTheDocument();
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(expectedPrefills);
    expect(screen.getByText(`${expectedPrefills.length}개 항목에 평균 예산을 채웠어요.`)).toBeInTheDocument();
    expect(localStorage.getItem(WIZARD_DONE_KEY)).not.toBeNull();

    // 완료 → 닫힘 전파
    fireEvent.click(screen.getByRole('button', { name: '예산표 보러 가기' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('W3 건너뛰기: onApply 미호출, 완료 플래그 설정(재노출 금지), 닫힘 전파', () => {
    const { onOpenChange, onApply } = setup();

    expect(localStorage.getItem(WIZARD_DONE_KEY)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '나중에 할게요' }));

    expect(onApply).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(localStorage.getItem(WIZARD_DONE_KEY)).not.toBeNull();
  });

  it('W4 리뷰 토글: 카테고리를 끄면 총액이 소계만큼 줄고 적용 페이로드에서도 제외된다', async () => {
    const { onApply } = setup();
    goToStep3();

    const plan = defaultPlan();
    const gifts = plan.find((g) => g.categoryId === 'gifts-houseware')!;
    const fullTotal = sumWizardPlan(plan, allEnabled(plan));

    // '혼수 및 예물' 끄기 → 총액 감소(5,447만원 → 4,087만원)
    fireEvent.click(screen.getByRole('switch', { name: '혼수 및 예물 채우기' }));
    expect(screen.getByText(formatKoreanWon(fullTotal - gifts.subtotal))).toBeInTheDocument();

    // 적용 → gifts-houseware 항목이 페이로드에 없음
    fireEvent.click(screen.getByRole('button', { name: /이대로 채우기/ }));
    expect(await screen.findByText('예산 밑그림 완성!')).toBeInTheDocument();
    const payload = onApply.mock.calls[0][0] as Array<{ category: string }>;
    expect(payload.length).toBeGreaterThan(0);
    expect(payload.some((p) => p.category === 'gifts-houseware')).toBe(false);

    const enabled = allEnabled(plan);
    enabled.delete('gifts-houseware');
    expect(payload).toEqual(flattenWizardPlan(plan, enabled));
  });

  it('W5 이전 왕복: 3→2→1 로 돌아가도 선택(스타일·템플릿)이 보존된다', () => {
    setup();

    // 1단계에서 프리미엄 선택 후 3단계까지 전진
    fireEvent.click(screen.getByRole('button', { name: /프리미엄/ }));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(screen.getByRole('button', { name: /예식 \+ 신혼집/ }));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText(/프리미엄 · 예식 \+ 신혼집 기준이에요/)).toBeInTheDocument();

    // 3 → 2: 템플릿 선택 보존
    fireEvent.click(screen.getByRole('button', { name: '이전' }));
    expect(screen.getByRole('button', { name: /예식 \+ 신혼집/ })).toHaveAttribute('aria-pressed', 'true');

    // 2 → 1: 스타일 선택 보존
    fireEvent.click(screen.getByRole('button', { name: '이전' }));
    expect(screen.getByRole('button', { name: /프리미엄/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('결혼 예산, 1분 만에 밑그림 그리기')).toBeInTheDocument();
  });

  // [CL-TOP20-R50-TRACK-20260703-094000] W6~W8: 독립검증 결함 4번(통합 테스트 공백) 보강
  it('W6 슬라이더 조정: 하객 수 변경이 리뷰 플랜 총액에 재계산 반영된다 (+ 노출 계측 1식)', () => {
    setup();

    // 노출 계측 — wizard_enter + signup_complete(가입 완료 근사, funnel-events.ts 주석 참조)
    expect(funnel.trackFunnelOnce).toHaveBeenCalledWith('wizard_enter');
    expect(funnel.trackFunnelOnce).toHaveBeenCalledWith('signup_complete');

    // 키보드 End 로 슬라이더 최대치 이동 — jsdom 에서 결정적인 Radix Slider 조작 경로
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'End' });
    expect(screen.getByText(`${WIZARD_GUESTS_MAX.toLocaleString()}명`)).toBeInTheDocument();

    goToStep3();
    const maxPlan = computeWizardPlan({
      guests: WIZARD_GUESTS_MAX,
      styleId: 'standard',
      templateId: 'honsu',
    });
    const maxTotal = sumWizardPlan(maxPlan, allEnabled(maxPlan));
    const defaultTotal = sumWizardPlan(defaultPlan(), allEnabled(defaultPlan()));
    expect(maxTotal).not.toBe(defaultTotal); // 재계산 입증 가드(같으면 이 테스트는 무의미)
    expect(screen.getByText(formatKoreanWon(maxTotal))).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`하객 ${WIZARD_GUESTS_MAX.toLocaleString()}명 · 표준형`)),
    ).toBeInTheDocument();
  });

  it('W7 Escape/X 닫기: onApply 미호출·완료 플래그 설정(재노출 금지)·닫힘 전파', () => {
    const { onOpenChange, onApply } = setup();

    // Escape — Radix DismissableLayer 경유 → handleDialogOpenChange(false) 동일 경로
    expect(localStorage.getItem(WIZARD_DONE_KEY)).toBeNull();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onApply).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(localStorage.getItem(WIZARD_DONE_KEY)).not.toBeNull();

    // X 버튼(shadcn DialogContent 내장, sr-only "Close") — open 은 테스트에서 고정이므로
    // 다이얼로그가 남아 있어 동일 인스턴스로 두 번째 닫기 경로까지 연속 검증 가능
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(onApply).not.toHaveBeenCalled();
  });

  it('W8 느린 onApply: 중복 클릭·진행 중 닫기 모두 무시되어 정확히 1회 호출 + wizard_apply 계측', async () => {
    const onOpenChange = vi.fn();
    let resolveApply!: () => void;
    const onApply = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveApply = resolve;
        }),
    );
    render(<BudgetSetupWizard open onOpenChange={onOpenChange} onApply={onApply} />);
    goToStep3();

    fireEvent.click(screen.getByRole('button', { name: /이대로 채우기/ }));
    // 진행 중: 라벨 전환 + disabled — 재클릭·Escape 닫기 모두 무시(중복 적용·유실 방지)
    const pendingButton = screen.getByRole('button', { name: '채우는 중...' });
    expect(pendingButton).toBeDisabled();
    fireEvent.click(pendingButton);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();

    // 완료 후에도 총 1회 유지 + 적용 계측 payload(기본 선택: 예식+혼수·250명·표준형)
    resolveApply();
    expect(await screen.findByText('예산 밑그림 완성!')).toBeInTheDocument();
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(funnel.trackFunnel).toHaveBeenCalledTimes(1);
    expect(funnel.trackFunnel).toHaveBeenCalledWith('wizard_apply', {
      template: 'honsu',
      guests: WIZARD_DEFAULT_GUESTS,
      style: 'standard',
    });
  });
});

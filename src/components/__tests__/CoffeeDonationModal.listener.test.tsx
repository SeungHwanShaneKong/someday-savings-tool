/**
 * [CL-VULN-R10-20260704 | 핵심] CoffeeDonationModal visibilitychange 리스너 수명 회귀 테스트
 *
 * 결함(수정 전): handleTossTransfer 가 매 클릭마다 document 에 visibilitychange 리스너를
 *   add 하지만, 제거는 오직 콜백 내부 visible-전환 분기에서만 실행. 모달 닫기·딥링크 무반응·
 *   재클릭 시 orphan 리스너가 누적되고 언마운트 cleanup 도 부재 → 리스너 누수.
 *
 * 수정 후: clearTransfer() 를 handleClose·언마운트 useEffect·visible-전환에서 호출해
 *   등록/해제를 대칭 결속. 아래 테스트는 add/remove 균형(잔존 0)을 단언한다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { CoffeeDonationModal } from '../CoffeeDonationModal';

// 모바일 모드 → 1차 CTA = '토스로 …원 보내기' (handleTossTransfer 직결)
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => true,
}));

// 클립보드 스텁 (fallback 경로 회피)
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

/** visibilitychange 등록/해제 호출만 카운트하는 스파이 헬퍼 */
function spyVisibilityListeners() {
  const realAdd = document.addEventListener.bind(document);
  const realRemove = document.removeEventListener.bind(document);
  let added = 0;
  let removed = 0;
  const addSpy = vi
    .spyOn(document, 'addEventListener')
    .mockImplementation((type, listener, opts) => {
      if (type === 'visibilitychange') added += 1;
      return realAdd(type, listener as EventListener, opts);
    });
  const removeSpy = vi
    .spyOn(document, 'removeEventListener')
    .mockImplementation((type, listener, opts) => {
      if (type === 'visibilitychange') removed += 1;
      return realRemove(type, listener as EventListener, opts);
    });
  return {
    get added() {
      return added;
    },
    get removed() {
      return removed;
    },
    restore() {
      addSpy.mockRestore();
      removeSpy.mockRestore();
    },
  };
}

describe('CoffeeDonationModal — visibilitychange 리스너 수명', () => {
  // window.location.href 대입(supertoss:// 딥링크)을 jsdom "Not implemented" 없이 안전하게 흡수 →
  // 대입 이후의 리스너 등록 코드가 확실히 실행되도록 setter 스텁.
  // [CL-VULN-R10-20260704 | href-stub-fix] jsdom 은 location.href 개별 재정의가 불가(Cannot redefine property).
  //   kakao-browser.intent.test 관례대로 window.location 을 통째로 교체(href accessor 포함).
  let hrefSetter: ReturnType<typeof vi.fn>;
  let originalLocation: Location;

  beforeEach(() => {
    vi.mocked(navigator.clipboard.writeText).mockClear();
    hrefSetter = vi.fn();
    originalLocation = window.location;
    const mockLocation: Record<string, unknown> = {
      origin: 'http://localhost',
      pathname: '/',
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
    };
    Object.defineProperty(mockLocation, 'href', {
      configurable: true,
      enumerable: true,
      get: () => 'http://localhost/',
      set: hrefSetter,
    });
    Object.defineProperty(window, 'location', { configurable: true, value: mockLocation });
  });
  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    vi.restoreAllMocks();
  });

  it('LK.1: 토스 송금 클릭 후 모달 닫기(onOpenChange(false)) → visibilitychange 리스너 정리', () => {
    const spy = spyVisibilityListeners();
    const onOpenChange = vi.fn();

    const { getByText, getByRole } = renderWithProviders(
      <CoffeeDonationModal open={true} onOpenChange={onOpenChange} />,
    );

    // 1차 CTA(토스로 …원 보내기) 클릭 → visibilitychange 리스너 1건 등록
    const cta = getByText(/토스로.*보내기/).closest('button')!;
    fireEvent.click(cta);
    expect(spy.added).toBe(1);

    // 모달 닫기: Radix DialogContent 의 내장 Close 버튼('Close' sr-only) 클릭
    //  → Radix onOpenChange(false) → 컴포넌트 handleClose → clearTransfer() 로 리스너 해제
    const closeBtn = getByRole('button', { name: 'Close' });
    fireEvent.click(closeBtn);

    // handleClose 가 onOpenChange(false)를 실제로 호출했는지(닫기 경로 진입) 확인
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // 등록된 visibilitychange 리스너가 모두 해제되어야 한다 (잔존 0)
    expect(spy.removed).toBeGreaterThanOrEqual(spy.added);
    expect(spy.added - spy.removed).toBe(0);
    spy.restore();
  });

  it('LK.2: 토스 송금 클릭 후 언마운트 → visibilitychange add/remove 균형(잔존 리스너 0)', () => {
    const spy = spyVisibilityListeners();
    const onOpenChange = vi.fn();

    const { getByText, unmount } = renderWithProviders(
      <CoffeeDonationModal open={true} onOpenChange={onOpenChange} />,
    );

    const cta = getByText(/토스로.*보내기/).closest('button')!;
    fireEvent.click(cta);
    expect(spy.added).toBe(1);

    // 언마운트 → useEffect cleanup(clearTransfer)이 리스너를 해제해야 한다
    unmount();

    expect(spy.added - spy.removed).toBe(0);
    spy.restore();
  });

  it('LK.3: 토스 송금 재클릭(연타) → 리스너 중복 누적 없이 항상 균형 유지', () => {
    const spy = spyVisibilityListeners();
    const onOpenChange = vi.fn();

    const { getByText, unmount } = renderWithProviders(
      <CoffeeDonationModal open={true} onOpenChange={onOpenChange} />,
    );

    const cta = getByText(/토스로.*보내기/).closest('button')!;
    // isTransferring 가드로 실제 2회차는 조기 반환되지만, 가드 해제 후 재시도 시나리오를
    // 언마운트 최종 정리로 검증: 어떤 경우에도 잔존 리스너는 0이어야 한다.
    fireEvent.click(cta);
    fireEvent.click(cta);

    unmount();

    expect(spy.added - spy.removed).toBe(0);
    spy.restore();
  });
});

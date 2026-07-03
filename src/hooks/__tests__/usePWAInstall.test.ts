// [CL-TOP20-P5-PWA-20260703-050000] usePWAInstall 단위 테스트
// 시나리오: ①미지원 no-op ②이벤트 캡처 ③프롬프트 호출·소진 ④standalone 억제 ⑤iOS 감지
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  usePWAInstall,
  isIOSDevice,
  isInstallPromptSuppressed,
  rememberInstallPromptDismissed,
  PWA_INSTALL_DISMISS_KEY,
  _resetPWAInstallStateForTests,
  type BeforeInstallPromptEvent,
  type InstallPromptOutcome,
} from '../usePWAInstall';

type MockInstallEvent = BeforeInstallPromptEvent & { prompt: ReturnType<typeof vi.fn> };

function makeInstallEvent(outcome: 'accepted' | 'dismissed' = 'accepted'): MockInstallEvent {
  const e = new Event('beforeinstallprompt', { cancelable: true });
  return Object.assign(e, {
    platforms: ['web'],
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  }) as unknown as MockInstallEvent;
}

describe('usePWAInstall', () => {
  beforeEach(() => {
    _resetPWAInstallStateForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('미지원 브라우저(이벤트 미발생): isInstallable=false, promptInstall 은 no-op(unavailable)', async () => {
    const { result } = renderHook(() => usePWAInstall());
    expect(result.current.isInstallable).toBe(false);

    let outcome: InstallPromptOutcome | null = null;
    await act(async () => {
      outcome = await result.current.promptInstall();
    });
    expect(outcome).toBe('unavailable'); // throw 없이 안전 반환
  });

  it('beforeinstallprompt 캡처: 기본 인포바 억제(preventDefault) + isInstallable=true', async () => {
    const { result } = renderHook(() => usePWAInstall());
    const evt = makeInstallEvent();

    act(() => {
      window.dispatchEvent(evt);
    });

    expect(evt.defaultPrevented).toBe(true);
    await waitFor(() => expect(result.current.isInstallable).toBe(true));
  });

  it('promptInstall: prompt() 1회 호출·outcome 반환·이벤트 소진(재호출 unavailable)', async () => {
    const { result } = renderHook(() => usePWAInstall());
    const evt = makeInstallEvent('accepted');

    act(() => {
      window.dispatchEvent(evt);
    });
    await waitFor(() => expect(result.current.isInstallable).toBe(true));

    let outcome: InstallPromptOutcome | null = null;
    await act(async () => {
      outcome = await result.current.promptInstall();
    });

    expect(evt.prompt).toHaveBeenCalledTimes(1);
    expect(outcome).toBe('accepted');
    // Chrome 정책상 이벤트당 prompt() 1회 → 소진 후 재호출은 no-op
    expect(result.current.isInstallable).toBe(false);
    await act(async () => {
      outcome = await result.current.promptInstall();
    });
    expect(outcome).toBe('unavailable');
    expect(evt.prompt).toHaveBeenCalledTimes(1);
  });

  it('standalone(이미 설치 실행 중): 이벤트가 와도 isInstallable=false', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query === '(display-mode: standalone)',
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }) as unknown as MediaQueryList,
    );

    const { result } = renderHook(() => usePWAInstall());
    act(() => {
      window.dispatchEvent(makeInstallEvent());
    });

    expect(result.current.isStandalone).toBe(true);
    expect(result.current.isInstallable).toBe(false);
  });

  it('iOS 감지: iPhone UA → isIOS=true / jsdom 기본 UA → false', () => {
    expect(isIOSDevice()).toBe(false); // jsdom 기본 UA

    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      configurable: true,
    });
    expect(isIOSDevice()).toBe(true);

    const { result } = renderHook(() => usePWAInstall());
    expect(result.current.isIOS).toBe(true);
    expect(result.current.isInstallable).toBe(false); // iOS 는 이벤트 미발생 → 설치버튼 대신 안내

    // 원복: own property 제거 → prototype getter 복원
    delete (window.navigator as { userAgent?: string }).userAgent;
  });
});

// [CL-TOP20-R50-TEST-20260703-094000] 설치 배너 30일 억제 퍼시스턴스 — 스토리지 장애·경계 계약
// 프라이빗 모드(getItem throw)·쿼터 초과(setItem throw)에서도 앱이 죽지 않고 안전 기본값으로
// degrade 해야 하며, 30일 경계는 "미만(<)이면 억제"가 ±1ms 단위로 정확해야 한다.
describe('설치 배너 30일 억제 — 스토리지 장애·30일 경계', () => {
  const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.removeItem(PWA_INSTALL_DISMISS_KEY);
  });

  it('getItem throw(프라이빗 모드 등): throw 없이 false(미억제) 반환', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: The operation is insecure.');
    });
    expect(() => isInstallPromptSuppressed()).not.toThrow();
    expect(isInstallPromptSuppressed()).toBe(false);
  });

  it('setItem throw(쿼터 초과 등): rememberInstallPromptDismissed 가 throw 없이 조용히 무시', () => {
    const setSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => rememberInstallPromptDismissed()).not.toThrow();
    expect(setSpy).toHaveBeenCalledTimes(1); // 저장 시도는 했으나 실패를 삼킴
  });

  it('30일 경계(±1ms): 30일-1ms=억제 유지 / 정확히 30일·30일+1ms=억제 해제', () => {
    const now = Date.now();
    // 경계 직전(30일 - 1ms): 아직 억제
    window.localStorage.setItem(PWA_INSTALL_DISMISS_KEY, String(now - (DISMISS_DURATION_MS - 1)));
    expect(isInstallPromptSuppressed(now)).toBe(true);
    // 정확히 30일: 미만(<) 조건이므로 억제 해제
    window.localStorage.setItem(PWA_INSTALL_DISMISS_KEY, String(now - DISMISS_DURATION_MS));
    expect(isInstallPromptSuppressed(now)).toBe(false);
    // 경계 직후(30일 + 1ms): 억제 해제
    window.localStorage.setItem(PWA_INSTALL_DISMISS_KEY, String(now - (DISMISS_DURATION_MS + 1)));
    expect(isInstallPromptSuppressed(now)).toBe(false);
  });
});

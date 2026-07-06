// [CL-TOP20-P5-PWA-20260703-050000] PWA 설치 프롬프트 훅
// beforeinstallprompt 는 React 마운트 전에 발생할 수 있어 모듈 전역에서 1회 캡처해 보존한다.
import { useCallback, useSyncExternalStore } from 'react';

/** Chrome 계열 비표준 이벤트 (WICG manifest-incubations) — TS lib.dom 미포함이라 직접 선언 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export type InstallPromptOutcome = 'accepted' | 'dismissed' | 'unavailable';

// ── 모듈 전역 스토어 (useSyncExternalStore 로 구독) ──
let deferredEvent: BeforeInstallPromptEvent | null = null;
let installed = false;
let captureBound = false;
let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

const getSnapshot = () => version;

/** 전역 리스너 1회만 바인딩 — 어떤 컴포넌트가 언제 마운트되든 이벤트를 놓치지 않는다 */
function ensureCapture() {
  if (captureBound || typeof window === 'undefined') return;
  captureBound = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // 브라우저 기본 미니 인포바 억제 → 앱 자체 배너(InstallPrompt)로 대체
    deferredEvent = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferredEvent = null;
    installed = true;
    emit();
  });
}

// 모듈 로드 즉시 캡처 시작(전역 1회)
ensureCapture();

/** iOS 기기 감지 — beforeinstallprompt 미지원(수동 '홈 화면에 추가' 안내 필요) 판별용 */
export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent ?? '';
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS 13+ 는 Macintosh UA 로 위장 — 멀티터치 지원 여부로 구별
  return /Macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;
}

/** 이미 홈 화면 설치본(standalone)으로 실행 중인지 */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia?.('(display-mode: standalone)')?.matches) return true;
  } catch {
    // jsdom 등 matchMedia 예외 환경은 standalone 아님으로 간주
  }
  // iOS Safari 전용 비표준 플래그
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * PWA 설치 상태/동작 훅.
 * - isInstallable: 캡처된 설치 이벤트가 있고, 아직 설치·standalone 이 아닐 때 true
 * - promptInstall: 네이티브 설치 프롬프트 표시(이벤트당 1회 — Chrome 정책) 후 사용자의 선택 반환
 * - isIOS / isStandalone: 수동 안내(iOS)·중복 노출 방지 판단용
 */
export function usePWAInstall() {
  ensureCapture();
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const isStandalone = isStandaloneDisplay();
  const isIOS = isIOSDevice();
  const isInstallable = deferredEvent !== null && !installed && !isStandalone;

  const promptInstall = useCallback(async (): Promise<InstallPromptOutcome> => {
    const evt = deferredEvent;
    if (!evt) return 'unavailable'; // 미지원 브라우저/이벤트 미발생 → 안전한 no-op
    // prompt() 는 이벤트당 1회만 허용 → 호출 즉시 소진 처리(중복 호출 방어)
    deferredEvent = null;
    emit();
    try {
      await evt.prompt();
      const choice = await evt.userChoice;
      return choice.outcome;
    } catch {
      return 'unavailable';
    }
  }, []);

  return { isInstallable, isIOS, isStandalone, promptInstall };
}

/** @internal 테스트 전용 — 모듈 전역 상태 초기화(윈도 리스너 바인딩은 유지) */
export function _resetPWAInstallStateForTests() {
  deferredEvent = null;
  installed = false;
  suppressedCache = null; // [CL-AUDIT-PWA-PERF-20260706-222500] 억제 캐시도 초기화(테스트 격리)
  emit();
}

// ── 설치 배너 30일 억제 퍼시스턴스 (InstallPrompt 에서 사용 — 컴포넌트 파일은 컴포넌트만 export) ──

/** 닫기 시각(epoch ms) 저장 키 — 이후 30일간 배너 미노출 */
export const PWA_INSTALL_DISMISS_KEY = 'wedsem-pwa-install-dismissed-at';
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30일

/** 30일 이내 닫기 기록이 있으면 true (localStorage 불가 환경은 미억제로 간주) */
export function isInstallPromptSuppressed(now: number = Date.now()): boolean {
  try {
    const raw = window.localStorage.getItem(PWA_INSTALL_DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return now - dismissedAt < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
}

// ── 억제 상태 반응형 구독 ([CL-PWA-A2HS-20260706-202540]) ──
// InstallPrompt(배너)가 닫히면 InstallFab(전역 플로팅)가 즉시 등장하도록, 억제 상태 변경을 구독 가능하게 한다.
const suppressionListeners = new Set<() => void>();

// [CL-AUDIT-PWA-PERF-20260706-222500] getSnapshot 캐시 — useSyncExternalStore 는 tearing 검출을 위해
//   렌더마다 getSnapshot 을 호출하므로, 매번 localStorage 를 동기 조회하면 순수 낭비다(억제 상태는
//   rememberInstallPromptDismissed 시점에만 변함). 값을 모듈 캐시에 보관하고 변경 시에만 재조회한다.
let suppressedCache: boolean | null = null;
/** 캐시된 억제 여부 반환(최초 1회만 localStorage 조회). useSyncExternalStore getSnapshot 용. */
function getSuppressedSnapshot(): boolean {
  if (suppressedCache === null) suppressedCache = isInstallPromptSuppressed();
  return suppressedCache;
}
function emitSuppressionChange() {
  suppressedCache = isInstallPromptSuppressed(); // 변경 시점에만 재조회 → 이후 getSnapshot 은 캐시 반환
  suppressionListeners.forEach((l) => l());
}
function subscribeSuppression(onChange: () => void) {
  suppressionListeners.add(onChange);
  return () => {
    suppressionListeners.delete(onChange);
  };
}

/** 닫기 시각 기록 — 프라이빗 모드 등 저장 불가 시 조용히 무시(세션 내 상태로만 억제) */
export function rememberInstallPromptDismissed() {
  try {
    window.localStorage.setItem(PWA_INSTALL_DISMISS_KEY, String(Date.now()));
  } catch {
    // no-op
  }
  // 저장 성공/실패와 무관하게 구독자 재평가 트리거(배너→FAB 전환).
  emitSuppressionChange();
}

/** 억제 여부를 반응형으로 반환 — 배너 닫힘 시 재렌더(전역 플로팅 버튼 조율용). getSnapshot 은 캐시 반환. */
export function useInstallPromptSuppressed(): boolean {
  return useSyncExternalStore(subscribeSuppression, getSuppressedSnapshot, () => false);
}

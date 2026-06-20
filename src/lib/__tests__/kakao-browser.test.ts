/** [CL-QA100-BTN-20260531] lib 버튼-로직 단위 검증 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getBrowserInfo,
  isInAppBrowser,
  isKakaoTalkInAppBrowser,
  openInExternalBrowser,
  copyToClipboard,
  getAppSpecificGuide,
} from '../kakao-browser';

// Helper: set navigator.userAgent safely
function setUA(ua: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    value: ua,
    configurable: true,
    writable: true,
  });
}

// [CL-SEC-INTENT-20260621] 전역 복원용 원본 보관(싱글포크 누수 방지)
const ORIGINAL_LOCATION = window.location;

// Helper: reset location.href mock
// [CL-SEC-INTENT-20260621] sanitizeBreakoutUrl 가 origin/pathname 을 참조하므로 초기 URL 을 파싱해 채운다.
function mockLocation(initial = 'https://example.com/') {
  let current = initial;
  const setter = vi.fn((v: string) => { current = v; });
  const u = new URL(initial);
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: {
      origin: u.origin,
      protocol: u.protocol,
      host: u.host,
      pathname: u.pathname,
      search: u.search,
      get href() { return current; },
      set href(v: string) { setter(v); },
    },
  });
  return setter;
}

const NORMAL_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';
const KAKAO_IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1 KAKAOTALK/10.0';
const KAKAO_ANDROID_UA = 'Mozilla/5.0 (Linux; Android 13) KAKAOTALK/10.0';
const FB_UA = 'Mozilla/5.0 FBAN/FBIOS; FB_IAB/FB4A;FBAV/300.0';
const INSTAGRAM_UA = 'Mozilla/5.0 (iPhone) Instagram/120.0';
const NAVER_UA = 'Mozilla/5.0 NAVER(inapp;search;500;12.0)';
const WEBVIEW_UA = 'Mozilla/5.0 (Linux; Android 13) wv)';

afterEach(() => {
  vi.restoreAllMocks();
  setUA(NORMAL_UA);
  // [CL-SEC-INTENT-20260621] window.location 복원 — origin 누수로 타 스위트(redirectTo 등)가 깨지지 않도록.
  Object.defineProperty(window, 'location', { configurable: true, value: ORIGINAL_LOCATION });
});

// ─── KB.1–KB.8: getBrowserInfo() browser detection ───

describe('KB: getBrowserInfo()', () => {
  it('KB.1 normal Chrome UA → isInAppBrowser false, no detectedApp', () => {
    setUA(NORMAL_UA);
    const info = getBrowserInfo();
    expect(info.isInAppBrowser).toBe(false);
    expect(info.detectedApp).toBeNull();
    expect(info.isIOS).toBe(false);
    expect(info.isAndroid).toBe(false);
  });

  it('KB.2 KAKAOTALK iOS UA → detectedApp 카카오톡, isIOS true, isKakaoTalk true', () => {
    setUA(KAKAO_IOS_UA);
    const info = getBrowserInfo();
    expect(info.isInAppBrowser).toBe(true);
    expect(info.isKakaoTalk).toBe(true);
    expect(info.detectedApp).toBe('카카오톡');
    expect(info.isIOS).toBe(true);
    expect(info.isAndroid).toBe(false);
  });

  it('KB.3 KAKAOTALK Android UA → isAndroid true, isIOS false', () => {
    setUA(KAKAO_ANDROID_UA);
    const info = getBrowserInfo();
    expect(info.isAndroid).toBe(true);
    expect(info.isIOS).toBe(false);
    expect(info.detectedApp).toBe('카카오톡');
  });

  it('KB.4 Facebook in-app UA → detectedApp Facebook', () => {
    setUA(FB_UA);
    const info = getBrowserInfo();
    expect(info.isInAppBrowser).toBe(true);
    expect(info.detectedApp).toBe('Facebook');
  });

  it('KB.5 Instagram UA → detectedApp Instagram', () => {
    setUA(INSTAGRAM_UA);
    const info = getBrowserInfo();
    expect(info.detectedApp).toBe('Instagram');
  });

  it('KB.6 NAVER inapp UA → detectedApp 네이버', () => {
    setUA(NAVER_UA);
    const info = getBrowserInfo();
    expect(info.detectedApp).toBe('네이버');
  });

  it('KB.7 Generic WebView (wv)) UA → isInAppBrowser true', () => {
    setUA(WEBVIEW_UA);
    const info = getBrowserInfo();
    expect(info.isInAppBrowser).toBe(true);
  });

  it('KB.8 isInAppBrowser() mirrors getBrowserInfo().isInAppBrowser', () => {
    setUA(KAKAO_IOS_UA);
    expect(isInAppBrowser()).toBe(true);
    setUA(NORMAL_UA);
    expect(isInAppBrowser()).toBe(false);
  });

  it('KB.9 isKakaoTalkInAppBrowser() is alias for isInAppBrowser()', () => {
    setUA(KAKAO_IOS_UA);
    expect(isKakaoTalkInAppBrowser()).toBe(true);
  });
});

// ─── KB.10–KB.14: openInExternalBrowser() ───

describe('KB: openInExternalBrowser()', () => {
  it('KB.10 normal browser → returns false, no navigation', () => {
    setUA(NORMAL_UA);
    const setter = mockLocation();
    const result = openInExternalBrowser('https://test.com/');
    expect(result).toBe(false);
    expect(setter).not.toHaveBeenCalled();
  });

  it('KB.11 Android in-app → returns true, fires intent:// URL', () => {
    setUA(KAKAO_ANDROID_UA);
    // [CL-SEC-INTENT-20260621] 동일 origin URL(외부 탈출은 항상 우리 앱) — sanitize 가 타 origin 은 폴백.
    const setter = mockLocation();
    const result = openInExternalBrowser('https://example.com/path');
    expect(result).toBe(true);
    const called = setter.mock.calls[0][0] as string;
    expect(called).toMatch(/^intent:\/\//);
    expect(called).toContain('com.android.chrome');
  });

  it('KB.12 iOS KakaoTalk → returns true, fires kakaotalk:// scheme', () => {
    setUA(KAKAO_IOS_UA);
    const setter = mockLocation();
    const result = openInExternalBrowser('https://example.com/');
    expect(result).toBe(true);
    const called = setter.mock.calls[0][0] as string;
    expect(called).toMatch(/^kakaotalk:\/\/web\/openExternal/);
    expect(called).toContain(encodeURIComponent('https://example.com/'));
  });

  it('KB.13 iOS non-KakaoTalk in-app → returns true, fires x-safari-https:// scheme', () => {
    setUA(INSTAGRAM_UA + ' (iPhone; CPU iPhone OS 17_0)');
    // Ensure isIOS
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Instagram/120.0',
      configurable: true,
      writable: true,
    });
    const setter = mockLocation();
    const result = openInExternalBrowser('https://example.com/page');
    expect(result).toBe(true);
    const called = setter.mock.calls[0][0] as string;
    expect(called).toMatch(/^x-safari-https:\/\//);
  });
});

// ─── KB.15–KB.18: copyToClipboard() ───

describe('KB: copyToClipboard()', () => {
  beforeEach(() => {
    // Reset clipboard mock
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: undefined,
    });
  });

  it('KB.15 navigator.clipboard.writeText available → resolves true', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: { writeText },
    });
    const result = await copyToClipboard('hello world');
    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello world');
  });

  it('KB.16 clipboard.writeText rejects → returns false', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: { writeText },
    });
    const result = await copyToClipboard('hello');
    expect(result).toBe(false);
  });

  it('KB.17 no navigator.clipboard → falls back to execCommand, returns true', async () => {
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: null,
    });
    // jsdom may not have execCommand; define it if missing
    if (!document.execCommand) {
      Object.defineProperty(document, 'execCommand', {
        configurable: true,
        writable: true,
        value: () => true,
      });
    } else {
      vi.spyOn(document, 'execCommand').mockReturnValue(true);
    }
    const result = await copyToClipboard('fallback text');
    expect(result).toBe(true);
  });

  it('KB.18 no clipboard + execCommand returns false → returns false', async () => {
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: null,
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      writable: true,
      value: () => false,
    });
    const result = await copyToClipboard('fallback text');
    expect(result).toBe(false);
  });
});

// ─── KB.19–KB.22: getAppSpecificGuide() ───

describe('KB: getAppSpecificGuide()', () => {
  it('KB.19 Android → steps contain 다른 브라우저로 열기 instruction', () => {
    const guide = getAppSpecificGuide(null, false, true);
    const hasInstruction = guide.steps.some(s => s.includes('다른 브라우저로 열기'));
    expect(hasInstruction).toBe(true);
  });

  it('KB.20 iOS + 카카오톡 → 다른 브라우저로 열기', () => {
    const guide = getAppSpecificGuide('카카오톡', true, false);
    expect(guide.steps.some(s => s.includes('다른 브라우저로 열기'))).toBe(true);
  });

  it('KB.21 iOS + Instagram → Safari에서 열기', () => {
    const guide = getAppSpecificGuide('Instagram', true, false);
    expect(guide.steps.some(s => s.includes('Safari에서 열기'))).toBe(true);
  });

  it('KB.22 not iOS, not Android → 외부 브라우저로 열기 generic steps', () => {
    const guide = getAppSpecificGuide(null, false, false);
    expect(guide.steps.some(s => s.includes('외부 브라우저로 열기'))).toBe(true);
  });
});

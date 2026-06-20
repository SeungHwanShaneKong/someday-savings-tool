// [CL-SEC-INTENT-20260621] kakao-browser 외부 탈출 URL 안전화 — intent:// 인젝션/오픈 리다이렉트 차단.
//
// 위협: 공격자가 동일 도메인 링크의 fragment 에 '#Intent;package=com.attacker;...' 를 심어 카톡 등
//       Android 인앱브라우저에서 열게 하면, intent: 파서가 첫 '#' 를 Intent 블록 시작으로 보고
//       임의 Intent 를 실행. 방어 = sanitizeBreakoutUrl(동일 origin 강제 + fragment 제거) + 컴포넌트 빌드.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { sanitizeBreakoutUrl, openInExternalBrowserWithFallback } from '@/lib/kakao-browser';

// window.location 을 통째로 모킹(jsdom Location 은 href 재정의가 까다로움 — INV.A12 패턴).
// [CL-SEC-INTENT-20260621] 전역 복원용 원본/기본값을 모듈 로드 시 1회 캡처(싱글포크 누수 방지).
const NORMAL_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';
const ORIGINAL_LOCATION = window.location;
let capturedHref: string;

function installLocation(href: string) {
  capturedHref = '';
  const u = new URL(href);
  const mock = {
    origin: u.origin,
    protocol: u.protocol,
    host: u.host,
    pathname: u.pathname,
    search: u.search,
    _href: href,
    get href() { return this._href; },
    set href(v: string) { capturedHref = v; },
    replace: (v: string) => { capturedHref = v; },
    assign: (v: string) => { capturedHref = v; },
  };
  Object.defineProperty(window, 'location', { configurable: true, value: mock });
}

function setUA(ua: string) {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: ua });
}

afterEach(() => {
  // [CL-SEC-INTENT-20260621] 전역 복원: location/UA 를 항상 원복(타 스위트 origin/UA 누수 방지).
  Object.defineProperty(window, 'location', { configurable: true, value: ORIGINAL_LOCATION });
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: NORMAL_UA });
  vi.restoreAllMocks();
});

describe('sanitizeBreakoutUrl', () => {
  it('SAN.1 동일 origin URL 의 fragment(#Intent 주입)를 제거한다', () => {
    installLocation('https://wedsem.app/auth');
    const out = sanitizeBreakoutUrl('https://wedsem.app/invite/tok#Intent;package=com.attacker.app;end');
    expect(out).toBe('https://wedsem.app/invite/tok');
    expect(out).not.toContain('#');
    expect(out).not.toContain('com.attacker');
  });

  it('SAN.2 쿼리스트링은 보존한다(정상 파라미터)', () => {
    installLocation('https://wedsem.app/auth');
    expect(sanitizeBreakoutUrl('https://wedsem.app/invite/tok?ref=kakao#x')).toBe(
      'https://wedsem.app/invite/tok?ref=kakao',
    );
  });

  it('SAN.3 타 origin(오픈 리다이렉트)은 우리 origin+pathname 으로 폴백', () => {
    installLocation('https://wedsem.app/auth');
    expect(sanitizeBreakoutUrl('https://evil.example.com/phish')).toBe('https://wedsem.app/auth');
  });

  it('SAN.4 잘못된 URL → 안전 폴백(throw 없음)', () => {
    installLocation('https://wedsem.app/auth');
    expect(sanitizeBreakoutUrl('not-a-url')).toBe('https://wedsem.app/auth');
  });

  it('SAN.5 인자 없으면 현재 페이지(fragment 제거) 사용', () => {
    installLocation('https://wedsem.app/budget');
    expect(sanitizeBreakoutUrl()).toBe('https://wedsem.app/budget');
  });
});

describe('openInExternalBrowserWithFallback — Android intent 빌드 안전성', () => {
  it('INTENT.1 fragment 인젝션 시도가 있어도 결과 intent 는 #Intent; 정확히 1개·공격자 토큰 없음', () => {
    // 공격자가 동일 도메인 링크의 fragment 에 가짜 Intent 를 심어 보냄
    installLocation('https://wedsem.app/auth#Intent;package=com.attacker.app;action=android.intent.action.MAIN;end');
    setUA('Mozilla/5.0 (Linux; Android 13; SM-G991N) AppleWebKit/537.36 KAKAOTALK');

    openInExternalBrowserWithFallback(window.location.href, () => {});

    expect(capturedHref).toMatch(/^intent:\/\//);
    // '#Intent;' 가 정확히 1개여야 함(조기 종료 인젝션 차단)
    expect(capturedHref.match(/#Intent;/g)?.length).toBe(1);
    // 공격자가 심은 package 가 살아남지 않아야 함
    expect(capturedHref).not.toContain('com.attacker.app');
    // 우리가 의도한 크롬 패키지만
    expect(capturedHref).toContain('package=com.android.chrome');
  });

  it('INTENT.2 타 origin URL 은 우리 origin 으로 폴백되어 intent 에 외부 호스트가 없음', () => {
    installLocation('https://wedsem.app/auth');
    setUA('Mozilla/5.0 (Linux; Android 13) KAKAOTALK');

    openInExternalBrowserWithFallback('https://evil.example.com/phish', () => {});

    expect(capturedHref).toContain('wedsem.app');
    expect(capturedHref).not.toContain('evil.example.com');
  });

  it('INTENT.3 일반 브라우저(인앱 아님)에서는 아무것도 하지 않음', () => {
    installLocation('https://wedsem.app/auth');
    setUA('Mozilla/5.0 (Macintosh; Intel Mac OS X) Safari/605.1.15');

    openInExternalBrowserWithFallback(window.location.href, () => {});
    expect(capturedHref).toBe('');
  });
});

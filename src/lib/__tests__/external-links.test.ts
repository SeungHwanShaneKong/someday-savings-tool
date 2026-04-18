// [CL-SEC-HARDEN-20260418-214623] openExternalLink 오픈 리디렉트 방어 테스트
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  EXTERNAL_URLS,
  openExternalLink,
  openHoneymoon,
  isAllowedExternalUrl,
} from '../external-links';

describe('external-links — URL allowlist 방어', () => {
  let hrefSetter: ReturnType<typeof vi.fn>;
  let hrefValue: string;

  beforeEach(() => {
    hrefValue = '';
    hrefSetter = vi.fn((v: string) => {
      hrefValue = v;
    });
    // window.location.href setter mock
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: {
        get href() {
          return hrefValue;
        },
        set href(v: string) {
          hrefSetter(v);
        },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── 허용 시나리오 ───

  it('EXTERNAL_URLS.gift는 정상 navigation', () => {
    expect(() => openExternalLink(EXTERNAL_URLS.gift)).not.toThrow();
    expect(hrefSetter).toHaveBeenCalledWith(EXTERNAL_URLS.gift);
  });

  it('EXTERNAL_URLS.honeymoon은 정상 navigation', () => {
    expect(() => openExternalLink(EXTERNAL_URLS.honeymoon)).not.toThrow();
    expect(hrefSetter).toHaveBeenCalledWith(EXTERNAL_URLS.honeymoon);
  });

  it('openHoneymoon()은 honeymoon URL로 이동', () => {
    expect(() => openHoneymoon()).not.toThrow();
    expect(hrefSetter).toHaveBeenCalledWith(EXTERNAL_URLS.honeymoon);
  });

  it('허용 origin + 추가 경로/쿼리는 허용 (origin 기반 검증)', () => {
    const withPath = `${EXTERNAL_URLS.gift}/catalog?ref=webapp`;
    expect(() => openExternalLink(withPath)).not.toThrow();
    expect(hrefSetter).toHaveBeenCalledWith(withPath);
  });

  // ─── 차단 시나리오 ───

  it('임의 evil.com origin은 차단', () => {
    expect(() => openExternalLink('https://evil.com')).toThrow(
      /Disallowed origin/,
    );
    expect(hrefSetter).not.toHaveBeenCalled();
  });

  it('HTTP 프로토콜(ssl 없음)은 차단', () => {
    expect(() =>
      openExternalLink('http://gift.moderninsightspot.com'),
    ).toThrow(/HTTPS/);
    expect(hrefSetter).not.toHaveBeenCalled();
  });

  it('javascript: 프로토콜(XSS 페이로드)은 차단', () => {
    expect(() => openExternalLink('javascript:alert(1)')).toThrow();
    expect(hrefSetter).not.toHaveBeenCalled();
  });

  it('data: 프로토콜은 차단', () => {
    expect(() =>
      openExternalLink('data:text/html,<script>alert(1)</script>'),
    ).toThrow();
    expect(hrefSetter).not.toHaveBeenCalled();
  });

  it('malformed URL은 차단', () => {
    expect(() => openExternalLink('not a url')).toThrow(/Malformed URL/);
    expect(hrefSetter).not.toHaveBeenCalled();
  });

  it('빈 문자열은 차단', () => {
    expect(() => openExternalLink('')).toThrow(/Malformed URL/);
    expect(hrefSetter).not.toHaveBeenCalled();
  });

  it('subdomain 변조 (gift-evil.moderninsightspot.com)은 차단', () => {
    expect(() =>
      openExternalLink('https://gift-evil.moderninsightspot.com'),
    ).toThrow(/Disallowed origin/);
    expect(hrefSetter).not.toHaveBeenCalled();
  });

  it('무관한 서브도메인 (a.moderninsightspot.com)은 차단', () => {
    expect(() =>
      openExternalLink('https://a.moderninsightspot.com'),
    ).toThrow(/Disallowed origin/);
    expect(hrefSetter).not.toHaveBeenCalled();
  });

  it('port 조작 (gift.moderninsightspot.com:8080)은 차단', () => {
    // 서로 다른 port는 다른 origin으로 간주됨
    expect(() =>
      openExternalLink('https://gift.moderninsightspot.com:8080'),
    ).toThrow(/Disallowed origin/);
    expect(hrefSetter).not.toHaveBeenCalled();
  });

  // ─── isAllowedExternalUrl 유틸 ───

  it('isAllowedExternalUrl: 허용 URL은 true', () => {
    expect(isAllowedExternalUrl(EXTERNAL_URLS.gift)).toBe(true);
    expect(isAllowedExternalUrl(EXTERNAL_URLS.honeymoon)).toBe(true);
  });

  it('isAllowedExternalUrl: 차단 URL은 false (throw 하지 않음)', () => {
    expect(isAllowedExternalUrl('https://evil.com')).toBe(false);
    expect(isAllowedExternalUrl('http://gift.moderninsightspot.com')).toBe(
      false,
    );
    expect(isAllowedExternalUrl('')).toBe(false);
  });
});

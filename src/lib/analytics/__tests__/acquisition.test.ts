// [CL-ACQ-CLASSIFY-20260622-233012] 유입경로 분류/first-touch 단위 검증 (개선1)
import { describe, it, expect, beforeEach } from 'vitest';
import { classifySource, getOrSetFirstTouch, readFirstTouch, sourceLabel, normalizeReferrer } from '../acquisition';

describe('classifySource (유입경로 분류)', () => {
  it('AQ.1 UTM 우선 — utm_source/medium 소문자, referrer 보존', () => {
    expect(classifySource('?utm_source=Newsletter&utm_medium=Email', 'https://google.com', '')).toEqual({
      source: 'newsletter',
      medium: 'email',
      referrer: 'https://google.com',
    });
  });

  it('AQ.2 referrer 없음 → direct', () => {
    expect(classifySource('', '', 'wedsem.com')).toEqual({ source: 'direct', medium: null, referrer: null });
  });

  it('AQ.3 검색 도메인(서브도메인/국가코드 무관) 매핑', () => {
    expect(classifySource('', 'https://search.naver.com/x', 'wedsem.com')).toMatchObject({ source: 'naver', medium: 'search' });
    expect(classifySource('', 'https://www.google.co.kr/', '').source).toBe('google');
    expect(classifySource('', 'https://daum.net/', '').source).toBe('daum');
  });

  it('AQ.4 소셜 도메인 매핑 (x.com→x, m.facebook→facebook)', () => {
    expect(classifySource('', 'https://instagram.com/p/x', '').source).toBe('instagram');
    expect(classifySource('', 'https://x.com/abc', '').source).toBe('x');
    expect(classifySource('', 'https://m.facebook.com/', '').source).toBe('facebook');
  });

  it('AQ.5 카카오 — 중간 라벨(blog.kakao.com)도 매칭', () => {
    expect(classifySource('', 'https://blog.kakao.com/x', '')).toMatchObject({ source: 'kakao', medium: 'social' });
  });

  it('AQ.6 자기 도메인 referrer → direct (자기참조 오염 방지)', () => {
    expect(classifySource('', 'https://moderninsightspot.com/guide', 'moderninsightspot.com').source).toBe('direct');
    // www 접두는 hostOf 가 제거 → selfHost 와 일치
    expect(classifySource('', 'https://www.moderninsightspot.com/', 'moderninsightspot.com').source).toBe('direct');
  });

  it('AQ.7 알 수 없는 외부 도메인 → 호스트명 + referral', () => {
    expect(classifySource('', 'https://some-blog.net/post', 'wedsem.com')).toMatchObject({
      source: 'some-blog.net',
      medium: 'referral',
    });
  });

  it('AQ.7b [R3] 반환 referrer 는 origin 만 — 쿼리스트링(PII) 제거', () => {
    // 검색어/세션토큰이 든 referrer 라도 origin 만 저장되어야 함
    const r = classifySource('', 'https://search.naver.com/search?query=내검색어&sid=secret', 'wedsem.com');
    expect(r.source).toBe('naver');
    expect(r.referrer).toBe('https://search.naver.com'); // path/query 제거
  });

  it('AQ.8 잘못된 referrer URL → direct(견고)', () => {
    expect(classifySource('', 'not-a-url', 'wedsem.com')).toEqual({ source: 'direct', medium: null, referrer: null });
  });
});

describe('getOrSetFirstTouch / readFirstTouch (최초 1회 보관)', () => {
  beforeEach(() => {
    localStorage.clear();
    // 결정론: 다른 테스트가 남긴 ambient referrer 오염 차단(singleFork 공유 프로세스)
    Object.defineProperty(document, 'referrer', { value: '', configurable: true });
  });

  it('AQ.9 최초 호출 시 보관 후 반환, 재호출 시 시각이 달라도 최초값 유지(불변)', () => {
    const first = getOrSetFirstTouch('2026-06-22T00:00:00.000Z');
    expect(first).toMatchObject({ source: 'direct', ts: '2026-06-22T00:00:00.000Z' });
    const second = getOrSetFirstTouch('2026-06-23T09:00:00.000Z');
    expect(second).toEqual(first); // first-touch 불변
    expect(readFirstTouch()).toEqual(first);
  });

  it('AQ.10 보관 전 readFirstTouch 는 null', () => {
    expect(readFirstTouch()).toBeNull();
  });
});

describe('normalizeReferrer ([R3] origin 만 보관)', () => {
  it('AQ.12 전체 URL → origin, 쿼리/패스 제거', () => {
    expect(normalizeReferrer('https://x.com/abc?utm=1&token=secret')).toBe('https://x.com');
  });
  it('AQ.13 빈 값/파싱 불가 → null', () => {
    expect(normalizeReferrer('')).toBeNull();
    expect(normalizeReferrer(null)).toBeNull();
    expect(normalizeReferrer('not-a-url')).toBeNull();
  });
});

describe('sourceLabel (한국어 라벨)', () => {
  it('AQ.11 알려진 키는 한국어, 미정의는 원문 유지', () => {
    expect(sourceLabel('google')).toBe('구글');
    expect(sourceLabel('direct')).toBe('직접 방문');
    expect(sourceLabel('unknown')).toBe('미상');
    expect(sourceLabel('x')).toBe('X(트위터)');
    expect(sourceLabel('some-blog.net')).toBe('some-blog.net');
  });
});

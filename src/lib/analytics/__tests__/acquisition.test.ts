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

// [CL-SHARE-P1-20260717-170000] 랜딩 pathname 기반 바이럴 분류 — docs/growth-share-card-design.md §4.2, DoD #2.
//  배경(prove-first 근거): 카톡 인앱/문자 유입은 referrer 가 비거나 자기도메인이라 :71 자기참조 가드에서
//  전부 'direct' 로 오분류된다 → 경로가 유일한 신뢰 신호. 이 분류가 없으면 K-factor 측정 자체가 불가.
describe('classifySource — 바이럴 랜딩 경로 분류 (share_card / partner_invite)', () => {
  it('AQ.14 /shared/:token 랜딩 → share_card·viral (referrer 없어도 direct 로 떨어지지 않음)', () => {
    expect(classifySource('', '', 'moderninsightspot.com', '/shared/abc123')).toEqual({
      source: 'share_card',
      medium: 'viral',
      referrer: null,
    });
  });

  it('AQ.15 /invite/:token 랜딩 → partner_invite·viral (share_card 와 별도 소스 — K-factor 오염 방지)', () => {
    expect(classifySource('', '', 'moderninsightspot.com', '/invite/tok').source).toBe('partner_invite');
  });

  it('AQ.16 자기도메인 referrer 로 온 공유 링크도 바이럴로 분류(구 동작에선 direct 오분류)', () => {
    // 카톡 인앱 → 자기도메인 referrer 케이스
    expect(
      classifySource('', 'https://moderninsightspot.com/summary', 'moderninsightspot.com', '/shared/t'),
    ).toMatchObject({ source: 'share_card', medium: 'viral' });
  });

  it('AQ.17 UTM 이 있으면 UTM 우선(명시적 캠페인 의도 > 경로 추론)', () => {
    expect(classifySource('?utm_source=blog&utm_medium=post', '', '', '/shared/t')).toMatchObject({
      source: 'blog',
      medium: 'post',
    });
  });

  it('AQ.18 바이럴 경로가 아니면 기존 referrer 분류 유지(회귀 0)', () => {
    expect(classifySource('', 'https://search.naver.com/x', 'wedsem.com', '/guide/').source).toBe('naver');
    expect(classifySource('', '', 'wedsem.com', '/').source).toBe('direct');
    // 유사 경로 오탐 금지 — prefix 정확 일치만
    expect(classifySource('', '', 'wedsem.com', '/sharedx/t').source).toBe('direct');
    expect(classifySource('', '', 'wedsem.com', '/shared').source).toBe('direct');
  });

  it('AQ.19 외부 referrer 로 공유 링크 진입 시에도 경로가 우선(바이럴 귀속 보장)', () => {
    expect(classifySource('', 'https://instagram.com/p/x', 'wedsem.com', '/shared/t')).toMatchObject({
      source: 'share_card',
      medium: 'viral',
      referrer: 'https://instagram.com',
    });
  });

  it('AQ.20 바이럴 소스도 한국어 라벨 보유(Admin 유입 차트 자동 편입)', () => {
    expect(sourceLabel('share_card')).toBe('공유 카드');
    expect(sourceLabel('partner_invite')).toBe('파트너 초대');
  });
});

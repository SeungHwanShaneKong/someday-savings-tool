// [CL-ANONVISIT-LOGIC-20260627-234656] track-visit 순수 살균 로직 검증 — 보안/프라이버시 게이트.
//  Deno/실DB 는 이 환경서 실행 불가 → 살균 로직을 Deno-비종속 순수 모듈로 추출해 vitest 로 입증.
import { describe, it, expect } from 'vitest';
import {
  sanitizeVisitPayload,
  toOrigin,
  isBodyTooLarge,
  isOverDailyCap,
  RateLimiter,
} from '../../../../supabase/functions/_shared/track-visit-logic';

const CTRL = String.fromCharCode(0) + String.fromCharCode(9) + String.fromCharCode(31) + String.fromCharCode(127);

describe('track-visit-logic: sanitizeVisitPayload', () => {
  it('TV.1 page_path: / 강제 + 제어문자 제거 + ≤255 + 기본값', () => {
    expect(sanitizeVisitPayload({ page_path: 'budget' }).page_path).toBe('/budget');
    expect(sanitizeVisitPayload({ page_path: '/guide/' + CTRL + 'x' }).page_path).toBe('/guide/x');
    expect(sanitizeVisitPayload({}).page_path).toBe('/');
    expect(sanitizeVisitPayload({ page_path: '/' + 'a'.repeat(400) }).page_path.length).toBe(255);
  });

  it('TV.2 session_id: 유효 UUID 만 통과(소문자), 아니면 null(호출부 생성)', () => {
    const uid = 'A1B2C3D4-E5F6-4789-ABCD-EF0123456789';
    expect(sanitizeVisitPayload({ session_id: uid }).session_id).toBe(uid.toLowerCase());
    expect(sanitizeVisitPayload({ session_id: 'not-a-uuid' }).session_id).toBeNull();
    expect(sanitizeVisitPayload({ session_id: 12345 }).session_id).toBeNull();
  });

  it('TV.3 referrer: origin 만 추출, http(s) 외/내부경로 → null', () => {
    expect(sanitizeVisitPayload({ referrer: 'https://search.naver.com/path?q=1#h' }).referrer).toBe('https://search.naver.com');
    expect(sanitizeVisitPayload({ referrer: 'javascript:alert(1)' }).referrer).toBeNull();
    expect(sanitizeVisitPayload({ referrer: '/internal/path' }).referrer).toBeNull();
    expect(sanitizeVisitPayload({ referrer: '' }).referrer).toBeNull();
  });

  it('TV.4 utm_source: 소문자 + 안전문자만 + ≤40', () => {
    expect(sanitizeVisitPayload({ utm_source: 'Google' }).utm_source).toBe('google');
    expect(sanitizeVisitPayload({ utm_source: 'na<ver>; drop' }).utm_source).toBe('naverdrop');
    expect(sanitizeVisitPayload({ utm_source: 'x'.repeat(80) }).utm_source?.length).toBe(40);
    expect(sanitizeVisitPayload({ utm_source: '' }).utm_source).toBeNull();
  });

  it('TV.5 여분/금지 필드(user_id·is_synthetic)는 구조적으로 제거(화이트리스트)', () => {
    const out = sanitizeVisitPayload({
      page_path: '/x', session_id: 'bad', referrer: 'https://a.com', utm_source: 'direct',
      user_id: 'spoof', is_synthetic: true, ip: '1.2.3.4', extra: 'nope',
    } as unknown);
    expect(Object.keys(out).sort()).toEqual(['page_path', 'referrer', 'session_id', 'utm_source']);
    expect((out as unknown as Record<string, unknown>).user_id).toBeUndefined();
    expect((out as unknown as Record<string, unknown>).is_synthetic).toBeUndefined();
  });

  it('TV.6 비객체 입력도 안전(기본 CleanVisit 반환)', () => {
    expect(sanitizeVisitPayload(null).page_path).toBe('/');
    expect(sanitizeVisitPayload('string').page_path).toBe('/');
    expect(sanitizeVisitPayload(undefined).session_id).toBeNull();
  });
});

describe('track-visit-logic: toOrigin', () => {
  it('TV.7 scheme+host 만, 경로/쿼리/해시 제거', () => {
    expect(toOrigin('https://m.example.com/a/b?q=1#x')).toBe('https://m.example.com');
    expect(toOrigin('http://example.com:8080/x')).toBe('http://example.com:8080');
  });
  it('TV.8 http(s) 외·파싱불가 → null', () => {
    expect(toOrigin('ftp://x.com')).toBeNull();
    expect(toOrigin('not a url')).toBeNull();
    expect(toOrigin(42)).toBeNull();
  });
});

// [CL-AUDIT2-R1-HARDEN-20260628] 무인증 엔드포인트 추가 방어(F1/F12/F13)
describe('track-visit-logic: isBodyTooLarge (F13)', () => {
  it('TV.9 Content-Length 캡 초과 → true, 이하/부재 → false', () => {
    expect(isBodyTooLarge('100', 8192)).toBe(false);
    expect(isBodyTooLarge('9000', 8192)).toBe(true);
    expect(isBodyTooLarge(null, 8192)).toBe(false); // 부재 → 플랫폼 캡 위임
    expect(isBodyTooLarge('not-a-number', 8192)).toBe(false);
  });
});

describe('track-visit-logic: isOverDailyCap (F1)', () => {
  it('TV.10 예약값 > 캡 → true, 이하 → false, null(RPC 미가용) → false(fail-open)', () => {
    expect(isOverDailyCap(200_001, 200_000)).toBe(true);
    expect(isOverDailyCap(200_000, 200_000)).toBe(false);
    expect(isOverDailyCap(1, 200_000)).toBe(false);
    expect(isOverDailyCap(null, 200_000)).toBe(false); // 미배포 → 무중단
  });
});

describe('track-visit-logic: RateLimiter (F12)', () => {
  it('TV.11 윈도우 내 max 초과 차단, 윈도우 경과 후 리셋', () => {
    const rl = new RateLimiter(1000, 3, 100);
    const t = 1_000_000;
    expect(rl.hit('ip', t)).toBe(true);
    expect(rl.hit('ip', t)).toBe(true);
    expect(rl.hit('ip', t)).toBe(true);
    expect(rl.hit('ip', t)).toBe(false); // 4번째 = max(3) 초과
    expect(rl.hit('ip', t + 1001)).toBe(true); // 윈도우 경과 → 리셋
  });

  it('TV.12 엔트리 수 캡 초과 시 만료 스윕 + FIFO 축출(Map 무한증가 차단)', () => {
    const rl = new RateLimiter(1000, 60, 10); // capEntries=10
    // 만료된 키 5개(과거 시각) + 신규 키들로 캡을 넘겨 스윕 유발
    for (let i = 0; i < 5; i++) rl.hit(`old-${i}`, 1_000);
    for (let i = 0; i < 20; i++) rl.hit(`new-${i}`, 1_000_000); // now 가 윈도우 훨씬 뒤 → old 만료
    expect(rl.size).toBeLessThanOrEqual(10); // 무한증가 안 함
  });
});

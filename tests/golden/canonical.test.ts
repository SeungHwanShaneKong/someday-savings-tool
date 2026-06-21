// [CL-DOMAIN-PROMOTE-20260621] 골든 회귀 가드 — 정식 도메인(canonical origin) 단일소스 고정.
//
// 목적: apex 승격 후 누군가 옛 도메인(wedsem) 또는 비-https 로 회귀시키면 즉시 실패.
// SITE_ORIGIN 은 SEO 절대URL(canonical/og/sitemap/JSON-LD)의 단일 소스(src/config/site.ts).
import { describe, it, expect } from 'vitest';
import { SITE_ORIGIN } from '../../src/config/site';

const GOLDEN_ORIGIN = 'https://moderninsightspot.com'; // apex 승격 골든값

describe('golden: canonical 도메인 단일소스', () => {
  it('SITE_ORIGIN === apex(https), 옛 wedsem 회귀 차단', () => {
    expect(SITE_ORIGIN).toBe(GOLDEN_ORIGIN);
    expect(SITE_ORIGIN.startsWith('https://')).toBe(true);
    expect(SITE_ORIGIN).not.toContain('wedsem');
    expect(SITE_ORIGIN.endsWith('/')).toBe(false); // 경로 결합 시 이중 슬래시 방지
  });
});

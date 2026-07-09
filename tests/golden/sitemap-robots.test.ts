// [CL-SEO-SITEMAP-GUARD-20260626] 골든: sitemap.xml(dist) 절대URL+trailing-slash 정합 + robots Sitemap 선언.
//  dist 미빌드 시 sitemap 부분은 skip. robots.txt(public)는 항상 검증.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { SITE_ORIGIN } from '../../src/config/site';

const ROOT = process.cwd();
const distSitemap = path.join(ROOT, 'dist', 'sitemap.xml');
const sitemapBuilt = existsSync(distSitemap);

describe('golden: robots.txt Sitemap 선언(public)', () => {
  it('robots.txt 에 SITE_ORIGIN 기준 Sitemap 라인 존재', () => {
    const robots = readFileSync(path.join(ROOT, 'public', 'robots.txt'), 'utf-8');
    expect(robots).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
  });
});

describe.skipIf(!sitemapBuilt)('golden: sitemap.xml 정합(dist)', () => {
  const xml = sitemapBuilt ? readFileSync(distSitemap, 'utf-8') : '';
  const locs = (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map((m: string) => m.replace(/<\/?loc>/g, ''));

  // [CL-ADSENSE-MAX-20260709-234500] 결승선 — 아티클 28편 + 허브/법적 페이지 = 36 라우트
  it('<loc> 가 36개 이상(전 라우트 포함)', () => {
    expect(locs.length).toBeGreaterThanOrEqual(36);
  });
  it('모든 <loc> 는 SITE_ORIGIN 절대URL + trailing-slash', () => {
    for (const loc of locs) {
      expect(loc.startsWith(`${SITE_ORIGIN}/`)).toBe(true);
      expect(loc.endsWith('/')).toBe(true);
    }
  });
  it('구 도메인(wedsem) 회귀 0', () => {
    expect(xml).not.toContain('wedsem');
  });
});

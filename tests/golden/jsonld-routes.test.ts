// [CL-SEO-JSONLD-GUARD-20260626] 골든: 프리렌더된 정적 HTML 에 구조화데이터가 '실제로 박혔는지' 검증.
//  Google 은 정적 HTML 의 JSON-LD 를 읽는다. CSR 주입이 dist 로 캡처되지 않으면 리치결과를 잃는다.
//  dist 미빌드 시 자동 skip(빌드 환경에서만 의미). build:ssg 후 `pnpm run test` 로 실효.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { getAllArticleSlugs } from '../../src/content/articles';

const DIST = path.join(process.cwd(), 'dist');
const distBuilt = existsSync(path.join(DIST, 'index.html'));
const read = (rel: string) => readFileSync(path.join(DIST, rel), 'utf-8');

describe.skipIf(!distBuilt)('golden: 정적 HTML JSON-LD 주입(dist)', () => {
  it('홈: WebApplication + WebSite + Organization @graph 정적 존재', () => {
    const html = read('index.html');
    expect(html).toContain('"WebApplication"');
    expect(html).toContain('"WebSite"');
    expect(html).toContain('"Organization"');
  });

  it('가이드 허브: HowTo + BreadcrumbList', () => {
    const html = read('guide/index.html');
    expect(html).toContain('"HowTo"');
    expect(html).toContain('"BreadcrumbList"');
  });

  it('FAQ: FAQPage + Question 다수(>=10)', () => {
    const html = read('faq/index.html');
    expect(html).toContain('"FAQPage"');
    const q = (html.match(/"Question"/g) || []).length;
    expect(q).toBeGreaterThanOrEqual(10);
  });

  for (const slug of getAllArticleSlugs()) {
    it(`아티클 ${slug}: Article + BreadcrumbList 동시 정적 존재`, () => {
      const html = read(`guide/${slug}/index.html`);
      expect(html).toContain('"Article"');
      expect(html).toContain('"BreadcrumbList"');
    });
  }
});

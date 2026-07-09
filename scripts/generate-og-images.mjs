/**
 * [CL-OGIMG-20260709-235500] 아티클별 OG 카드 생성 (public/og/<slug>.png, 1200×630)
 *
 * - 레지스트리(src/content/articles.ts)를 Vite ssrLoadModule 로 로드(단일소스 — 하드코딩 목록 금지)
 * - brand/og-template.html 에 아티클 제목/카테고리를 주입해 Puppeteer 캡처
 * - useSEO(image) + prerender verify(ogImage) 가 이 산출물을 라우트별 og:image 로 소비한다
 *
 * 실행: `pnpm run og:images` (아티클 추가/제목 변경 시 반드시 재실행 후 커밋)
 * 검증: tests/golden/og-images.test.ts (전 슬러그 PNG 존재·1200×630)
 */
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fillOgTemplate } from './generate-brand-assets.mjs';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'public', 'og');
const ogTemplate = readFileSync(path.join(ROOT, 'brand', 'og-template.html'), 'utf8');
const log = (...a) => console.log('[og]', ...a);

async function loadArticles() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
  });
  try {
    const mod = await vite.ssrLoadModule('/src/content/articles.ts');
    return mod.ARTICLES;
  } finally {
    await vite.close();
  }
}

async function main() {
  const articles = await loadArticles();
  log(`레지스트리 ${articles.length}편 로드`);
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
    for (const a of articles) {
      const html = fillOgTemplate(ogTemplate, {
        badge: a.category || '결혼 준비 가이드',
        title: a.title,
        subtitle: '웨딩셈 결혼 준비 가이드 — moderninsightspot.com',
      });
      // networkidle0 은 반복 setContent 에서 잔여 요청으로 고착 가능(1장 후 타임아웃 실측) → 'load'+fonts.ready 로 충분
      await page.setContent(html, { waitUntil: 'load', timeout: 45000 });
      await page.evaluate(() => document.fonts.ready);
      const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
      const file = path.join(OUT_DIR, `${a.slug}.png`);
      writeFileSync(file, buf);
      log(`og/${a.slug}.png (${(buf.length / 1024).toFixed(1)}KB)`);
    }
  } finally {
    await browser.close();
  }
  log(`완료 — ${articles.length}장. 골든: pnpm vitest run tests/golden/og-images.test.ts`);
}

main().catch((e) => {
  console.error('[og] 실패:', e);
  process.exit(1);
});

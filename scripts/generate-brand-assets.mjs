/**
 * [CL-BRAND-HEART-20260709-231800] 브랜드 자산 생성 파이프라인
 *
 * brand/mark.svg(마스터) + brand/mark-small.svg + brand/og-template.html 에서
 * public/ 의 모든 래스터 브랜드 자산을 재현 가능하게 생성한다.
 *
 *   - og-image.png            1200×630  (홈 OG 카드 — 마크+워드마크+태그라인)
 *   - pwa-icon-512/256/192    정방형    (핑크 그라데이션 타일 + 화이트 하트 66%)
 *   - pwa-icon-maskable-512/192          (하트를 60% 안전영역에 축소 — Android 마스크 대응)
 *   - apple-touch-icon.png    180×180  (iOS — 불투명 타일)
 *   - favicon.png             512×512  (투명 배경 마크 — JSON-LD Organization logo 겸용)
 *   - favicon.ico             16/32/48 멀티사이즈 (desktop-shortcut.ts 가 .ico 경로를 참조하므로 유지 필수)
 *
 * 실행: `pnpm run brand:assets`  (SVG/템플릿 수정 시 반드시 재실행 후 커밋)
 * 검증: tests/golden/brand-assets.test.ts (IHDR 치수·ico 매직·용량 가드)
 */
import puppeteer from 'puppeteer';
import pngToIco from 'png-to-ico';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const PUB = path.join(ROOT, 'public');
const BRAND = path.join(ROOT, 'brand');

/** SVG 파일 헤더의 HTML 주석 제거 — 템플릿/타일에 인라인 주입 시 주석 종료 시퀀스 오염 방지 */
const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '').trim();

const markSvg = stripComments(readFileSync(path.join(BRAND, 'mark.svg'), 'utf8'));
const markSmallSvg = stripComments(readFileSync(path.join(BRAND, 'mark-small.svg'), 'utf8'));
const ogTemplate = readFileSync(path.join(BRAND, 'og-template.html'), 'utf8');

const log = (...a) => console.log('[brand]', ...a);

/** 아이콘 타일 HTML — bg: 'gradient'|'blush'(불투명 타일) | 'transparent', scale: 마크가 캔버스에서 차지하는 비율.
 *  [CL-BRAND-V4-20260711-190000] 'blush' = 소프트 크림-블러시 타일(마스터 마크의 핑크 하트가 대비되어 보이도록). */
function iconHtml(size, { bg, scale, svg = markSvg }) {
  const background = bg === 'gradient'
    ? 'background: linear-gradient(135deg, #FFE3ED 0%, #FFB9CF 45%, #F76D96 100%);'
    : bg === 'blush'
      ? 'background: linear-gradient(140deg, #FFF6F2 0%, #FFE7EF 52%, #FFD3E1 100%);'
      : 'background: transparent;';
  const inner = Math.round(size * scale);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { margin:0; padding:0; }
    html,body { width:${size}px; height:${size}px; overflow:hidden; }
    body { ${background} display:flex; align-items:center; justify-content:center; }
    .m { width:${inner}px; height:${inner}px; }
    .m svg { width:100%; height:100%; display:block; }
  </style></head><body><div class="m">${svg}</div></body></html>`;
}

/** 텍스트 값 HTML 이스케이프 — 아티클 제목의 &·<·> 등이 마크업을 깨지 않도록 */
const escapeHtml = (s) => String(s)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

/** OG 템플릿 치환 — 제목 길이에 따른 폰트 크기 자동 조정 (generate-og-images.mjs 재사용) */
export function fillOgTemplate(tpl, { badge, title, subtitle }) {
  const len = [...title].length;
  const size = len <= 8 ? 96 : len <= 14 ? 76 : len <= 22 ? 62 : len <= 30 ? 52 : 44;
  return tpl
    .replaceAll('{{MARK_SVG}}', markSvg)
    .replaceAll('{{BADGE}}', escapeHtml(badge))
    .replaceAll('{{TITLE}}', escapeHtml(title))
    .replaceAll('{{SUBTITLE}}', escapeHtml(subtitle))
    .replaceAll('{{TITLE_SIZE}}', String(size));
}

async function renderPng(browser, html, width, height, { transparent = false } = {}) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 45000 });
    await page.evaluate(() => document.fonts.ready);
    return await page.screenshot({
      type: 'png',
      omitBackground: transparent,
      clip: { x: 0, y: 0, width, height },
    });
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const out = (name, buf) => {
      writeFileSync(path.join(PUB, name), buf);
      log(`${name} (${(buf.length / 1024).toFixed(1)}KB)`);
    };

    // 1) OG 카드 (홈) — [CL-BRAND-V3-20260711-183000] 감성 카피
    const ogHtml = fillOgTemplate(ogTemplate, {
      badge: '결혼 예산 · 체크리스트 · AI 상담',
      title: '웨딩셈',
      subtitle: '설레는 결혼 준비, 여기서 시작해요',
    });
    out('og-image.png', await renderPng(browser, ogHtml, 1200, 630));

    // 2) PWA 아이콘 (any) — [CL-BRAND-V4] 블러시 타일 + 마스터 마크(핑크 하트+골드 웨딩링)로 전 자산 통일
    for (const size of [512, 256, 192]) {
      out(`pwa-icon-${size}.png`, await renderPng(browser, iconHtml(size, { bg: 'blush', scale: 0.82, svg: markSvg }), size, size));
    }

    // 3) PWA maskable — 안전영역(중앙 80% 원) 안에 들어오도록 축소
    for (const size of [512, 192]) {
      out(`pwa-icon-maskable-${size}.png`, await renderPng(browser, iconHtml(size, { bg: 'blush', scale: 0.66, svg: markSvg }), size, size));
    }

    // 4) apple-touch-icon (iOS는 알파 미지원 → 불투명 블러시 타일)
    out('apple-touch-icon.png', await renderPng(browser, iconHtml(180, { bg: 'blush', scale: 0.82, svg: markSvg }), 180, 180));

    // 5) favicon.png — 투명 배경 원색 마크(Organization logo 겸용이라 512 고해상)
    out('favicon.png', await renderPng(browser, iconHtml(512, { bg: 'transparent', scale: 1.0 }), 512, 512, { transparent: true }));

    // 5b) [CL-BRAND-V2-20260711-173300] 구글 파비콘 최적화 — 신규 파일명 = URL 변경 = SERP 캐시 버스트.
    //     favicon.svg(구글 선호 벡터, mark-small 그대로 발행) + 48/96 PNG(구글 권장 48px 배수).
    writeFileSync(path.join(PUB, 'favicon.svg'), markSmallSvg);
    log(`favicon.svg (${(markSmallSvg.length / 1024).toFixed(1)}KB)`);
    for (const size of [96, 48]) {
      out(`favicon-${size}.png`, await renderPng(browser, iconHtml(size, { bg: 'transparent', scale: 0.98, svg: markSmallSvg }), size, size, { transparent: true }));
    }

    // 6) favicon.ico — 단순화 마크 16/32/48 멀티사이즈 (버퍼로만 처리, 임시파일 없음)
    const icoBufs = [];
    for (const size of [16, 32, 48]) {
      // Puppeteer screenshot 은 Uint8Array 반환 — png-to-ico 는 Buffer 가 아니면 파일 경로로 오인하므로 변환 필수
      icoBufs.push(Buffer.from(await renderPng(browser, iconHtml(size, { bg: 'transparent', scale: 0.96, svg: markSmallSvg }), size, size, { transparent: true })));
    }
    out('favicon.ico', await pngToIco(icoBufs));

    log('완료 — 골든 검증: pnpm vitest run tests/golden/brand-assets.test.ts');
  } finally {
    await browser.close();
  }
}

// 직접 실행 시에만 생성 수행 — generate-og-images.mjs 가 fillOgTemplate 을 import 해도 부작용 없도록
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((e) => {
    console.error('[brand] 실패:', e);
    process.exit(1);
  });
}

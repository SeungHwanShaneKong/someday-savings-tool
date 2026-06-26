/**
 * [CL-SSG-PRERENDER-20260531] 빌드-후 Puppeteer 프리렌더 (W1/W2/W3 + SPA 404 + 사이트맵)
 *
 * 동작:
 *  1) `vite preview`로 dist/를 로컬 서빙 (SPA fallback → 모든 경로가 index.html로 렌더)
 *  2) 헤드리스 Chromium으로 공개 라우트를 방문해 React + useSEO가 렌더/주입을 끝낼 때까지 대기
 *     (본문 마커 + canonical(trailing-slash) + #dynamic-jsonld @type 를 AND 조건으로 폴링)
 *  3) 광고/애널리틱스 네트워크 요청은 abort → 부작용/오염 차단 (스크립트 태그 자체는 보존)
 *  4) 완성된 HTML을 dist/<route>/index.html 로 기록 (루트는 dist/index.html 덮어쓰기)
 *  5) 자기 검증: 마커/canonical/JSON-LD 누락 시 빌드 실패 (회귀 가드)
 *  6) dist/404.html = 프리렌더된 홈 (비프리렌더 클라이언트 라우트 SPA 폴백)
 *  7) dist/sitemap.xml 을 라우트 매니페스트로 생성 (단일 소스)
 *
 * 실행: `node scripts/prerender.mjs` (보통 `npm run build:ssg` 로 vite build 직후 호출)
 */
import { preview } from 'vite';
import puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const BASE_DOMAIN = 'https://moderninsightspot.com'; // [CL-DOMAIN-PROMOTE-20260621] apex 승격(src/config/site.ts 와 동일 유지)
const DIST = path.join(process.cwd(), 'dist');
const PORT = 4178;
const NAV_TIMEOUT = 45000;

/** 프리렌더 + 사이트맵 단일 매니페스트.
 *  marker = 본문(#root)에 반드시 존재해야 하는 텍스트 (페이지별 H1/리드)
 *  jsonLdType = useSEO가 #dynamic-jsonld 에 주입하는 @type (없으면 null) */
const ROUTES = [
  { path: '/',                          marker: '스마트 결혼 준비 플랫폼',          jsonLdType: null, requireTypes: ['WebApplication', 'WebSite', 'Organization'] },
  { path: '/guide/',                    marker: '결혼 예산 완벽 가이드',            jsonLdType: 'HowTo' },
  { path: '/faq/',                      marker: '자주 묻는 질문',                   jsonLdType: 'FAQPage' },
  { path: '/guide/2026-wedding-cost/',  marker: '2026 결혼 평균 비용 분석',         jsonLdType: 'Article' },
  { path: '/guide/sdm-checklist/',      marker: '스드메 견적 항목별 체크리스트',    jsonLdType: 'Article' },
  { path: '/guide/budget-10million/',   marker: '예산 1,000만원으로 결혼 준비하기', jsonLdType: 'Article' },
  { path: '/guide/wedding-prep-order/', marker: '결혼 준비 순서 완벽 가이드',       jsonLdType: 'Article' },
  // [CL-ADSENSE-20260619-234411] 심화 아티클 8편 추가 (콘텐츠 확장)
  { path: '/guide/wedding-venue-types/', marker: '예식장 유형별 비용 완벽 비교',     jsonLdType: 'Article' },
  { path: '/guide/small-wedding/',       marker: '스몰웨딩 완벽 가이드',             jsonLdType: 'Article' },
  { path: '/guide/main-snap-dvd/',       marker: '본식 스냅·영상 완벽 가이드',       jsonLdType: 'Article' },
  { path: '/guide/invitation-guide/',    marker: '청첩장 준비 완벽 가이드',          jsonLdType: 'Article' },
  { path: '/guide/yedan-yemul/',         marker: '예단·예물·함 완벽 가이드',         jsonLdType: 'Article' },
  { path: '/guide/newlywed-home/',       marker: '신혼집 비용·대출 완벽 가이드',     jsonLdType: 'Article' },
  { path: '/guide/honsu-appliances/',    marker: '혼수 가전·가구 완벽 가이드',       jsonLdType: 'Article' },
  { path: '/guide/wedding-gift-money/',  marker: '축의금·하객수 완벽 가이드',        jsonLdType: 'Article' },
  // [CL-SEO-ARTICLE-FAQ-20260626] T3 신규 아티클 2편(FAQPage 동반)
  { path: '/guide/wedding-prep-timeline/',     marker: '결혼 준비 12개월 타임라인',        jsonLdType: 'Article' },
  { path: '/guide/wedding-contract-checklist/', marker: '웨딩 계약서 작성·확인 체크리스트', jsonLdType: 'Article' },
  // [CL-ADSENSE-20260619-234411] 정책/정보 페이지 (AdSense 필수)
  { path: '/privacy/',                  marker: '개인정보처리방침',                 jsonLdType: null },
  { path: '/terms/',                    marker: '이용약관',                         jsonLdType: null },
  { path: '/about/',                    marker: '웨딩셈 소개',                       jsonLdType: null },
  { path: '/contact/',                  marker: '문의하기',                         jsonLdType: null },
];

// 프리렌더 중 abort 할 외부 도메인 (광고/애널리틱스) — 태그는 DOM에 남아 유저 런타임엔 정상 로드
const BLOCK_RE = /googlesyndication|googletagmanager|google-analytics|doubleclick|adservice|adsbygoogle|pagead/i;

const log = (...a) => console.log('[prerender]', ...a);

function outFile(routePath) {
  const trimmed = routePath.replace(/^\/+|\/+$/g, '');
  return trimmed ? path.join(DIST, trimmed, 'index.html') : path.join(DIST, 'index.html');
}

// [CL-SEO-JSONLD-GUARD-20260626] 정적 HTML 에 박혀야 하는 JSON-LD @type 를 '전부' 검증(Google 은 정적 HTML 을 읽음).
//   - jsonLdType: useSEO 가 #dynamic-jsonld 에 주입하는 주 @type(대기/검증).
//   - requireTypes: 그 외 정적 블록 포함 반드시 존재해야 하는 @type 배열(예: 홈의 WebApplication/WebSite/Organization).
//   - Article/FAQPage/HowTo 페이지는 BreadcrumbList 를 동반 주입(Article.tsx/FAQ.tsx/Guide.tsx) → 자동 동반 검증.
function verify(routePath, html, marker, jsonLdType, requireTypes) {
  const errs = [];
  if (!html.includes(marker)) errs.push(`본문 마커 "${marker}" 누락`);
  if (!/rel="canonical"/i.test(html)) errs.push('canonical 태그 누락');
  if (!html.includes(`${BASE_DOMAIN}${routePath}`)) errs.push(`canonical URL ${routePath} 불일치`);
  const dynamic = jsonLdType ? [jsonLdType] : [];
  if (['Article', 'FAQPage', 'HowTo'].includes(jsonLdType)) dynamic.push('BreadcrumbList');
  const required = requireTypes ?? dynamic;
  for (const t of required) {
    if (!html.includes(`"${t}"`)) errs.push(`JSON-LD @type ${t} 누락(정적 HTML)`);
  }
  return errs;
}

function buildSitemap(lastmod) {
  const body = ROUTES.map((r) => {
    const priority = r.path === '/' ? '1.0' : r.path === '/guide/' || r.path === '/faq/' ? '0.9' : '0.8';
    const changefreq = r.path === '/' ? 'weekly' : 'monthly';
    return (
      `  <url>\n` +
      `    <loc>${BASE_DOMAIN}${r.path}</loc>\n` +
      `    <lastmod>${lastmod}</lastmod>\n` +
      `    <changefreq>${changefreq}</changefreq>\n` +
      `    <priority>${priority}</priority>\n` +
      `  </url>`
    );
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

async function run() {
  if (!existsSync(path.join(DIST, 'index.html'))) {
    throw new Error('dist/index.html 이 없습니다. 먼저 `vite build` 를 실행하세요.');
  }

  log('vite preview 서버 기동...');
  const server = await preview({ preview: { port: PORT, host: '127.0.0.1', strictPort: true } });
  const origin = server.resolvedUrls?.local?.[0]?.replace(/\/$/, '') ?? `http://127.0.0.1:${PORT}`;
  log('serving:', origin);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const captures = [];
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768 }); // < xl(1280) → 광고 사이드바 비노출
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (BLOCK_RE.test(req.url())) req.abort().catch(() => {});
      else req.continue().catch(() => {});
    });

    for (const route of ROUTES) {
      const url = origin + route.path;
      log(`→ 렌더 ${route.path}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });

      // React 렌더 + useSEO 주입 완료를 AND 조건으로 대기
      await page.waitForFunction(
        (marker, expectedCanonical, jsonLdType) => {
          const root = document.getElementById('root');
          if (!root || !root.innerText || !root.innerText.includes(marker)) return false;
          const canonical = document.querySelector('link[rel="canonical"]');
          if (!canonical || canonical.href !== expectedCanonical) return false;
          if (jsonLdType) {
            const s = document.getElementById('dynamic-jsonld');
            if (!s || !s.textContent || !s.textContent.includes('"' + jsonLdType + '"')) return false;
          }
          return true;
        },
        { timeout: NAV_TIMEOUT, polling: 'mutation' },
        route.marker,
        BASE_DOMAIN + route.path,
        route.jsonLdType,
      );

      // 최종 페인트 flush
      await new Promise((r) => setTimeout(r, 250));

      const html = await page.content();
      const errs = verify(route.path, html, route.marker, route.jsonLdType, route.requireTypes);
      if (errs.length) {
        throw new Error(`검증 실패 [${route.path}]:\n  - ${errs.join('\n  - ')}`);
      }
      captures.push({ route, html });
      log(`  ✓ 검증 통과 (${(html.length / 1024).toFixed(0)} KB)`);
    }
  } finally {
    await browser.close();
    await new Promise((res) => server.httpServer.close(res));
  }

  // 모든 캡처 성공 후 일괄 기록
  let homeHtml = null;
  for (const { route, html } of captures) {
    const file = outFile(route.path);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, html, 'utf-8');
    if (route.path === '/') homeHtml = html;
    log(`  📝 ${path.relative(DIST, file)}`);
  }

  // SPA 404 폴백 (비프리렌더 클라이언트 라우트)
  if (homeHtml) {
    writeFileSync(path.join(DIST, '404.html'), homeHtml, 'utf-8');
    log('  📝 404.html (SPA 폴백 = 홈 셸)');
  }

  // Jekyll 비활성화 보강 (public/.nojekyll 이 없을 때 대비)
  if (!existsSync(path.join(DIST, '.nojekyll'))) {
    writeFileSync(path.join(DIST, '.nojekyll'), '', 'utf-8');
  }

  // 사이트맵 단일 소스 생성
  const lastmod = new Date().toISOString().slice(0, 10);
  writeFileSync(path.join(DIST, 'sitemap.xml'), buildSitemap(lastmod), 'utf-8');
  log(`  📝 sitemap.xml (${ROUTES.length} URL, lastmod=${lastmod})`);

  log(`✅ 프리렌더 완료: ${captures.length}개 라우트`);
}

run().catch((err) => {
  console.error('[prerender] ❌', err.message || err);
  process.exit(1);
});

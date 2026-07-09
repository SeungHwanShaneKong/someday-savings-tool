// [CL-ADSENSE-CONTENT-20260630] AdSense "가치 없는 콘텐츠" 거절 극복 골든 — 원본성·E-E-A-T·깊이 회귀 가드.
//   1급 리포 자산: 모든 변경은 이 골든을 통과해야 종료. (출처 없는 수치/얕은 콘텐츠 재발 차단)
import { describe, it, expect } from 'vitest';
import { ARTICLES, getArticle, countArticleWords } from '../../src/content/articles';
import { LEGAL_PAGE_LIST, getLegalPage } from '../../src/content/legal-pages';

describe('AdSense 콘텐츠 강화 — 원본성/출처', () => {
  it('AC.1 모든 아티클은 검증 가능한 출처(sources) 또는 자체추정 방법론(methodology)을 보유', () => {
    const missing = ARTICLES.filter(
      (a) => !(a.sources && a.sources.length > 0) && !a.methodology,
    ).map((a) => a.slug);
    expect(missing).toEqual([]);
  });

  it('AC.2 모든 출처 URL 은 http(s) 절대경로(날조·상대경로 차단)', () => {
    for (const a of ARTICLES) {
      for (const s of a.sources ?? []) {
        if (s.url) expect(s.url).toMatch(/^https?:\/\//);
        expect(s.title.length).toBeGreaterThan(3);
      }
    }
  });
});

describe('AdSense 콘텐츠 강화 — 깊이/E-E-A-T', () => {
  it('AC.3 데이터/방법론 허브는 pillar 깊이(≥3,000자)', () => {
    const hub = getArticle('wedding-cost-data');
    expect(hub).toBeTruthy();
    expect(countArticleWords(hub!)).toBeGreaterThanOrEqual(3000);
  });

  it('AC.4 어떤 아티클도 빈 본문이 아니다(섹션≥3 · 본문≥800자) — 최소 품질 바닥', () => {
    const tooThin = ARTICLES.filter(
      (a) => a.sections.length < 3 || countArticleWords(a) < 800,
    ).map((a) => `${a.slug}(${countArticleWords(a)}자, ${a.sections.length}섹션)`);
    expect(tooThin).toEqual([]);
  });

  it('AC.5 편집·제작 원칙(editorial) 페이지가 존재하고 충실(섹션≥3)', () => {
    const ed = getLegalPage('editorial');
    expect(ed).toBeTruthy();
    expect(ed!.path).toBe('/editorial/');
    expect(ed!.sections.length).toBeGreaterThanOrEqual(3);
    expect(LEGAL_PAGE_LIST.some((p) => p.key === 'editorial')).toBe(true);
  });

  // [CL-ADSENSE-MAX-20260709-234500] 최대 보강 라운드 결승선 — "압도적" 기준의 기계 오라클.
  it('AC.6 전 아티클 pillar 깊이(≥4,000자) — 미달 슬러그를 글자수와 함께 열거', () => {
    const tooThin = ARTICLES.filter((a) => countArticleWords(a) < 4000)
      .map((a) => `${a.slug}(${countArticleWords(a)}자)`);
    expect(tooThin).toEqual([]);
  });

  it('AC.7 전 아티클 FAQ ≥5 (검색 의도 커버리지·FAQPage 리치결과)', () => {
    const lacking = ARTICLES.filter((a) => (a.faqs?.length ?? 0) < 5)
      .map((a) => `${a.slug}(${a.faqs?.length ?? 0}개)`);
    expect(lacking).toEqual([]);
  });

  it('AC.8 전 아티클 category 지정(허브 4분류) + contextualCta 필수·/demo 금지', () => {
    const validCategories = ['결혼 비용·데이터', '예식 준비', '예절·관계', '신혼 준비·행정'];
    const badCategory = ARTICLES.filter((a) => !validCategories.includes(a.category ?? '')).map((a) => a.slug);
    const badCta = ARTICLES.filter((a) => !a.contextualCta || a.contextualCta.to === '/demo').map((a) => a.slug);
    expect(badCategory).toEqual([]);
    expect(badCta).toEqual([]);
  });
});

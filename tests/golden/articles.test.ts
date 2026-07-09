// [CL-SEO-ARTICLE-META-20260626] 골든: 아티클 구조화데이터 무결성(순수단위 — dist 비의존).
//  getArticleJsonLd 가 Google Article 리치결과 필수/권장 필드를 항상 채우는지 전수 가드.
import { describe, it, expect } from 'vitest';
import { SITE_ORIGIN } from '../../src/config/site';
import {
  ARTICLES,
  getArticleJsonLd,
  getArticleFaqJsonLd,
  countArticleWords,
} from '../../src/content/articles';

describe('golden: Article JSON-LD 구조화데이터', () => {
  // [CL-ADSENSE-MAX-20260709-234500] 최대 보강 라운드 결승선 — 15편 증강 + 신규 13편 = 28편
  it('아티클이 28편 이상 존재(콘텐츠 충실도)', () => {
    expect(ARTICLES.length).toBeGreaterThanOrEqual(28);
  });

  for (const a of ARTICLES) {
    describe(`/guide/${a.slug}/`, () => {
      const ld = getArticleJsonLd(a);
      it('@type=Article · inLanguage=ko · articleSection 존재', () => {
        expect(ld['@type']).toBe('Article');
        expect(ld.inLanguage).toBe('ko');
        expect(typeof ld.articleSection).toBe('string');
        expect((ld.articleSection as string).length).toBeGreaterThan(0);
      });
      it('wordCount > 0 (본문 글자수 산정)', () => {
        expect(ld.wordCount).toBe(countArticleWords(a));
        expect(ld.wordCount).toBeGreaterThan(0);
      });
      it('image·mainEntityOfPage @id 가 SITE_ORIGIN 기준 정합', () => {
        expect(String(ld.image)).toContain(SITE_ORIGIN);
        expect((ld.mainEntityOfPage as { '@id': string })['@id']).toBe(`${SITE_ORIGIN}/guide/${a.slug}/`);
      });
      it('datePublished <= dateModified (날짜 역전 금지)', () => {
        expect(a.datePublished <= a.dateModified).toBe(true);
      });
      it('FAQ 가 있으면 FAQPage @type + 동일 개수 Question', () => {
        const faqLd = getArticleFaqJsonLd(a);
        if (a.faqs && a.faqs.length > 0) {
          expect(faqLd).not.toBeNull();
          expect(faqLd!['@type']).toBe('FAQPage');
          expect((faqLd!.mainEntity as unknown[]).length).toBe(a.faqs.length);
        } else {
          expect(faqLd).toBeNull();
        }
      });
    });
  }
});

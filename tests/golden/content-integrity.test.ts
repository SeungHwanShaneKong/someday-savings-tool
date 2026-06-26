// [CL-SEO-CONTENT-INTEGRITY-20260626] 골든: 아티클 데이터 무결성(순수·dist 비의존).
//  적대적 감사 — 깨진 내부링크(related)·슬러그 중복·고아 FAQ·빈 FAQ 는 silent SEO/UX 손상이므로 기계 가드.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ARTICLES, getArticle, getAllArticleSlugs } from '../../src/content/articles';
import { ARTICLE_FAQS } from '../../src/content/articles-t3';

describe('golden: 아티클 콘텐츠 무결성', () => {
  it('슬러그는 전부 유일(push 후 중복 0)', () => {
    const slugs = ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('모든 related 슬러그가 실제 아티클로 해석(깨진 내부링크 0)', () => {
    const broken: string[] = [];
    for (const a of ARTICLES) {
      for (const r of a.related) {
        if (!getArticle(r)) broken.push(`${a.slug} → ${r}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it('ARTICLE_FAQS 키는 전부 실제 슬러그(고아 키 0)', () => {
    const orphans = Object.keys(ARTICLE_FAQS).filter((s) => !getArticle(s));
    expect(orphans).toEqual([]);
  });

  it('모든 FAQ 의 q·a 는 비어있지 않음(무효 FAQPage 방지)', () => {
    const empties: string[] = [];
    for (const a of ARTICLES) {
      for (const f of a.faqs ?? []) {
        if (!f.q?.trim() || !f.a?.trim()) empties.push(a.slug);
      }
    }
    expect(empties).toEqual([]);
  });

  // [CL-AUDIT-A1-20260626] 적대적 감사: 아티클 추가 시 prerender ROUTES 누락은 프리렌더/사이트맵 silent 누락(SEO 손실).
  //  dist 비의존 단위 가드로 desync 를 빌드 전에 차단(근본수정 — silent → loud).
  it('A1: 모든 아티클 슬러그가 prerender.mjs ROUTES 에 /guide/<slug>/ 로 존재(동기화 가드)', () => {
    const src = readFileSync(path.join(process.cwd(), 'scripts', 'prerender.mjs'), 'utf-8');
    const re = /path:\s*'\/guide\/([^/']+)\/'/g;
    const routeSlugs = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) routeSlugs.add(m[1]);
    const missing = getAllArticleSlugs().filter((s) => !routeSlugs.has(s));
    expect(missing).toEqual([]);
  });
});

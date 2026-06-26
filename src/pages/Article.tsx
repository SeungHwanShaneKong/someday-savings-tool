/**
 * [CL-SSG-PRERENDER-20260531] 데이터 주도 가이드 아티클 페이지 (W6)
 * /guide/:slug — src/content/articles.ts 레지스트리에서 본문을 조회해 렌더한다.
 * 본문은 100% 정적이므로 프리렌더(scripts/prerender.mjs) 대상이며,
 * useSEO로 per-기사 canonical(trailing-slash) + Article·BreadcrumbList JSON-LD를 주입한다.
 */
import { useMemo } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/hooks/useSEO';
import Breadcrumb, { getBreadcrumbJsonLd } from '@/components/Breadcrumb';
import Footer from '@/components/Footer';
import {
  getArticle,
  getArticleJsonLd,
  getArticleFaqJsonLd,
  type Article as ArticleData,
  type ArticleBlock,
} from '@/content/articles';
import { ArrowLeft, Sparkles, Lightbulb, ChevronRight } from 'lucide-react';

/* ─── 본문 블록 렌더러 ─── */
function Block({ block }: { block: ArticleBlock }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          {block.text}
        </p>
      );
    case 'list':
      return (
        <ul className="list-disc marker:text-primary pl-5 space-y-1.5 mb-3">
          {block.items.map((item, i) => (
            <li key={i} className="text-sm text-muted-foreground leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      );
    case 'callout':
      return (
        <div className="bg-secondary/50 rounded-xl p-4 mb-3 flex gap-3">
          <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-muted-foreground leading-relaxed">{block.text}</p>
        </div>
      );
    case 'table':
      return (
        <div className="overflow-x-auto mb-3">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {block.headers.map((h, i) => (
                  <th
                    key={i}
                    className="text-left font-semibold text-foreground border-b border-border py-2 px-2 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="text-muted-foreground border-b border-border/50 py-2 px-2 align-top"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

/* ─── 관련 글 카드 ─── */
function RelatedArticles({ slugs }: { slugs: string[] }) {
  const related = slugs.map(getArticle).filter(Boolean) as ArticleData[];
  if (related.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-foreground mb-4">함께 보면 좋은 글</h2>
      <div className="space-y-2">
        {related.map((a) => (
          <Link
            key={a.slug}
            to={`/guide/${a.slug}/`}
            className="flex items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border/50 hover:border-primary/40 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{a.title}</p>
              <p className="text-xs text-muted-foreground truncate">{a.description}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ─── Article Page ─── */
export default function Article() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const article = getArticle(slug);

  const breadcrumbItems = useMemo(
    () =>
      article
        ? [
            { label: '결혼 예산 가이드', href: '/guide/' },
            { label: article.title, href: `/guide/${article.slug}/` },
          ]
        : [],
    [article]
  );

  const jsonLd = useMemo(() => {
    if (!article) return undefined;
    const faqLd = getArticleFaqJsonLd(article); // [CL-SEO-ARTICLE-FAQ-20260626] 있을 때만 FAQPage 추가
    return [
      getBreadcrumbJsonLd(breadcrumbItems),
      getArticleJsonLd(article),
      ...(faqLd ? [faqLd] : []),
    ];
  }, [article, breadcrumbItems]);

  useSEO({
    title: article?.seoTitle ?? '결혼 예산 가이드 | 웨딩셈',
    description: article?.description,
    path: article ? `/guide/${article.slug}/` : '/guide/',
    jsonLd,
  });

  // 존재하지 않는 slug → 가이드 허브로 리다이렉트
  if (!article) {
    return <Navigate to="/guide/" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* sticky header — 단일 H1 정책: 헤더는 라벨(span), 본문에만 H1 */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto">
          <button
            onClick={() => navigate('/guide/')}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="가이드 목록으로"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="flex-1 text-center text-sm font-semibold text-foreground truncate px-2">
            {article.title}
          </span>
          <div className="w-9" />
        </div>
      </header>

      <main className="flex-1 px-6 pt-6 pb-12">
        <article className="max-w-lg mx-auto">
          <Breadcrumb items={breadcrumbItems} />

          {/* Header */}
          <div className="mb-10">
            {article.badge && (
              <span className="inline-block text-xs font-medium text-primary bg-primary/10 rounded-full px-3 py-1 mb-3">
                {article.badge}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 leading-snug">
              {article.title}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{article.intro}</p>
          </div>

          {/* Sections */}
          {article.sections.map((section, si) => (
            <section key={si} className="mb-10">
              <h2 className="text-lg font-semibold text-foreground mb-3">{section.heading}</h2>
              {section.blocks.map((block, bi) => (
                <Block key={bi} block={block} />
              ))}
            </section>
          ))}

          {/* [CL-SEO-ARTICLE-FAQ-20260626] 아티클 FAQ (있을 때만) — 본문 정적 렌더 + FAQPage 리치결과 동반 */}
          {article.faqs && article.faqs.length > 0 && (
            <section className="mb-10">
              <h2 className="text-lg font-semibold text-foreground mb-4">자주 묻는 질문</h2>
              <div className="space-y-3">
                {article.faqs.map((faq, fi) => (
                  <details key={fi} className="group bg-card border border-border/50 rounded-xl px-4 py-3">
                    <summary className="text-sm font-semibold text-foreground cursor-pointer list-none flex items-center justify-between gap-2">
                      <span>{faq.q}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform group-open:rotate-90" aria-hidden="true" />
                    </summary>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-2">{faq.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* CTA */}
          <section className="text-center bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 mb-10">
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-primary" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              내 결혼 예산, 직접 계산해보세요
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              웨딩셈의 AI 예산 시뮬레이터로 항목별 비용을 평균과 비교 분석해보세요
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link to="/budget">예산 시뮬레이터로 계산하기</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/guide/">가이드 더 보기</Link>
              </Button>
            </div>
          </section>

          {/* Related */}
          <RelatedArticles slugs={article.related} />
        </article>
      </main>

      <Footer />
    </div>
  );
}

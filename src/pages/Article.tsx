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
  estimateReadingMinutes,
  type Article as ArticleData,
  type ArticleBlock,
} from '@/content/articles';
import { ArrowLeft, Sparkles, Lightbulb, ChevronRight, CalendarClock, ShieldCheck, ListChecks, BookOpen, ExternalLink, Clock, Link2 } from 'lucide-react';
// [CL-TOP20-P2-ARTICLE-20260703-020000] 아티클 소비 경험 4종(읽기시간·진행바·맞춤 CTA·앵커 복사)
import ReadingProgress from '@/components/article/ReadingProgress';
import { copyToClipboard } from '@/lib/kakao-browser';
import { toastSuccess, toastError } from '@/lib/toast';
import { trackFunnel } from '@/lib/analytics/funnel-events';

/**
 * [CL-TOP20-P2-ARTICLE-20260703-020000] 섹션 앵커 공유 계측 — GA4 표준 'share' 이벤트.
 * FunnelEvent 택소노미(funnel-events.ts)는 방문자 퍼널 전용이므로 GA4 recommended event('share')를
 * 동일 안전 원칙(gtag 부재·차단 시 무음 no-op, UX 비차단)으로 직접 전송한다.
 */
function trackAnchorShare(slug: string, sectionIndex: number): void {
  try {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
    window.gtag('event', 'share', {
      method: 'anchor_copy',
      content_type: 'article_section',
      item_id: `${slug}#sec-${sectionIndex}`,
    });
  } catch {
    /* 계측 실패는 무음 — UX 비차단 */
  }
}

/* ─── [CL-ADSENSE-CONTENT-20260630] E-E-A-T 바이라인 ─── */
function Byline({ article }: { article: ArticleData }) {
  const author = article.author ?? '웨딩셈 편집팀';
  const reviewedBy = article.reviewedBy ?? '웨딩셈 편집팀';
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground border-y border-border/50 py-3 mt-4">
      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
        <BookOpen className="w-3.5 h-3.5 text-primary" aria-hidden="true" /> {author}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> {reviewedBy} 감수
      </span>
      <span className="inline-flex items-center gap-1.5">
        <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" /> 최종 수정 {article.dateModified}
      </span>
      {/* [CL-TOP20-P2-ARTICLE-20260703-020000] 읽기시간 배지 — countArticleWords 기반 250자/분 */}
      <span data-testid="reading-time" className="inline-flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="sr-only">읽는 시간</span>약 {estimateReadingMinutes(article)}분
      </span>
      <Link to="/editorial/" className="inline-flex items-center gap-1 text-primary hover:underline">
        편집·제작 원칙
      </Link>
    </div>
  );
}

/* ─── [CL-ADSENSE-CONTENT-20260630] 목차(TOC) — 섹션 heading 기반 ─── */
function TableOfContents({ sections }: { sections: ArticleData['sections'] }) {
  if (sections.length < 3) return null; // 짧은 글은 생략
  return (
    <nav aria-label="목차" className="bg-secondary/40 rounded-xl p-4 mb-8">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2">
        <ListChecks className="w-4 h-4 text-primary" aria-hidden="true" /> 목차
      </p>
      <ol className="space-y-1.5 list-decimal marker:text-muted-foreground pl-5">
        {sections.map((s, i) => (
          <li key={i} className="text-sm">
            <a href={`#sec-${i}`} className="text-muted-foreground hover:text-primary transition-colors">
              {s.heading}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ─── [CL-ADSENSE-CONTENT-20260630] 참고 자료(출처) + 방법론 ─── */
function Sources({ article }: { article: ArticleData }) {
  if ((!article.sources || article.sources.length === 0) && !article.methodology) return null;
  return (
    <section className="mb-10 bg-card border border-border/50 rounded-2xl p-5">
      <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-1.5">
        <BookOpen className="w-4 h-4 text-primary" aria-hidden="true" /> 참고 자료 및 데이터 출처
      </h2>
      {article.sources && article.sources.length > 0 && (
        <ul className="space-y-2 mb-3">
          {article.sources.map((s, i) => (
            <li key={i} className="text-sm text-muted-foreground leading-relaxed">
              {s.url ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  {s.title} <ExternalLink className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                </a>
              ) : (
                <span className="text-foreground">{s.title}</span>
              )}
              {s.publisher && <span className="text-muted-foreground"> · {s.publisher}</span>}
              {s.note && <span className="block text-xs text-muted-foreground/80 mt-0.5">{s.note}</span>}
            </li>
          ))}
        </ul>
      )}
      {article.methodology && (
        <p className="text-xs text-muted-foreground/90 leading-relaxed border-t border-border/50 pt-3">
          <span className="font-medium text-foreground">데이터 산정 방법</span> · {article.methodology}
        </p>
      )}
    </section>
  );
}

/* ─── 본문 블록 렌더러 ─── */
function Block({ block }: { block: ArticleBlock }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          {block.text}
        </p>
      );
    // [CL-ADSENSE-CONTENT-20260630] 소제목(H3) — pillar 본문 구조화
    case 'heading3':
      return (
        <h3 className="text-base font-semibold text-foreground mt-5 mb-2 leading-snug">
          {block.text}
        </h3>
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
    // [CL-OGIMG-20260710-005500] 아티클별 OG 카드(/og/<slug>.png, 머지 루프 기본값) — 프리렌더 verify 가
    // 정적 HTML 주입을 강제. ⚠️ 병렬 작업 중 1회 소실된 이력(프리렌더가 적발) — 삭제 금지.
    image: article?.image,
  });

  // 존재하지 않는 slug → 가이드 허브로 리다이렉트
  if (!article) {
    return <Navigate to="/guide/" replace />;
  }

  // [CL-TOP20-P2-ARTICLE-20260703-020000] 섹션 앵커 복사 — TOC 와 동일한 #sec-{i} 인프라 재사용.
  // URL 은 canonical(trailing-slash) 경로 + 런타임 origin(호스트 비종속, CL-DOMAIN-PROMOTE 원칙).
  const handleCopyAnchor = async (index: number, heading: string) => {
    const url = `${window.location.origin}/guide/${article.slug}/#sec-${index}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      toastSuccess('섹션 링크를 복사했어요', { description: heading });
      trackAnchorShare(article.slug, index);
    } else {
      toastError('링크 복사에 실패했어요', { description: '주소창의 URL을 직접 복사해 주세요.' });
    }
  };

  const contextualCta = article.contextualCta; // [CL-TOP20-P2-ARTICLE-20260703-020000]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* [CL-TOP20-P2-ARTICLE-20260703-020000] 스크롤 읽기 진행바 */}
      <ReadingProgress />
      {/* header — 단일 H1 정책: 헤더는 라벨(span), 본문에만 H1.
          [CL-TOP20-P2-HEADER-20260703-024500] 전역 AppHeader 도입으로 비스티키 전환(이중 스택 방지) */}
      <header className="bg-background/80 border-b border-border/50">
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
            {/* [CL-ADSENSE-CONTENT-20260630] E-E-A-T 바이라인(저자·검수·최종수정·편집원칙) */}
            <Byline article={article} />
          </div>

          {/* [CL-ADSENSE-CONTENT-20260630] 목차 */}
          <TableOfContents sections={article.sections} />

          {/* Sections */}
          {article.sections.map((section, si) => (
            <section key={si} id={`sec-${si}`} className="mb-10 scroll-mt-28">
              {/* [CL-TOP20-P2-ARTICLE-20260703-020000] 섹션 앵커 복사 버튼 — 데스크톱은 hover/포커스 노출, 모바일(sm 미만)은 상시 노출 */}
              <div className="group flex items-start gap-1 mb-3">
                <h2 className="text-lg font-semibold text-foreground">{section.heading}</h2>
                <button
                  type="button"
                  onClick={() => handleCopyAnchor(si, section.heading)}
                  aria-label={`"${section.heading}" 섹션 링크 복사`}
                  className="p-1 mt-0.5 rounded-md text-muted-foreground hover:text-primary transition opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Link2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              {section.blocks.map((block, bi) => (
                <Block key={bi} block={block} />
              ))}
            </section>
          ))}

          {/* [CL-ADSENSE-CONTENT-20260630] 참고 자료(출처) + 자체추정 방법론 */}
          <Sources article={article} />

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

          {/* CTA — [CL-TOP20-P2-ARTICLE-20260703-020000] contextualCta 설정 시 슬러그 맞춤 브리지(+GA4 퍼널 계측), 미설정 시 기존 공통 CTA 그대로(회귀 0) */}
          <section className="text-center bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 mb-10">
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-primary" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {contextualCta ? '읽은 내용, 웨딩셈에서 바로 실행해보세요' : '내 결혼 예산, 직접 계산해보세요'}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {contextualCta
                ? contextualCta.description
                : '웨딩셈의 AI 예산 시뮬레이터로 항목별 비용을 평균과 비교 분석해보세요'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {contextualCta ? (
                <Button asChild>
                  <Link
                    to={contextualCta.to}
                    onClick={() => trackFunnel('article_cta_click', { slug: article.slug })}
                  >
                    {contextualCta.label}
                  </Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link to="/budget">예산 시뮬레이터로 계산하기</Link>
                </Button>
              )}
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

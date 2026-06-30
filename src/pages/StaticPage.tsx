/**
 * [CL-ADSENSE-20260619-234411] 정책/정보 정적 페이지 렌더러 (개인정보·약관·소개·문의)
 * src/content/legal-pages.ts 데이터를 렌더. 프리렌더 대상(본문 마커 = H1).
 * ※ 순수 추가 — 기존 라우트/로직 무변경. Article.tsx 는 건드리지 않음(자체 블록 렌더러 보유).
 */
import { useMemo } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';
import Breadcrumb, { getBreadcrumbJsonLd } from '@/components/Breadcrumb';
import Footer from '@/components/Footer';
import { getLegalPage, POLICY_LAST_UPDATED, type LegalPageSection } from '@/content/legal-pages';
import type { ArticleBlock } from '@/content/articles';

/* ─── 본문 블록 렌더러 (Article.tsx 와 동일 스타일, 자체 완결) ─── */
function Block({ block }: { block: ArticleBlock }) {
  switch (block.type) {
    case 'paragraph':
      return <p className="text-sm text-muted-foreground leading-relaxed mb-3">{block.text}</p>;
    // [CL-ADSENSE-CONTENT-20260630] 소제목(H3) 지원
    case 'heading3':
      return <h3 className="text-base font-semibold text-foreground mt-5 mb-2 leading-snug">{block.text}</h3>;
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
        <div className="bg-secondary/50 rounded-xl p-4 mb-3">
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

function Section({ section }: { section: LegalPageSection }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-foreground mb-3">{section.heading}</h2>
      {section.blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </section>
  );
}

export default function StaticPage({ pageKey }: { pageKey: string }) {
  const navigate = useNavigate();
  const page = getLegalPage(pageKey);

  const breadcrumbItems = useMemo(
    () => (page ? [{ label: page.title, href: page.path }] : []),
    [page],
  );

  const jsonLd = useMemo(
    () => (page ? [getBreadcrumbJsonLd(breadcrumbItems)] : undefined),
    [page, breadcrumbItems],
  );

  useSEO({
    title: page?.seoTitle ?? '웨딩셈',
    description: page?.description,
    path: page?.path ?? '/',
    jsonLd,
  });

  if (!page) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="홈으로"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="flex-1 text-center text-sm font-semibold text-foreground truncate px-2">
            {page.title}
          </span>
          <div className="w-9" />
        </div>
      </header>

      <main className="flex-1 px-6 pt-6 pb-12">
        <article className="max-w-lg mx-auto">
          <Breadcrumb items={breadcrumbItems} />

          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 leading-snug">
              {page.title}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{page.intro}</p>
            {page.showUpdated && (
              <p className="text-xs text-muted-foreground/70 mt-3">
                최종 개정일: {POLICY_LAST_UPDATED}
              </p>
            )}
          </div>

          {page.sections.map((section, i) => (
            <Section key={i} section={section} />
          ))}

          <div className="mt-10 pt-6 border-t border-border/50">
            <Link to="/" className="text-sm text-primary hover:underline">
              ← 웨딩셈 홈으로
            </Link>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}

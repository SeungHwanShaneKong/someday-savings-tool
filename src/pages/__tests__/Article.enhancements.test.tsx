/**
 * [CL-TOP20-P2-ARTICLE-20260703-020000] Article 소비경험 4종 테스트 (Top 20 P2-#10)
 * ①읽기시간 배지 ②읽기 진행바 마운트 ③contextualCta 맞춤/기본 CTA 분기 + GA4 퍼널 계측
 * ④섹션 앵커 복사(clipboard + toast + GA4 share 계측) ⑤CTA 데이터 무결성(경로 allowlist)
 * 기존 Article.test.tsx(A1~A7)는 회귀 앵커로 무수정 보존 — 본 파일은 가산형 신규 시나리오만 담는다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/test-utils';
import Article from '../Article';
import { ARTICLES, getArticle, estimateReadingMinutes } from '@/content/articles';
import { copyToClipboard } from '@/lib/kakao-browser';
import { toastSuccess, toastError } from '@/lib/toast';
import { trackFunnel } from '@/lib/analytics/funnel-events';

/* 토스트·클립보드·퍼널 계측은 부작용 경계 — 모킹으로 호출 계약만 검증 */
vi.mock('@/lib/toast', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastCelebrate: vi.fn(),
}));
vi.mock('@/lib/kakao-browser', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/kakao-browser')>()),
  copyToClipboard: vi.fn(async () => true),
}));
vi.mock('@/lib/analytics/funnel-events', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics/funnel-events')>()),
  trackFunnel: vi.fn(),
  trackFunnelOnce: vi.fn(),
}));

const DEFAULT_SLUG = '2026-wedding-cost'; // contextualCta 미설정(기본 CTA 회귀 앵커)
const CTA_SLUG = 'sdm-checklist'; // contextualCta 설정(/budget)

const renderArticle = (slug: string) =>
  renderWithProviders(<Article />, { route: `/guide/${slug}/`, routePath: '/guide/:slug' });

beforeEach(() => {
  vi.clearAllMocks();
  delete window.gtag;
});

describe('Article 소비경험 — ① 읽기시간 배지', () => {
  it('E1: countArticleWords 기반 "약 N분"(250자/분·최소 1분)이 바이라인에 렌더', () => {
    renderArticle(DEFAULT_SLUG);
    const minutes = estimateReadingMinutes(getArticle(DEFAULT_SLUG)!);
    expect(minutes).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('reading-time')).toHaveTextContent(`약 ${minutes}분`);
  });

  it('E2: 읽기 진행바가 아티클 페이지에 마운트(장식·aria-hidden)', () => {
    renderArticle(DEFAULT_SLUG);
    expect(screen.getByTestId('reading-progress')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('Article 소비경험 — ② 컨텍스추얼 CTA 분기', () => {
  it('E3: contextualCta 설정 슬러그 → 맞춤 라벨/목적지 렌더, 기본 CTA 라벨은 미렌더', () => {
    renderArticle(CTA_SLUG);
    const cta = getArticle(CTA_SLUG)!.contextualCta!;
    const link = screen.getByRole('link', { name: cta.label });
    expect(link).toHaveAttribute('href', cta.to);
    expect(screen.getByText(cta.description)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '예산 시뮬레이터로 계산하기' })).toBeNull();
  });

  it('E4: contextualCta 미설정 슬러그 → 기존 공통 CTA 그대로(회귀 0)', () => {
    renderArticle(DEFAULT_SLUG);
    expect(screen.getByRole('link', { name: '예산 시뮬레이터로 계산하기' })).toHaveAttribute('href', '/budget');
    expect(
      screen.getByRole('heading', { name: '내 결혼 예산, 직접 계산해보세요' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('읽은 내용, 웨딩셈에서 바로 실행해보세요')).toBeNull();
  });

  it('E5: 맞춤 CTA 클릭 → trackFunnel("article_cta_click", { slug }) 1회 계측', () => {
    renderArticle(CTA_SLUG);
    const cta = getArticle(CTA_SLUG)!.contextualCta!;
    fireEvent.click(screen.getByRole('link', { name: cta.label }));
    expect(trackFunnel).toHaveBeenCalledTimes(1);
    expect(trackFunnel).toHaveBeenCalledWith('article_cta_click', { slug: CTA_SLUG });
  });

  it('E6: [무결성] contextualCta 는 4~6편·내부 경로 allowlist·라벨/설명 비어있지 않음', () => {
    const withCta = ARTICLES.filter((a) => a.contextualCta);
    expect(withCta.length).toBeGreaterThanOrEqual(4);
    expect(withCta.length).toBeLessThanOrEqual(6);
    for (const a of withCta) {
      expect(['/budget', '/checklist', '/demo']).toContain(a.contextualCta!.to);
      expect(a.contextualCta!.label.trim().length).toBeGreaterThan(0);
      expect(a.contextualCta!.description.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('Article 소비경험 — ③ 섹션 앵커 복사', () => {
  it('E7: 모든 섹션 h2 옆에 앵커 복사 버튼 존재(개수 = sections.length)', () => {
    renderArticle(DEFAULT_SLUG);
    const buttons = screen.getAllByRole('button', { name: /섹션 링크 복사$/ });
    expect(buttons).toHaveLength(getArticle(DEFAULT_SLUG)!.sections.length);
  });

  it('E8: 앵커 버튼 클릭 → canonical URL#sec-0 클립보드 복사 + 성공 토스트 + GA4 share 계측', async () => {
    window.gtag = vi.fn();
    renderArticle(DEFAULT_SLUG);
    const [first] = screen.getAllByRole('button', { name: /섹션 링크 복사$/ });
    fireEvent.click(first);

    await waitFor(() => {
      expect(copyToClipboard).toHaveBeenCalledWith(
        `${window.location.origin}/guide/${DEFAULT_SLUG}/#sec-0`,
      );
    });
    expect(toastSuccess).toHaveBeenCalledTimes(1);
    expect(window.gtag).toHaveBeenCalledWith(
      'event',
      'share',
      expect.objectContaining({
        method: 'anchor_copy',
        content_type: 'article_section',
        item_id: `${DEFAULT_SLUG}#sec-0`,
      }),
    );
  });

  it('E9: 복사 실패 시 오류 토스트 + 계측 미발생(실패를 성공으로 집계하지 않음)', async () => {
    window.gtag = vi.fn();
    vi.mocked(copyToClipboard).mockResolvedValueOnce(false);
    renderArticle(DEFAULT_SLUG);
    const [first] = screen.getAllByRole('button', { name: /섹션 링크 복사$/ });
    fireEvent.click(first);

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('E10: gtag 부재 환경에서도 앵커 복사는 정상 동작(계측은 무음 no-op)', async () => {
    renderArticle(DEFAULT_SLUG);
    const [first] = screen.getAllByRole('button', { name: /섹션 링크 복사$/ });
    fireEvent.click(first);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledTimes(1));
  });
});

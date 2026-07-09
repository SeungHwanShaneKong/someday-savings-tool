/** [CL-ADSENSE-MAX-20260710-000500] 가이드 허브 카테고리 그룹/필터 — SEO 보존 계약 가드.
 *  핵심 계약: 기본(전체) 상태에서 ARTICLES 전 편의 링크가 DOM 에 존재해야 한다(프리렌더가 이 상태를
 *  캡처하므로, 필터가 기본 노출을 줄이면 silent SEO 손실). 필터는 클라이언트 점진 강화일 뿐. */
import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen, fireEvent, within } from '@/test/test-utils';
import Guide from '../Guide';
import { ARTICLES } from '@/content/articles';

describe('Guide — 카테고리 그룹/필터', () => {
  it('GC1: 기본(전체) 상태에서 ARTICLES 전 편의 링크가 DOM 에 존재(SEO/프리렌더 계약)', () => {
    renderWithProviders(<Guide />, { route: '/guide/' });
    const main = screen.getByRole('main');
    for (const a of ARTICLES) {
      const link = within(main)
        .getAllByRole('link')
        .find((l) => l.getAttribute('href') === `/guide/${a.slug}/`);
      expect(link, a.slug).toBeTruthy();
    }
  });

  it('GC2: 총 편수 표기가 레지스트리 길이와 일치(하드코딩 금지)', () => {
    renderWithProviders(<Guide />, { route: '/guide/' });
    expect(screen.getByText(`총 ${ARTICLES.length}편`)).toBeInTheDocument();
  });

  it('GC3: 카테고리 칩 클릭 → 해당 그룹만 표시 + aria-pressed 전환, "전체" 복귀 시 전 편 복원', () => {
    renderWithProviders(<Guide />, { route: '/guide/' });
    const filterGroup = screen.getByRole('group', { name: '가이드 카테고리 필터' });
    const chips = within(filterGroup).getAllByRole('button');
    expect(chips.length).toBeGreaterThanOrEqual(2); // 전체 + 카테고리 ≥1

    const allChip = chips[0];
    const firstCategoryChip = chips[1];
    expect(allChip).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(firstCategoryChip);
    expect(firstCategoryChip).toHaveAttribute('aria-pressed', 'true');
    expect(allChip).toHaveAttribute('aria-pressed', 'false');

    // 선택 카테고리 그룹 소속이 아닌 아티클 링크는 숨김(전 편 노출 개수보다 감소)
    const main = screen.getByRole('main');
    const visibleGuideLinks = within(main)
      .getAllByRole('link')
      .filter((l) => /^\/guide\/[^/]+\/$/.test(l.getAttribute('href') ?? ''));
    expect(visibleGuideLinks.length).toBeLessThan(ARTICLES.length);

    fireEvent.click(allChip);
    const restored = within(main)
      .getAllByRole('link')
      .filter((l) => /^\/guide\/[^/]+\/$/.test(l.getAttribute('href') ?? ''));
    expect(restored.length).toBeGreaterThanOrEqual(ARTICLES.length);
  });
});

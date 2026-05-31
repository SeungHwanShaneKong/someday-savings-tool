/** [CL-QA100-BTN-20260531] FAQ/Guide 버튼 검증 */
import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen, fireEvent, within, currentPath } from '@/test/test-utils';
import Guide from '../Guide';

describe('Guide — 버튼/네비게이션/아티클 링크', () => {
  it('G1: 헤더 "홈으로" 백버튼 클릭 → / 로 이동', () => {
    renderWithProviders(<Guide />, { route: '/guide/' });
    fireEvent.click(screen.getByRole('button', { name: '홈으로' }));
    expect(currentPath()).toBe('/');
  });

  it('G2: 백버튼 aria-label="홈으로" 접근성 노출', () => {
    renderWithProviders(<Guide />, { route: '/guide/' });
    expect(screen.getByLabelText('홈으로')).toBeInTheDocument();
  });

  it('G3: breadcrumb 홈 링크 href=/', () => {
    renderWithProviders(<Guide />, { route: '/guide/' });
    const bc = within(screen.getByRole('navigation', { name: 'Breadcrumb' }));
    expect(bc.getByRole('link', { name: '홈' })).toHaveAttribute('href', '/');
  });

  it('G4: 심화 가이드 — "2026 결혼 평균 비용 분석" 링크 href=/guide/2026-wedding-cost/', () => {
    renderWithProviders(<Guide />, { route: '/guide/' });
    expect(
      screen.getByRole('link', { name: /2026 결혼 평균 비용 분석/ }),
    ).toHaveAttribute('href', '/guide/2026-wedding-cost/');
  });

  it('G5: 심화 가이드 — "스드메 견적 항목별 체크리스트" 링크 href=/guide/sdm-checklist/', () => {
    renderWithProviders(<Guide />, { route: '/guide/' });
    expect(
      screen.getByRole('link', { name: /스드메 견적 항목별 체크리스트/ }),
    ).toHaveAttribute('href', '/guide/sdm-checklist/');
  });

  it('G6: 심화 가이드 — "예산 1,000만원" 링크 href=/guide/budget-10million/', () => {
    renderWithProviders(<Guide />, { route: '/guide/' });
    expect(
      screen.getByRole('link', { name: /예산 1,000만원으로 결혼 준비하기/ }),
    ).toHaveAttribute('href', '/guide/budget-10million/');
  });

  it('G7: 심화 가이드 — "결혼 준비 순서 완벽 가이드" 링크 href=/guide/wedding-prep-order/', () => {
    renderWithProviders(<Guide />, { route: '/guide/' });
    expect(
      screen.getByRole('link', { name: /결혼 준비 순서 완벽 가이드/ }),
    ).toHaveAttribute('href', '/guide/wedding-prep-order/');
  });

  it('G8: CTA "무료로 시작하기" 링크 href=/budget (고유, Footer 충돌 없음)', () => {
    renderWithProviders(<Guide />, { route: '/guide/' });
    expect(screen.getByRole('link', { name: '무료로 시작하기' })).toHaveAttribute('href', '/budget');
  });

  it('G9: CTA "자주 묻는 질문" 링크 href=/faq/ — main 내 CTA 섹션 scope', () => {
    renderWithProviders(<Guide />, { route: '/guide/' });
    const main = screen.getByRole('main');
    // Multiple "자주 묻는 질문" links exist (CTA + Footer); filter to those in <main>
    const links = within(main).getAllByRole('link', { name: '자주 묻는 질문' });
    // At least one in main should point to /faq/
    expect(links.some((l) => l.getAttribute('href') === '/faq/')).toBe(true);
  });
});

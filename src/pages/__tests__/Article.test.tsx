/**
 * [CL-QA100-BTN-20260531] Article(/guide/:slug) 버튼 검증 (NAVIGATION + 리다이렉트 + Link href)
 */
import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen, fireEvent, currentPath, within } from '@/test/test-utils';
import Article from '../Article';

const VALID = '/guide/2026-wedding-cost/';

describe('Article — 버튼/네비게이션', () => {
  it('A1: 유효 slug → H1 제목 렌더', () => {
    renderWithProviders(<Article />, { route: VALID, routePath: '/guide/:slug' });
    expect(screen.getByRole('heading', { level: 1, name: '2026 결혼 평균 비용 분석' })).toBeInTheDocument();
  });

  it('A2: 헤더 "가이드 목록으로" 백버튼 → /guide/ 이동', () => {
    renderWithProviders(<Article />, { route: VALID, routePath: '/guide/:slug' });
    fireEvent.click(screen.getByRole('button', { name: '가이드 목록으로' }));
    expect(currentPath()).toBe('/guide/');
  });

  it('A3: CTA "예산 시뮬레이터로 계산하기" 링크 href=/budget', () => {
    renderWithProviders(<Article />, { route: VALID, routePath: '/guide/:slug' });
    expect(screen.getByRole('link', { name: '예산 시뮬레이터로 계산하기' })).toHaveAttribute('href', '/budget');
  });

  it('A4: CTA "가이드 더 보기" 링크 href=/guide/', () => {
    renderWithProviders(<Article />, { route: VALID, routePath: '/guide/:slug' });
    expect(screen.getByRole('link', { name: '가이드 더 보기' })).toHaveAttribute('href', '/guide/');
  });

  it('A5: 관련 글 링크 — 스드메 체크리스트가 올바른 slug href', () => {
    renderWithProviders(<Article />, { route: VALID, routePath: '/guide/:slug' });
    expect(screen.getByRole('link', { name: /스드메 견적 항목별 체크리스트/ })).toHaveAttribute(
      'href',
      '/guide/sdm-checklist/',
    );
  });

  it('A6: 존재하지 않는 slug → /guide/ 로 리다이렉트', () => {
    renderWithProviders(<Article />, { route: '/guide/없는글/', routePath: '/guide/:slug' });
    expect(currentPath()).toBe('/guide/');
  });

  it('A7: breadcrumb "결혼 예산 가이드" 링크 href=/guide/ (Footer 동명 링크와 분리 위해 breadcrumb 범위로 scope)', () => {
    renderWithProviders(<Article />, { route: VALID, routePath: '/guide/:slug' });
    const bc = within(screen.getByRole('navigation', { name: 'Breadcrumb' }));
    expect(bc.getByRole('link', { name: '결혼 예산 가이드' })).toHaveAttribute('href', '/guide/');
  });
});

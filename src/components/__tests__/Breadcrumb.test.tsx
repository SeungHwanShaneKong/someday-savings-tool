/**
 * [CL-QA100-BTN-20260531] Breadcrumb 링크 + JSON-LD 유틸 검증 (NAVIGATION)
 */
import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import Breadcrumb, { getBreadcrumbJsonLd } from '../Breadcrumb';

describe('Breadcrumb — 링크/구조화데이터', () => {
  const items = [
    { label: '결혼 예산 가이드', href: '/guide/' },
    { label: '2026 결혼 평균 비용 분석', href: '/guide/2026-wedding-cost/' },
  ];

  it('B1: "홈" 링크 href=/', () => {
    renderWithProviders(<Breadcrumb items={items} />);
    expect(screen.getByRole('link', { name: '홈' })).toHaveAttribute('href', '/');
  });

  it('B2: 중간 항목은 링크(href 보유)', () => {
    renderWithProviders(<Breadcrumb items={items} />);
    expect(screen.getByRole('link', { name: '결혼 예산 가이드' })).toHaveAttribute('href', '/guide/');
  });

  it('B3: 마지막 항목은 링크 아님 + aria-current=page', () => {
    renderWithProviders(<Breadcrumb items={items} />);
    expect(screen.queryByRole('link', { name: '2026 결혼 평균 비용 분석' })).toBeNull();
    const current = screen.getByText('2026 결혼 평균 비용 분석');
    expect(current).toHaveAttribute('aria-current', 'page');
  });

  it('B4: getBreadcrumbJsonLd — 홈 prepend + position 순서', () => {
    const jsonLd = getBreadcrumbJsonLd(items);
    expect(jsonLd['@type']).toBe('BreadcrumbList');
    const list = jsonLd.itemListElement as Array<{ position: number; name: string; item?: string }>;
    expect(list).toHaveLength(3);
    expect(list[0]).toMatchObject({ position: 1, name: '홈', item: 'https://moderninsightspot.com/' });
    expect(list[2]).toMatchObject({ position: 3, name: '2026 결혼 평균 비용 분석' });
  });
});

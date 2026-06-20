// [CL-ADSENSE-20260619-234411] 정책/정보 페이지 — 렌더·AdSense 고지·데이터 무결성
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, currentPath } from '@/test/test-utils';
import StaticPage from '../StaticPage';
import { LEGAL_PAGE_LIST, getLegalPage, CONTACT_EMAIL } from '@/content/legal-pages';

vi.mock('@/hooks/useSEO', () => ({ useSEO: () => {} }));

describe('StaticPage 렌더', () => {
  it('SP.1 개인정보처리방침 — H1 + AdSense/DART 쿠키 고지 (AdSense 필수)', () => {
    renderWithProviders(<StaticPage pageKey="privacy" />, { route: '/privacy/' });
    expect(screen.getByRole('heading', { level: 1, name: '개인정보처리방침' })).toBeInTheDocument();
    expect(screen.getAllByText(/Google AdSense/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/DART/).length).toBeGreaterThan(0);
  });

  it('SP.2 이용약관 H1', () => {
    renderWithProviders(<StaticPage pageKey="terms" />, { route: '/terms/' });
    expect(screen.getByRole('heading', { level: 1, name: '이용약관' })).toBeInTheDocument();
  });

  it('SP.3 소개 H1', () => {
    renderWithProviders(<StaticPage pageKey="about" />, { route: '/about/' });
    expect(screen.getByRole('heading', { level: 1, name: '웨딩셈 소개' })).toBeInTheDocument();
  });

  it('SP.4 문의 H1 + 연락 이메일 노출', () => {
    renderWithProviders(<StaticPage pageKey="contact" />, { route: '/contact/' });
    expect(screen.getByRole('heading', { level: 1, name: '문의하기' })).toBeInTheDocument();
    const escaped = CONTACT_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    expect(screen.getByText(new RegExp(escaped))).toBeInTheDocument();
  });

  it('SP.5 알 수 없는 키 → 홈으로 리다이렉트', () => {
    renderWithProviders(<StaticPage pageKey="nope" />, { route: '/nope/' });
    expect(currentPath()).toBe('/');
  });
});

describe('legal-pages 데이터 무결성', () => {
  it('LP.1 4종 모두 존재 + 필수 필드 + trailing-slash path', () => {
    expect(LEGAL_PAGE_LIST).toHaveLength(4);
    for (const p of LEGAL_PAGE_LIST) {
      expect(p.title).toBeTruthy();
      expect(p.path).toMatch(/^\/[a-z]+\/$/);
      expect(p.sections.length).toBeGreaterThan(0);
      expect(p.seoTitle).toContain('웨딩셈');
    }
  });

  it('LP.2 getLegalPage 조회 + 미존재 undefined', () => {
    expect(getLegalPage('privacy')?.title).toBe('개인정보처리방침');
    expect(getLegalPage('terms')?.path).toBe('/terms/');
    expect(getLegalPage('nope')).toBeUndefined();
    expect(getLegalPage(undefined)).toBeUndefined();
  });
});

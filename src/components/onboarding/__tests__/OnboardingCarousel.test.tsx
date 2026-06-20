// [CL-ONBOARDING-20260619-222424] 온보딩 캐러셀 — 게이팅/도트/CTA/접근성 (OC.1~OC.7)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderWithProviders, act, screen, fireEvent } from '@/test/test-utils';
import { OnboardingCarousel } from '../OnboardingCarousel';
import { ONBOARDING_SLIDES } from '../onboarding-slides';
import { ONBOARDING_STORAGE_KEY } from '@/lib/onboarding';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

beforeEach(() => {
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const firstTitle = ONBOARDING_SLIDES[0].title;

describe('OnboardingCarousel', () => {
  it('OC.1 홈 첫 방문 → 600ms 후 표시', () => {
    renderWithProviders(<OnboardingCarousel />, { route: '/' });
    expect(screen.queryByText(firstTitle)).not.toBeInTheDocument();
    advance(700);
    expect(screen.getByText(firstTitle)).toBeInTheDocument();
  });

  it('OC.2 이미 본 사용자 → 표시 안 함', () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    renderWithProviders(<OnboardingCarousel />, { route: '/' });
    advance(700);
    expect(screen.queryByText(firstTitle)).not.toBeInTheDocument();
  });

  it('OC.3 홈이 아니면 표시 안 함', () => {
    renderWithProviders(<OnboardingCarousel />, { route: '/budget' });
    advance(700);
    expect(screen.queryByText(firstTitle)).not.toBeInTheDocument();
  });

  it('OC.4 도트 6개 + 첫 도트 aria-current', () => {
    renderWithProviders(<OnboardingCarousel />, { route: '/' });
    advance(700);
    const dots = screen.getAllByRole('button', { name: /슬라이드로 이동/ });
    expect(dots).toHaveLength(ONBOARDING_SLIDES.length);
    expect(dots[0]).toHaveAttribute('aria-current', 'true');
  });

  it('OC.5 건너뛰기 → 닫힘 + 본 것으로 기록', () => {
    renderWithProviders(<OnboardingCarousel />, { route: '/' });
    advance(700);
    fireEvent.click(screen.getByRole('button', { name: '건너뛰기' }));
    expect(screen.queryByText(firstTitle)).not.toBeInTheDocument();
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('1');
  });

  it('OC.6 마지막에서 "시작하기" 표시 + 클릭 시 닫힘', () => {
    renderWithProviders(<OnboardingCarousel />, { route: '/' });
    advance(700);
    for (let i = 0; i < ONBOARDING_SLIDES.length - 1; i++) {
      fireEvent.click(screen.getByRole('button', { name: '다음으로' }));
    }
    const start = screen.getByRole('button', { name: '시작하기' });
    fireEvent.click(start);
    expect(screen.queryByRole('button', { name: '시작하기' })).not.toBeInTheDocument();
  });

  it('OC.7 접근성: sr-only 제목 존재, aria-describedby 경고 없음', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithProviders(<OnboardingCarousel />, { route: '/' });
    advance(700);
    expect(screen.getByText('웨딩셈 기능 안내')).toBeInTheDocument();
    const ariaWarn = errSpy.mock.calls.some((c) => String(c[0]).includes('aria-describedby'));
    expect(ariaWarn).toBe(false);
    errSpy.mockRestore();
  });
});

/** [CL-QA100-BTN-20260531] 데이터 페이지 버튼 검증 — Auth 페이지 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, currentPath } from '@/test/test-utils';
import Auth from '../Auth';

// ── Supabase is globally mocked in setup.ts ──

// ── kakao-browser: 비인앱 환경으로 고정 ──
vi.mock('@/lib/kakao-browser', () => ({
  getBrowserInfo: () => ({
    isInAppBrowser: false,
    detectedApp: null,
    isIOS: false,
    isAndroid: false,
  }),
  openInExternalBrowserWithFallback: vi.fn(),
  copyToClipboard: vi.fn(async () => true),
  getAppSpecificGuide: () => ({ steps: ['1. Chrome으로 열기'] }),
}));

// ── useSEO: 부수 효과 없이 no-op ──
vi.mock('@/hooks/useSEO', () => ({ useSEO: vi.fn() }));

// ── useToast: no-op ──
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

// ── useAuth mock (hoisted via beforeEach) ──
let mockAuth: any;
beforeEach(() => {
  mockAuth = {
    user: null,
    loading: false,
    signOut: vi.fn(),
    signInWithGoogle: vi.fn(async () => ({ error: null })),
    signIn: vi.fn(async () => ({ error: null })),
    signUp: vi.fn(async () => ({ error: null })),
    session: null,
  };
});
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }: any) => children,
}));

// ── edge-function-config: no-op stubs ──
vi.mock('@/lib/edge-function-config', () => ({
  EDGE_FUNCTION_URL: 'https://test.supabase.co',
  EDGE_FUNCTION_KEY: 'test-key',
}));

describe('Auth — 버튼 / 네비게이션', () => {
  it('AU1: 뒤로가기 ArrowLeft 버튼 클릭 → "/" 으로 이동', () => {
    renderWithProviders(<Auth />, { route: '/auth' });
    // The header back button has ArrowLeft icon; it is the only icon-button in the header
    const buttons = screen.getAllByRole('button');
    // First button rendered is the ghost/icon back-button in the header
    const backBtn = buttons[0];
    fireEvent.click(backBtn);
    expect(currentPath()).toBe('/');
  });

  it('AU2: "Google로 계속하기" 버튼이 화면에 존재한다', () => {
    renderWithProviders(<Auth />, { route: '/auth' });
    expect(screen.getByText('Google로 계속하기')).toBeInTheDocument();
  });

  it('AU3: "Google로 계속하기" 버튼 클릭 → signInWithGoogle 호출', async () => {
    renderWithProviders(<Auth />, { route: '/auth' });
    const googleBtn = screen.getByText('Google로 계속하기');
    fireEvent.click(googleBtn);
    // signInWithGoogle is async; allow microtasks to flush
    await Promise.resolve();
    expect(mockAuth.signInWithGoogle).toHaveBeenCalledTimes(1);
  });
});

/** [CL-QA100-BTN-20260531] Landing/ChatFab 버튼 검증 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import { ChatFab } from '../ChatFab';

/* ─── useAuth mock (hoisted) ─── */
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

describe('ChatFab — 조건부 렌더 및 클릭', () => {
  it('CF1: 로그인 + /budget 경로 → 버튼 렌더', () => {
    mockAuth.user = { id: 'u1', email: 't@t.com' } as any;
    renderWithProviders(<ChatFab onClick={vi.fn()} />, { route: '/budget' });
    expect(screen.getByRole('button', { name: '웨딩 Q&A 열기' })).toBeInTheDocument();
  });

  it('CF2: 로그인 + /budget 경로 → 버튼 클릭 시 onClick 콜백 호출', () => {
    mockAuth.user = { id: 'u1', email: 't@t.com' } as any;
    const spy = vi.fn();
    renderWithProviders(<ChatFab onClick={spy} />, { route: '/budget' });
    fireEvent.click(screen.getByRole('button', { name: '웨딩 Q&A 열기' }));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('CF3: 로그인 + / 경로(랜딩) → 버튼 미렌더(null)', () => {
    mockAuth.user = { id: 'u1', email: 't@t.com' } as any;
    renderWithProviders(<ChatFab onClick={vi.fn()} />, { route: '/' });
    expect(screen.queryByRole('button', { name: '웨딩 Q&A 열기' })).toBeNull();
  });

  it('CF4: 미로그인 + /budget 경로 → 버튼 미렌더(null)', () => {
    // mockAuth.user is already null from beforeEach
    renderWithProviders(<ChatFab onClick={vi.fn()} />, { route: '/budget' });
    expect(screen.queryByRole('button', { name: '웨딩 Q&A 열기' })).toBeNull();
  });

  it('CF5: 로그인 + /chat 경로(풀스크린 채팅) → 버튼 미렌더(null)', () => {
    mockAuth.user = { id: 'u1', email: 't@t.com' } as any;
    renderWithProviders(<ChatFab onClick={vi.fn()} />, { route: '/chat' });
    expect(screen.queryByRole('button', { name: '웨딩 Q&A 열기' })).toBeNull();
  });
});

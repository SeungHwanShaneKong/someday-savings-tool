/** [CL-QA100-BTN-20260531] Landing/ChatFab 버튼 검증 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, within, currentPath } from '@/test/test-utils';
import Landing from '../Landing';

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

/* ─── useAIExternalNavigation mock ─── */
const mockStartNavigation = vi.fn();
vi.mock('@/hooks/useAIExternalNavigation', () => ({
  useAIExternalNavigation: () => ({
    isActive: false,
    overlayProps: { open: false, title: '' },
    startNavigation: mockStartNavigation,
  }),
}));

/* ─── useStreak mock (safe default — no Supabase calls) ─── */
vi.mock('@/hooks/useStreak', () => ({
  useStreak: () => ({
    loginStreakDays: 0,
    checklistStreakDays: 0,
    loginActiveToday: false,
    checklistActiveToday: false,
    canRestoreLogin: false,
    canRestoreChecklist: false,
    freezeTokens: 0,
    loginMilestone: 0,
    checklistMilestone: 0,
    loginNextMilestoneIn: null,
    checklistNextMilestoneIn: null,
    isLoading: false,
  }),
}));

/* ─── useSEO mock (avoid document mutations crashing jsdom) ─── */
vi.mock('@/hooks/useSEO', () => ({ useSEO: () => {} }));

/* ─── kakao-browser mock (getBrowserInfo → normal browser) ─── */
vi.mock('@/lib/kakao-browser', () => ({
  getBrowserInfo: () => ({
    isInAppBrowser: false,
    isKakaoTalk: false,
    isAndroid: false,
    isIOS: false,
    userAgent: '',
    detectedApp: null,
  }),
  openInExternalBrowserWithFallback: vi.fn(),
  copyToClipboard: vi.fn(async () => true),
  getAppSpecificGuide: () => ({ steps: [] }),
}));

/* ─── Tests ─── */
describe('Landing — 버튼/네비게이션', () => {
  it('L1: 비로그인 → CTA "무료로 시작하기" 렌더', () => {
    renderWithProviders(<Landing />);
    expect(screen.getByRole('button', { name: '무료로 시작하기' })).toBeInTheDocument();
  });

  it('L2: 로그인 → CTA "예산 관리하기" 렌더', () => {
    mockAuth.user = { id: 'u1', email: 't@t.com' } as any;
    renderWithProviders(<Landing />);
    expect(screen.getByRole('button', { name: '예산 관리하기' })).toBeInTheDocument();
  });

  it('L3: 비로그인 CTA 클릭 → /auth 로 이동', () => {
    renderWithProviders(<Landing />);
    fireEvent.click(screen.getByRole('button', { name: '무료로 시작하기' }));
    expect(currentPath()).toBe('/auth');
  });

  it('L4: 로그인 CTA 클릭 → /budget 로 이동', () => {
    mockAuth.user = { id: 'u1', email: 't@t.com' } as any;
    renderWithProviders(<Landing />);
    fireEvent.click(screen.getByRole('button', { name: '예산 관리하기' }));
    expect(currentPath()).toBe('/budget');
  });

  it('L5: "이미 계정이 있으신가요?" 버튼 클릭 → /auth 로 이동 (비로그인)', () => {
    renderWithProviders(<Landing />);
    fireEvent.click(screen.getByRole('button', { name: '이미 계정이 있으신가요?' }));
    expect(currentPath()).toBe('/auth');
  });

  it('L6: 로그인 상태에서 "이미 계정이 있으신가요?" 버튼 미노출', () => {
    mockAuth.user = { id: 'u1', email: 't@t.com' } as any;
    renderWithProviders(<Landing />);
    expect(screen.queryByRole('button', { name: '이미 계정이 있으신가요?' })).toBeNull();
  });

  it('L7: 예산 시뮬레이터 카드 클릭 → /budget 로 이동', () => {
    renderWithProviders(<Landing />);
    // cards have role=article; find the one with '예산 시뮬레이터'
    const cards = screen.getAllByRole('article');
    const budgetCard = cards.find((c) => within(c).queryByText('예산 시뮬레이터'));
    expect(budgetCard).toBeTruthy();
    fireEvent.click(budgetCard!);
    expect(currentPath()).toBe('/budget');
  });

  it('L8: D-day 체크리스트 AI 카드 클릭 → /checklist 로 이동', () => {
    renderWithProviders(<Landing />);
    const cards = screen.getAllByRole('article');
    const card = cards.find((c) => within(c).queryByText('D-day 체크리스트 AI'));
    expect(card).toBeTruthy();
    fireEvent.click(card!);
    expect(currentPath()).toBe('/checklist');
  });

  it('L9: AI Q&A 챗봇 카드 클릭 → /chat 로 이동', () => {
    renderWithProviders(<Landing />);
    const cards = screen.getAllByRole('article');
    const card = cards.find((c) => within(c).queryByText('AI Q&A 챗봇'));
    expect(card).toBeTruthy();
    fireEvent.click(card!);
    expect(currentPath()).toBe('/chat');
  });

  it('L10: 선물 추천 AI 카드 클릭 → startNavigation 호출', () => {
    renderWithProviders(<Landing />);
    const cards = screen.getAllByRole('article');
    const card = cards.find((c) => within(c).queryByText('선물 추천 AI'));
    expect(card).toBeTruthy();
    fireEvent.click(card!);
    expect(mockStartNavigation).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining('gift.moderninsightspot.com') }),
    );
  });

  it('L11: AI 허니문 큐레이션 카드 클릭 → startNavigation 호출', () => {
    renderWithProviders(<Landing />);
    const cards = screen.getAllByRole('article');
    const card = cards.find((c) => within(c).queryByText('AI 허니문 큐레이션'));
    expect(card).toBeTruthy();
    fireEvent.click(card!);
    expect(mockStartNavigation).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining('honeymoon.moderninsightspot.com') }),
    );
  });
});

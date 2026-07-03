/** [CL-QA100-BTN-20260531] Landing/ChatFab 버튼 검증 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, within, currentPath } from '@/test/test-utils';
import Landing from '../Landing';

/* ─── useAuth mock (hoisted) ─── */
// [CL-TOP20-P3-LINT-20260703-043000] 선재 any 5건 → 명시 타입(리포 lint 클린화)
type MockAuth = {
  user: { id: string; email: string } | null;
  loading: boolean;
  signOut: ReturnType<typeof vi.fn>;
  signInWithGoogle: ReturnType<typeof vi.fn>;
  signIn: ReturnType<typeof vi.fn>;
  signUp: ReturnType<typeof vi.fn>;
  session: null;
};
let mockAuth: MockAuth;
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
  AuthProvider: ({ children }: { children?: import('react').ReactNode }) => children,
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

/* ─── [CL-TOP20-P2-VERIFY-20260703-031500] useWeddingDate mock — 허브(WeddingCountdown) 렌더 시 Supabase 호출 차단 ─── */
vi.mock('@/hooks/useWeddingDate', () => ({
  useWeddingDate: () => ({
    weddingDate: null,
    weddingTime: null,
    loading: false,
    updateWeddingDate: vi.fn(async () => true),
  }),
}));

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
    mockAuth.user = { id: 'u1', email: 't@t.com' };
    renderWithProviders(<Landing />);
    expect(screen.getByRole('button', { name: '예산 관리하기' })).toBeInTheDocument();
  });

  it('L3: 비로그인 CTA 클릭 → /auth 로 이동', () => {
    renderWithProviders(<Landing />);
    fireEvent.click(screen.getByRole('button', { name: '무료로 시작하기' }));
    expect(currentPath()).toBe('/auth');
  });

  it('L4: 로그인 CTA 클릭 → /budget 로 이동', () => {
    mockAuth.user = { id: 'u1', email: 't@t.com' };
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
    mockAuth.user = { id: 'u1', email: 't@t.com' };
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

/* ─── [CL-TOP20-P2-VERIFY-20260703-031500] 허브↔방문자 도구 상호배타 게이팅 (독립검증 관찰 1 반영) ─── */
describe('로그인 허브 게이팅 (Top20 #9)', () => {
  it('비로그인: 시뮬레이터 표시 + 허브 미표시', () => {
    renderWithProviders(<Landing />);
    expect(screen.getByText('우리 결혼, 얼마나 들까요?')).toBeInTheDocument();
    expect(screen.queryByLabelText('내 결혼 준비 현황')).not.toBeInTheDocument();
  });

  it('로그인: 허브(빠른 이동 카드) 표시 + 시뮬레이터·챗프리뷰 미표시', () => {
    mockAuth.user = { id: 'u1', email: 't@t.dev' };
    renderWithProviders(<Landing />);
    expect(screen.getByLabelText('내 결혼 준비 현황')).toBeInTheDocument();
    expect(screen.getByText('예산 이어하기')).toBeInTheDocument();
    expect(screen.queryByText('우리 결혼, 얼마나 들까요?')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('AI 웨딩 챗봇 미리보기')).not.toBeInTheDocument();
  });

  it('인증 확정 전(loading): 허브·시뮬레이터 둘 다 미표시(오표시 플래시 방지)', () => {
    mockAuth.loading = true;
    renderWithProviders(<Landing />);
    expect(screen.queryByLabelText('내 결혼 준비 현황')).not.toBeInTheDocument();
    expect(screen.queryByText('우리 결혼, 얼마나 들까요?')).not.toBeInTheDocument();
  });
});

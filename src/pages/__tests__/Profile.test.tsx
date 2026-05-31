/** [CL-QA100-BTN-20260531] 데이터 페이지 버튼 검증 — Profile 페이지 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import Profile from '../Profile';

// ── useSEO: no-op ──
vi.mock('@/hooks/useSEO', () => ({ useSEO: vi.fn() }));

// ── useAuth ──
let mockAuth: any;
beforeEach(() => {
  mockAuth = {
    user: { id: 'u1', email: 't@t.com' } as any,
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

// ── useGamificationState ──
vi.mock('@/hooks/useGamificationState', () => ({
  useGamificationState: () => ({
    state: {
      level: 1,
      total_points: 0,
      login_streak_days: 0,
      checklist_streak_days: 0,
      last_login_date: '2026-05-31',
      freeze_tokens: 0,
      unlocked_badge_slugs: [] as string[],
    },
    level: 1,
    nextLevelPoints: 100,
    isLoading: false,
    error: null,
    update: vi.fn(),
    updateAsync: vi.fn(),
    addPoints: vi.fn(),
    appendUnlockedBadgeSlugs: vi.fn(),
  }),
}));

// ── useStreak ──
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

// ── useBadgeUnlock + useUserEarnedBadges ──
vi.mock('@/hooks/useBadgeUnlock', () => ({
  useBadgeUnlock: () => ({
    triggerCheck: vi.fn(async () => {}),
    pendingUnlock: null,
    dismissUnlock: vi.fn(),
    definitions: [] as any[],
    unusedAddPoints: vi.fn(),
  }),
  useUserEarnedBadges: () => ({
    data: [] as any[],
    isLoading: false,
    error: null,
  }),
}));

// ── Gamification UI components: lightweight stubs ──
vi.mock('@/components/gamification/LevelRing', () => ({
  LevelRing: ({ totalPoints }: { totalPoints: number }) => (
    <div data-testid="level-ring">pts:{totalPoints}</div>
  ),
}));
vi.mock('@/components/gamification/StreakFlame', () => ({
  StreakFlame: ({ days, variant }: { days: number; variant: string }) => (
    <div data-testid={`streak-${variant}`}>{days}</div>
  ),
}));
vi.mock('@/components/gamification/BadgeGrid', () => ({
  BadgeGrid: () => <div data-testid="badge-grid" />,
}));
vi.mock('@/components/gamification/BadgeUnlockModal', () => ({
  BadgeUnlockModal: () => null,
}));

describe('Profile — 버튼 / 네비게이션', () => {
  it('PR1: 페이지가 크래시 없이 렌더된다 (헤딩 존재)', () => {
    renderWithProviders(<Profile />, { route: '/profile' });
    expect(screen.getByRole('heading', { name: '내 웨딩 여권' })).toBeInTheDocument();
  });

  it('PR2: "뒤로" 버튼이 화면에 존재한다', () => {
    renderWithProviders(<Profile />, { route: '/profile' });
    expect(screen.getByRole('button', { name: /뒤로/ })).toBeInTheDocument();
  });

  it('PR3: "뒤로" 버튼 클릭이 크래시 없이 실행된다 (navigate(-1) 호출)', () => {
    renderWithProviders(<Profile />, { route: '/profile' });
    const backBtn = screen.getByRole('button', { name: /뒤로/ });
    // navigate(-1) stays at /profile in MemoryRouter (no previous entry),
    // so we assert no throw instead of path change
    expect(() => fireEvent.click(backBtn)).not.toThrow();
  });

  it('PR4: 유저 이메일이 화면에 표시된다', () => {
    renderWithProviders(<Profile />, { route: '/profile' });
    expect(screen.getByText(/t@t.com/)).toBeInTheDocument();
  });
});

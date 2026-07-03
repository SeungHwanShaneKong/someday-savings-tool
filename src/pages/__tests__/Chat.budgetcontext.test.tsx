/** [CL-TOP20-P4-AICHAT-20260703-040000] Chat 페이지 — 예산 컨텍스트 옵트인 토글 배선 검증 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import Chat from '../Chat';

vi.mock('@/hooks/useSEO', () => ({ useSEO: vi.fn() }));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 't@t.com' }, loading: false, session: null }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const SUMMARY = '[내 예산 현황] 총예산 5,000만원 · 결제 완료율 40%';
vi.mock('@/hooks/useChatBudgetSummary', () => ({
  useChatBudgetSummary: () => ({ summary: SUMMARY, loading: false }),
}));

// useAIChat 호출 옵션 캡처 스파이
const useAIChatSpy = vi.fn();
vi.mock('@/hooks/useAIChat', () => ({
  useAIChat: (opts: unknown) => {
    useAIChatSpy(opts);
    return {
      messages: [],
      isLoading: false,
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      messagesEndRef: { current: null },
      remainingToday: 5,
      dailyLimit: 5,
      limitReached: false,
      resetAt: null,
    };
  },
}));

vi.mock('@/components/chat/ChatContainer', () => ({
  ChatContainer: () => <div data-testid="chat-container" />,
}));

const lastOpts = () =>
  useAIChatSpy.mock.calls.at(-1)?.[0] as { budgetContext?: string | null };

beforeEach(() => {
  useAIChatSpy.mockClear();
  localStorage.clear();
});

describe('Chat — 예산 컨텍스트 옵트인 토글', () => {
  it('BC.1: 기본 ON — useAIChat 에 요약 전달 + "예산 맥락 사용 중" 칩 표시', () => {
    renderWithProviders(<Chat />, { route: '/chat' });
    expect(lastOpts().budgetContext).toBe(SUMMARY);
    expect(screen.getByText('예산 맥락 사용 중')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('BC.2: 토글 OFF → budgetContext null(미포함) + 칩 제거 + localStorage 기억', () => {
    renderWithProviders(<Chat />, { route: '/chat' });
    fireEvent.click(screen.getByRole('switch'));
    expect(lastOpts().budgetContext).toBeNull();
    expect(screen.queryByText('예산 맥락 사용 중')).toBeNull();
    expect(localStorage.getItem('wedding_chat_budget_context_optin')).toBe('0');
  });

  it('BC.3: localStorage OFF 기억 → 재방문 시 초기부터 OFF(컨텍스트 미포함)', () => {
    localStorage.setItem('wedding_chat_budget_context_optin', '0');
    renderWithProviders(<Chat />, { route: '/chat' });
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    expect(lastOpts().budgetContext).toBeNull();
  });

  it('BC.4: 다시 ON → 요약 재전달 + localStorage "1"', () => {
    localStorage.setItem('wedding_chat_budget_context_optin', '0');
    renderWithProviders(<Chat />, { route: '/chat' });
    fireEvent.click(screen.getByRole('switch'));
    expect(lastOpts().budgetContext).toBe(SUMMARY);
    expect(localStorage.getItem('wedding_chat_budget_context_optin')).toBe('1');
  });
});

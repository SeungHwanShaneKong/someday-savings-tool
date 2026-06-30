// [CL-BTNPERFECT-20260629] Chat 대화삭제 파괴적-안전 가드: 확인 다이얼로그 없이는 삭제되지 않는다(실수 방지 회귀).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/test-utils';
import Chat from '../Chat';

vi.mock('@/hooks/useSEO', () => ({ useSEO: vi.fn() }));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 't@t.com' }, loading: false, session: null }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

let mockClearMessages: ReturnType<typeof vi.fn>;
beforeEach(() => { mockClearMessages = vi.fn(async () => {}); });

vi.mock('@/hooks/useAIChat', () => ({
  useAIChat: () => ({
    messages: [{ role: 'user', content: '안녕' }, { role: 'assistant', content: '네!' }],
    isLoading: false,
    sendMessage: vi.fn(),
    clearMessages: mockClearMessages,
    messagesEndRef: { current: null },
    remainingToday: 5, dailyLimit: 5, limitReached: false, resetAt: null,
  }),
}));

vi.mock('@/components/chat/ChatContainer', () => ({
  ChatContainer: () => <div data-testid="chat-container" />,
}));

describe('Chat — 대화삭제 확인 다이얼로그(파괴적 안전)', () => {
  it('CD.1 삭제 트리거 클릭만으로는 clearMessages 호출 안 됨(확인 필요)', async () => {
    renderWithProviders(<Chat />, { route: '/chat' });
    const trigger = screen.getAllByRole('button')[1]; // back, [trash trigger]
    fireEvent.click(trigger);
    // 다이얼로그가 떠도 아직 삭제 호출 0
    await waitFor(() => expect(screen.getByText('대화 기록을 삭제할까요?')).toBeInTheDocument());
    expect(mockClearMessages).not.toHaveBeenCalled();
  });

  it('CD.2 확인(삭제) 클릭 시에만 clearMessages 1회 호출', async () => {
    renderWithProviders(<Chat />, { route: '/chat' });
    fireEvent.click(screen.getAllByRole('button')[1]);
    const confirm = await screen.findByText('삭제');
    fireEvent.click(confirm);
    await waitFor(() => expect(mockClearMessages).toHaveBeenCalledTimes(1));
  });
});

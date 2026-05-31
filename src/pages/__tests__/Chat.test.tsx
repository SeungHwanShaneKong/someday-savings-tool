/** [CL-QA100-BTN-20260531] 데이터 페이지 버튼 검증 — Chat 페이지 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, currentPath } from '@/test/test-utils';
import Chat from '../Chat';

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

// ── useAIChat: spy-backed minimal shape ──
let mockClearMessages: ReturnType<typeof vi.fn>;
let mockSendMessage: ReturnType<typeof vi.fn>;
beforeEach(() => {
  mockClearMessages = vi.fn();
  mockSendMessage = vi.fn();
});
vi.mock('@/hooks/useAIChat', () => ({
  useAIChat: () => ({
    messages: [] as any[],
    isLoading: false,
    sendMessage: mockSendMessage,
    clearMessages: mockClearMessages,
    messagesEndRef: { current: null } as any,
    remainingToday: 5,
    dailyLimit: 5,
    limitReached: false,
    resetAt: null,
  }),
}));

// ── ChatContainer: lightweight stub — renders back+clear buttons equivalent ──
// We stub only the wrapper; we rely on the real header buttons rendered by Chat.tsx itself
vi.mock('@/components/chat/ChatContainer', () => ({
  ChatContainer: ({ onSend, welcomeMessage }: any) => (
    <div data-testid="chat-container">
      <p>{welcomeMessage}</p>
      <button onClick={() => onSend('test message')}>send-test</button>
    </div>
  ),
}));

describe('Chat — 버튼 / 네비게이션', () => {
  it('CH1: 뒤로가기 버튼 클릭 → "/" 로 이동', () => {
    renderWithProviders(<Chat />, { route: '/chat' });
    // The back button is a plain <button> wrapping the ArrowLeft icon in the header
    // It is the first button element before the Trash2 clear button
    const buttons = screen.getAllByRole('button');
    // back button comes first in DOM order
    const backBtn = buttons[0];
    fireEvent.click(backBtn);
    expect(currentPath()).toBe('/');
  });

  it('CH2: "삭제" Trash2 버튼이 화면에 존재한다 (messages 비어있어 disabled)', () => {
    renderWithProviders(<Chat />, { route: '/chat' });
    // The clear button contains the Trash2 icon and is a ghost Button
    // messages=[] so it should be disabled
    const buttons = screen.getAllByRole('button');
    const trashBtn = buttons[1]; // second button in header
    expect(trashBtn).toBeInTheDocument();
    expect(trashBtn).toBeDisabled();
  });

  it('CH3: 웰컴 메시지가 ChatContainer에 전달되어 화면에 렌더된다', () => {
    renderWithProviders(<Chat />, { route: '/chat' });
    expect(screen.getByText(/웨딩셈 Q&A/)).toBeInTheDocument();
  });
});

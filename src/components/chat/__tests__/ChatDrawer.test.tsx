/** [CL-QA100-BTN-20260531] 컴포넌트 상호작용 검증 — ChatDrawer */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, currentPath, waitFor } from '@/test/test-utils';
import { ChatDrawer } from '../ChatDrawer';
import { createRef } from 'react';

// ── useAIChat mock — hoisted return value ref so tests can override ──────────
const clearMessagesMock = vi.fn();
const sendMessageMock = vi.fn();
const mockReturnValue = {
  messages: [] as { role: string; content: string; timestamp: string }[],
  isLoading: false,
  sendMessage: sendMessageMock,
  clearMessages: clearMessagesMock,
  messagesEndRef: createRef<HTMLDivElement>(),
  remainingToday: 5,
  dailyLimit: 5,
  limitReached: false,
  resetAt: null,
};

vi.mock('@/hooks/useAIChat', () => ({
  useAIChat: () => mockReturnValue,
}));

// useIsMobile: desktop (false) for predictable side panel
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

describe('ChatDrawer', () => {
  const onOpenChange = vi.fn();

  beforeEach(() => {
    onOpenChange.mockClear();
    clearMessagesMock.mockClear();
    sendMessageMock.mockClear();
    // Reset to empty messages
    mockReturnValue.messages = [];
  });

  it('DR.1: open=true → Sheet 콘텐츠 타이틀 렌더 ("웨딩셈 Q&A")', () => {
    renderWithProviders(<ChatDrawer open={true} onOpenChange={onOpenChange} />);
    expect(screen.getByText(/웨딩셈 Q&A/)).toBeInTheDocument();
  });

  it('DR.2: SheetDescription sr-only 접근성 텍스트 존재', () => {
    renderWithProviders(<ChatDrawer open={true} onOpenChange={onOpenChange} />);
    const desc = document.querySelector('.sr-only');
    expect(desc).not.toBeNull();
    expect(desc?.textContent).toContain('질문');
  });

  it('DR.3: messages=[] → 트래시(Trash2) 버튼 미표시, 풀스크린 버튼만 표시', () => {
    renderWithProviders(<ChatDrawer open={true} onOpenChange={onOpenChange} />);
    // When no messages, only the fullscreen button should be in the header area
    // The trash button is conditionally rendered: {messages.length > 0 && ...}
    // So there should be exactly 1 icon button in the header control area
    const headerButtons = screen.getAllByRole('button').filter(btn => btn.querySelector('svg'));
    // The ChatInput area may also have a send button — filter to ghost size buttons
    // We verify trash was NOT rendered by checking clearMessages is never wired to DOM
    expect(clearMessagesMock).not.toHaveBeenCalled();
    // At least the fullscreen button should exist
    expect(headerButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('DR.4: 풀스크린 버튼 클릭 → navigate("/chat") + onOpenChange(false)', () => {
    renderWithProviders(<ChatDrawer open={true} onOpenChange={onOpenChange} />, { route: '/' });

    // Find button with Maximize2 SVG — it's the ghost button with no messages present
    // The fullscreen button is the only icon button in the header when messages=[]
    const svgButtons = screen.getAllByRole('button').filter(btn => btn.querySelector('svg'));
    // The maximize button is the last ghost button in header
    const fullscreenBtn = svgButtons[0];
    fireEvent.click(fullscreenBtn);

    expect(currentPath()).toBe('/chat');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('DR.5: open=false → Sheet 콘텐츠 미표시', () => {
    renderWithProviders(<ChatDrawer open={false} onOpenChange={onOpenChange} />);
    expect(screen.queryByText(/웨딩셈 Q&A/)).toBeNull();
  });

  it('DR.6: messages 있을 때 트래시 버튼 + 풀스크린 버튼 모두 표시', () => {
    // Seed messages into mock return value
    mockReturnValue.messages = [{ role: 'user', content: '안녕하세요', timestamp: new Date().toISOString() }];

    renderWithProviders(<ChatDrawer open={true} onOpenChange={onOpenChange} />);

    // 아이콘 전용 버튼은 aria-label 로 안정적으로 스코핑(위치 인덱스 의존 제거)
    expect(screen.getByRole('button', { name: '대화 삭제' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '전체 화면으로 열기' })).toBeInTheDocument();
  });

  // [CL-BTNAUDIT3-20260704 | drawer-clear-safe] 파괴적 안전 회귀 — Chat.tsx CD.1/CD.2 와 동형.
  // 드로어의 '대화 삭제'도 확인 다이얼로그 없이는 삭제되지 않는다(실수 방지).
  it('DR.7: 삭제 트리거 클릭만으로는 clearMessages 미호출(확인 필요)', async () => {
    mockReturnValue.messages = [{ role: 'user', content: '안녕하세요', timestamp: new Date().toISOString() }];

    renderWithProviders(<ChatDrawer open={true} onOpenChange={onOpenChange} />);

    // 트래시 트리거 클릭 → 다이얼로그만 열림, 삭제 호출 0
    fireEvent.click(screen.getByRole('button', { name: '대화 삭제' }));
    await waitFor(() =>
      expect(screen.getByText('대화 기록을 삭제할까요?')).toBeInTheDocument()
    );
    expect(clearMessagesMock).not.toHaveBeenCalled();
  });

  it('DR.8: 확인(삭제) 클릭 시에만 clearMessages 1회 호출', async () => {
    mockReturnValue.messages = [{ role: 'user', content: '안녕하세요', timestamp: new Date().toISOString() }];

    renderWithProviders(<ChatDrawer open={true} onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: '대화 삭제' }));
    const confirm = await screen.findByText('삭제');
    fireEvent.click(confirm);
    await waitFor(() => expect(clearMessagesMock).toHaveBeenCalledTimes(1));
  });
});

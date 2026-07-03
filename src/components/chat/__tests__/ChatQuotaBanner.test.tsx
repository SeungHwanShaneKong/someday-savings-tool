/** [CL-TOP20-P4-AICHAT-20260703-040000] 쿼터 프리엠티브 UX — 잔여≤2 배너(세션 1회)·placeholder 잔여 표시 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRef } from 'react';
import { renderWithProviders, screen } from '@/test/test-utils';
import { ChatContainer, QUOTA_WARN_SESSION_KEY } from '../ChatContainer';
import type { ChatMessage } from '@/hooks/useAIChat';

// jsdom sessionStorage 는 환경에 따라 불완전(opaque origin) → 결정론 보장용 인메모리 폴리필
class MemoryStorage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.has(key) ? (this.store.get(key) as string) : null; }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
  removeItem(key: string) { this.store.delete(key); }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
}
for (const target of [window, globalThis]) {
  Object.defineProperty(target, 'sessionStorage', {
    value: new MemoryStorage(),
    writable: true,
    configurable: true,
  });
}

function baseProps(remainingToday: number) {
  return {
    messages: [] as ChatMessage[],
    isLoading: false,
    onSend: vi.fn(),
    messagesEndRef: createRef<HTMLDivElement>(),
    remainingToday,
    dailyLimit: 5,
    limitReached: false,
    showLimitCounter: true,
  };
}

beforeEach(() => {
  sessionStorage.clear();
});

describe('ChatContainer — 쿼터 프리엠티브 배너', () => {
  it('QB.1: 잔여 2 진입 → 안내 배너 표시 + 세션 마킹', () => {
    renderWithProviders(<ChatContainer {...baseProps(2)} />);
    expect(screen.getByText(/오늘 2회 남았어요 — 아껴서 물어보세요/)).toBeInTheDocument();
    expect(sessionStorage.getItem(QUOTA_WARN_SESSION_KEY)).toBe('1');
  });

  it('QB.2: 세션 1회 — 이미 마킹된 세션에서는 재마운트해도 배너 미표시', () => {
    sessionStorage.setItem(QUOTA_WARN_SESSION_KEY, '1');
    renderWithProviders(<ChatContainer {...baseProps(2)} />);
    expect(screen.queryByText(/아껴서 물어보세요/)).toBeNull();
  });

  it('QB.3: 잔여 5(충분) → 배너 없음·세션 마킹 없음', () => {
    renderWithProviders(<ChatContainer {...baseProps(5)} />);
    expect(screen.queryByText(/아껴서 물어보세요/)).toBeNull();
    expect(sessionStorage.getItem(QUOTA_WARN_SESSION_KEY)).toBeNull();
  });

  it('QB.4: 잔여 1 → placeholder 잔여 표시 + amber 강조 클래스', () => {
    renderWithProviders(<ChatContainer {...baseProps(1)} />);
    const input = screen.getByPlaceholderText('질문 입력 (1회 남음)');
    expect(input).toBeInTheDocument();
    expect(input.className).toContain('placeholder:text-amber-700');
  });

  it('QB.5: 잔여 2 → placeholder 잔여 표시(amber 미강조), 잔여 0(limitReached) → 프리엠티브 배너 아닌 기존 한도 배너', () => {
    const { unmount } = renderWithProviders(<ChatContainer {...baseProps(2)} />);
    const input = screen.getByPlaceholderText('질문 입력 (2회 남음)');
    expect(input.className).not.toContain('placeholder:text-amber-700');
    unmount();

    renderWithProviders(
      <ChatContainer {...baseProps(0)} limitReached={true} />
    );
    // 프리엠티브 배너 없음, 기존(불변) 한도 도달 배너만
    expect(screen.queryByText(/아껴서 물어보세요/)).toBeNull();
    expect(screen.getByText(/모두 사용하셨어요/)).toBeInTheDocument();
  });
});

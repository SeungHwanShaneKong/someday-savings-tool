/** [CL-TOP20-R50-CHAT-20260703-094000] 전송 실패 복구 UI — failed 마킹·다시 시도 재전송·429 제외
 *  R.1 네트워크 실패 → 사용자 메시지 failed 마킹 + 오류 안내 말풍선
 *  R.2 retryMessage → 중복 없이 재전송 성공(실패 메시지·오류 안내 제거 후 대체)
 *  R.3 429(쿼터 소진) → failed 마킹 없음 = "다시 시도" 버튼 미노출(쿼터 재전송 유도 방지)
 *  R.4 ChatMessage 렌더 — 실패 메시지에만 버튼, 클릭 시 onRetry(message) 호출 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import { useAIChat } from '@/hooks/useAIChat';
import { ChatMessage } from '../ChatMessage';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 't@t.com' }, loading: false, session: null }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// edgeFunctionFetch 만 스파이 교체(EdgeFunctionError 등 실물 유지) — 기존 HB 테스트와 동일 패턴
vi.mock('@/lib/edge-function-fetch', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/edge-function-fetch')>();
  return { ...actual, edgeFunctionFetch: vi.fn() };
});

import { edgeFunctionFetch, EdgeFunctionError } from '@/lib/edge-function-fetch';
const edgeMock = vi.mocked(edgeFunctionFetch);

const QUESTION = '스드메 견적은 얼마가 적당한가요?';

/** 모든 Edge 호출이 네트워크 실패(rag-query·ai-chat 폴백 모두) */
function mockNetworkFailure() {
  edgeMock.mockImplementation(async () => {
    throw new EdgeFunctionError('NETWORK_ERROR', 'AI 서비스에 연결할 수 없습니다.');
  });
}

/** 모든 Edge 호출 성공 */
function mockSuccess(reply = '성공 답변입니다') {
  edgeMock.mockImplementation(async (opts) => {
    const { functionName } = opts as { functionName: string };
    if (functionName === 'rag-query') {
      return { reply, rag_used: false, remaining: 4, limit: 5 } as never;
    }
    return { reply, remaining: 4, limit: 5 } as never;
  });
}

beforeEach(() => {
  edgeMock.mockReset();
});

describe('useAIChat — 전송 실패 복구(다시 시도)', () => {
  it('R.1: 네트워크 실패 → 사용자 메시지 failed 마킹 + 오류 안내 말풍선 추가', async () => {
    mockNetworkFailure();
    const { result } = renderHook(() => useAIChat({ feature: 'qa' }));

    await act(async () => {
      await result.current.sendMessage(QUESTION);
    });

    const userMsg = result.current.messages.find((m) => m.role === 'user');
    expect(userMsg).toBeDefined();
    expect(userMsg!.failed).toBe(true);
    // 기존 동작 보존: 오류 안내 assistant 말풍선도 함께 추가
    expect(
      result.current.messages.some(
        (m) => m.role === 'assistant' && m.content.includes('오류가 발생했어요')
      )
    ).toBe(true);
  });

  it('R.2: retryMessage → 실패 메시지·오류 안내를 제거하고 중복 없이 재전송 성공', async () => {
    mockNetworkFailure();
    const { result } = renderHook(() => useAIChat({ feature: 'qa' }));

    await act(async () => {
      await result.current.sendMessage(QUESTION);
    });
    const failedMsg = result.current.messages.find((m) => m.role === 'user' && m.failed);
    expect(failedMsg).toBeDefined();

    // 복구된 네트워크에서 재전송
    mockSuccess('성공 답변입니다');
    await act(async () => {
      await result.current.retryMessage(failedMsg!);
    });

    // 동일 내용 사용자 메시지는 정확히 1개(중복 0)
    const userMsgs = result.current.messages.filter(
      (m) => m.role === 'user' && m.content === QUESTION
    );
    expect(userMsgs).toHaveLength(1);
    expect(userMsgs[0].failed).toBeFalsy();
    // 성공 답변 추가 + 이전 오류 안내 말풍선은 제거됨
    expect(
      result.current.messages.some(
        (m) => m.role === 'assistant' && m.content === '성공 답변입니다'
      )
    ).toBe(true);
    expect(
      result.current.messages.some((m) => m.content.includes('오류가 발생했어요'))
    ).toBe(false);
  });

  it('R.3: 429(쿼터 소진) → failed 마킹 없음(재시도 버튼 미노출) + 기존 한도 안내 유지', async () => {
    edgeMock.mockImplementation(async () => {
      throw new EdgeFunctionError('CLIENT_ERROR', '오늘 질문 한도를 모두 사용했어요', 429, {
        error: '오늘 질문 한도를 모두 사용했어요',
        remaining: 0,
        limit: 5,
      });
    });
    const { result } = renderHook(() => useAIChat({ feature: 'qa' }));

    await act(async () => {
      await result.current.sendMessage(QUESTION);
    });

    const userMsg = result.current.messages.find((m) => m.role === 'user');
    expect(userMsg!.failed).toBeFalsy(); // 429는 실패 마킹 금지(기존 동작 유지)
    expect(result.current.limitReached).toBe(true);
    // 한도 안내 assistant 메시지는 기존 그대로
    expect(
      result.current.messages.some(
        (m) => m.role === 'assistant' && m.content.includes('한도')
      )
    ).toBe(true);

    // UI 레벨 확증: failed 없는 사용자 메시지엔 "다시 시도" 버튼이 렌더되지 않는다
    renderWithProviders(<ChatMessage message={userMsg!} onRetry={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /다시 시도/ })).toBeNull();
    expect(screen.queryByText('전송 실패')).toBeNull();
  });
});

describe('ChatMessage — 실패 메시지 "다시 시도" 버튼', () => {
  it('R.4: failed 사용자 메시지 → 버튼 렌더 + 클릭 시 onRetry(message) 호출', () => {
    const failedMessage = {
      role: 'user' as const,
      content: QUESTION,
      timestamp: new Date().toISOString(),
      failed: true,
    };
    const onRetry = vi.fn();
    renderWithProviders(<ChatMessage message={failedMessage} onRetry={onRetry} />);

    expect(screen.getByText('전송 실패')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: '실패한 메시지 다시 시도' });
    expect(retryBtn).toHaveTextContent('다시 시도');

    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(failedMessage);
  });
});

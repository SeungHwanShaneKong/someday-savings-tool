/** [CL-TOP20-P4-AICHAT-20260703-040000] useAIChat — 예산 컨텍스트가 ai-chat 요청 body 에 포함/미포함되는지
 *  (rag-query 실패 → ai-chat 폴백 경로에서 검증. RAG 요청 body 는 기존 그대로 { question, feature } 불변) */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAIChat } from '@/hooks/useAIChat';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 't@t.com' }, loading: false, session: null }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// edgeFunctionFetch 만 스파이로 교체(EdgeFunctionError/getUserFriendlyError 는 실물 유지)
vi.mock('@/lib/edge-function-fetch', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/edge-function-fetch')>();
  return { ...actual, edgeFunctionFetch: vi.fn() };
});

import { edgeFunctionFetch } from '@/lib/edge-function-fetch';
const edgeMock = vi.mocked(edgeFunctionFetch);

interface CapturedCall {
  functionName: string;
  body?: Record<string, unknown>;
}

beforeEach(() => {
  edgeMock.mockReset();
  // rag-query 는 미배포(실패) → ai-chat 폴백(컨텍스트가 실리는 유일한 경로)
  edgeMock.mockImplementation(async (opts) => {
    const { functionName } = opts as CapturedCall;
    if (functionName === 'rag-query') throw new Error('rag not deployed');
    return { reply: '테스트 답변', remaining: 4, limit: 5 } as never;
  });
});

function aiChatBody(): Record<string, unknown> {
  const call = edgeMock.mock.calls
    .map((c) => c[0] as CapturedCall)
    .find((c) => c.functionName === 'ai-chat');
  expect(call, 'ai-chat 호출이 없음').toBeDefined();
  return call!.body as Record<string, unknown>;
}

const SUMMARY = '[내 예산 현황] 총예산 5,000만원 · 결제 완료율 40%';

describe('useAIChat — 예산 컨텍스트 주입', () => {
  it('HB.1: budgetContext 제공(토글 ON) → ai-chat body.context.budgetSummary 포함', async () => {
    const { result } = renderHook(() =>
      useAIChat({ feature: 'qa', budgetContext: SUMMARY })
    );
    await act(async () => {
      await result.current.sendMessage('스드메 평균 비용은 얼마인가요?');
    });
    const context = aiChatBody().context as Record<string, unknown>;
    expect(context.budgetSummary).toBe(SUMMARY);
  });

  it('HB.2: budgetContext null(토글 OFF) → body.context 에 budgetSummary 부재', async () => {
    const { result } = renderHook(() =>
      useAIChat({ feature: 'qa', budgetContext: null })
    );
    await act(async () => {
      await result.current.sendMessage('스드메 평균 비용은 얼마인가요?');
    });
    const context = aiChatBody().context as Record<string, unknown>;
    expect('budgetSummary' in context).toBe(false);
  });

  it('HB.3: 공백 문자열 → 미포함(방어) + 기존 knowledgeBase 스터핑은 그대로 동작', async () => {
    const { result } = renderHook(() =>
      useAIChat({ feature: 'qa', budgetContext: '   ' })
    );
    await act(async () => {
      await result.current.sendMessage('스드메 평균 비용은 얼마인가요?');
    });
    const context = aiChatBody().context as Record<string, unknown>;
    expect('budgetSummary' in context).toBe(false);
    // 회귀 가드: 지식베이스 컨텍스트 스터핑(기존 동작) 불변
    expect(Array.isArray(context.knowledgeBase)).toBe(true);
  });

  it('HB.4: rag-query 요청 body 는 기존 그대로 { question, feature } (컨텍스트 미첨부 회귀 가드)', async () => {
    const { result } = renderHook(() =>
      useAIChat({ feature: 'qa', budgetContext: SUMMARY })
    );
    await act(async () => {
      await result.current.sendMessage('스드메 평균 비용은 얼마인가요?');
    });
    const ragCall = edgeMock.mock.calls
      .map((c) => c[0] as CapturedCall)
      .find((c) => c.functionName === 'rag-query');
    expect(ragCall).toBeDefined();
    expect(Object.keys(ragCall!.body as object).sort()).toEqual(['feature', 'question']);
  });
});

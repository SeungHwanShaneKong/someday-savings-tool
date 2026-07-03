// [EF-RESILIENCE-20260308-041500] AI Chat Hook — RAG→ai-chat 폴백 체인 보존
import { useState, useCallback, useRef, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { searchKnowledge } from '@/lib/wedding-knowledge-base';
// [CL-TOP20-P4-AICHAT-20260703-040000] 예산 컨텍스트 병합(순수 함수) — 데이터는 호출측이 주입
import { withBudgetContext } from '@/lib/chat-budget-context';
import type { Citation, FreshnessInfo } from '@/lib/rag-sources';
import {
  edgeFunctionFetch,
  getUserFriendlyError,
  EdgeFunctionError,
} from '@/lib/edge-function-fetch';

// [ZERO-COST-PIPELINE-2026-03-07] freshnessInfo 필드 추가
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: Citation[];        // RAG citations (assistant only)
  ragUsed?: boolean;             // Whether RAG was used for this response
  freshnessInfo?: FreshnessInfo; // [ZERO-COST-PIPELINE-2026-03-07] 신선도 메타
  // [CL-TOP20-R50-CHAT-20260703-094000] 네트워크/서버 실패로 전송되지 못한 사용자 메시지 마킹.
  // 429(쿼터 소진)는 마킹하지 않는다 — 재전송 유도가 오히려 해로움(한도 초과 재시도 방지).
  failed?: boolean;
}

export type AIFeature = 'honeymoon' | 'qa' | 'budget';

interface UseAIChatOptions {
  feature: AIFeature;
  context?: Record<string, unknown>;
  // [CL-TOP20-P4-AICHAT-20260703-040000] PII 없는 예산 요약 문자열(옵트인).
  // 이 훅은 DB 를 직접 조회하지 않는다 — 호출측(Chat.tsx)이 useChatBudgetSummary 로 주입.
  // null/빈 문자열이면 컨텍스트에 포함되지 않는다(토글 OFF = 호출측이 null 전달).
  budgetContext?: string | null;
}

// ── RAG 응답 타입 ──
interface RAGResponse {
  reply: string;
  citations?: Citation[];
  rag_used?: boolean;
  freshness_info?: FreshnessInfo;
  // [CL-AI-CHAT-LIMIT5-20260408-100500] 일일 한도 카운터
  remaining?: number;
  limit?: number;
}

// ── ai-chat 응답 타입 ──
interface AIChatResponse {
  reply: string;
  // [CL-AI-CHAT-LIMIT5-20260408-100500] 일일 한도 카운터
  remaining?: number;
  limit?: number;
}

// [CL-TOP20-P4-AICHAT-20260703-040000] ai_conversations 는 생성 타입에 없는 테이블 —
// 기존 `(supabase as any)` 5곳을 무스키마 클라이언트 뷰 1곳으로 대체(린트 no-explicit-any 근본 해소, 런타임 동일 인스턴스).
const untypedSupabase = supabase as unknown as SupabaseClient;

// [CL-AI-CHAT-LIMIT5-20260408-100500] 429 응답 본문 타입
interface RateLimitErrorBody {
  error?: string;
  remaining?: number;
  limit?: number;
  feature?: string;
  resetAt?: string;
}

export function useAIChat({ feature, context, budgetContext }: UseAIChatOptions) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dbAvailable = useRef(true); // Tracks if ai_conversations table exists
  // [CL-AI-CHAT-LIMIT5-20260408-100500] 일일 한도 카운터 상태
  const [remainingToday, setRemainingToday] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState<boolean>(false);
  const [resetAt, setResetAt] = useState<string | null>(null);

  // Load existing conversation
  useEffect(() => {
    if (!user || !dbAvailable.current) return;

    const loadConversation = async () => {
      try {
        const { data, error } = await untypedSupabase
          .from('ai_conversations')
          .select('*')
          .eq('user_id', user.id)
          .eq('feature', feature)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          // Table doesn't exist yet (42P01) — stop retrying silently
          if (error.code === '42P01' || error.message?.includes('relation')) {
            dbAvailable.current = false;
            return;
          }
          throw error;
        }

        if (data) {
          setConversationId(data.id);
          const savedMessages = data.messages as unknown as ChatMessage[];
          if (Array.isArray(savedMessages) && savedMessages.length > 0) {
            setMessages(savedMessages);
          }
        }
      } catch (error: unknown) {
        // Log once then suppress
        if (dbAvailable.current) {
          const e = error as { message?: string; code?: string };
          console.warn('[useAIChat] ai_conversations table not ready:', e?.message || e?.code);
          dbAvailable.current = false;
        }
      }
    };

    loadConversation();
  }, [user, feature]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  // [CL-TOP20-R50-CHAT-20260703-094000] 베이스 메시지 주입형 내부 구현 —
  // 재전송(retryMessage)이 실패 메시지를 제거한 배열 위에서 중복 없이 재전송할 수 있게 분리.
  const sendMessageWithBase = useCallback(
    async (content: string, baseMessages: ChatMessage[]) => {
      if (!user || !content.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...baseMessages, userMessage];
      setMessages(updatedMessages);
      setIsLoading(true);

      try {
        // Phase 2+3: Context stuffing + RAG for Q&A
        let enrichedContext = context || {};
        if (feature === 'qa') {
          const relevantKnowledge = searchKnowledge(content, 3);
          if (relevantKnowledge.length > 0) {
            enrichedContext = {
              ...enrichedContext,
              knowledgeBase: relevantKnowledge.map(
                (k) => `[${k.category}] Q: ${k.question}\nA: ${k.answer}`
              ),
            };
          }
          // [CL-TOP20-P4-AICHAT-20260703-040000] 옵트인 예산 요약 병합(빈/null 이면 no-op)
          enrichedContext = withBudgetContext(enrichedContext, budgetContext);
        }

        let reply: string;
        let citations: Citation[] | undefined;
        let ragUsed = false;
        // [ZERO-COST-PIPELINE-2026-03-07] 신선도 정보
        let freshnessInfo: FreshnessInfo | undefined;

        const chatBody = {
          feature,
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: enrichedContext,
        };

        // Phase 3: Try RAG query first for Q&A feature
        if (feature === 'qa') {
          try {
            const ragData = await edgeFunctionFetch<RAGResponse>({
              functionName: 'rag-query',
              timeoutMs: 45000,
              body: { question: content, feature },
            });
            reply = ragData.reply;
            citations = ragData.citations;
            ragUsed = ragData.rag_used || false;
            // [ZERO-COST-PIPELINE-2026-03-07] 신선도 정보 파싱
            freshnessInfo = ragData.freshness_info || undefined;
            // [CL-AI-CHAT-LIMIT5-20260408-100500] 한도 카운터 업데이트
            if (typeof ragData.remaining === 'number') setRemainingToday(ragData.remaining);
            if (typeof ragData.limit === 'number') setDailyLimit(ragData.limit);
          } catch (ragErr) {
            // [CL-AI-CHAT-LIMIT5-20260408-100500] RAG가 429를 반환하면 ai-chat 폴백 차단(중복 제한 우회 방지)
            if (ragErr instanceof EdgeFunctionError && ragErr.status === 429) {
              throw ragErr;
            }
            // RAG not deployed or failed — fall back to ai-chat
            const data = await edgeFunctionFetch<AIChatResponse>({
              functionName: 'ai-chat',
              timeoutMs: 45000,
              body: chatBody,
            });
            reply = data.reply;
            // [CL-AI-CHAT-LIMIT5-20260408-100500] 한도 카운터 업데이트
            if (typeof data.remaining === 'number') setRemainingToday(data.remaining);
            if (typeof data.limit === 'number') setDailyLimit(data.limit);
          }
        } else {
          // Non-Q&A features: use ai-chat directly
          const data = await edgeFunctionFetch<AIChatResponse>({
            functionName: 'ai-chat',
            timeoutMs: 45000,
            body: chatBody,
          });
          reply = data.reply;
          // [CL-AI-CHAT-LIMIT5-20260408-100500] 한도 카운터 업데이트
          if (typeof data.remaining === 'number') setRemainingToday(data.remaining);
          if (typeof data.limit === 'number') setDailyLimit(data.limit);
        }

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: reply,
          timestamp: new Date().toISOString(),
          citations,
          ragUsed,
          // [ZERO-COST-PIPELINE-2026-03-07] 신선도 메타 전달
          freshnessInfo,
        };

        const finalMessages = [...updatedMessages, assistantMessage];
        setMessages(finalMessages);

        // Save conversation to DB (skip if table doesn't exist)
        if (dbAvailable.current) {
          try {
            if (conversationId) {
              await untypedSupabase
                .from('ai_conversations')
                .update({
                  messages: finalMessages,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', conversationId);
            } else {
              const { data: newConv } = await untypedSupabase
                .from('ai_conversations')
                .insert([{
                  user_id: user.id,
                  feature,
                  messages: finalMessages,
                }])
                .select('id')
                .single();

              if (newConv) setConversationId(newConv.id);
            }
          } catch {
            // DB save failed — conversation still works in-memory
          }
        }
      } catch (error: unknown) {
        console.error('AI chat error:', error);

        // [CL-AI-CHAT-LIMIT5-20260408-100500] 429 (한도 초과) 친절한 처리
        if (error instanceof EdgeFunctionError && error.status === 429) {
          const body = (error.responseBody ?? {}) as RateLimitErrorBody;
          const limitMsg = body.error
            || `오늘의 AI Q&A 질문 ${body.limit ?? 5}회를 모두 사용하셨어요. 내일 다시 이용해주세요! 🌙`;

          setRemainingToday(0);
          setLimitReached(true);
          if (typeof body.limit === 'number') setDailyLimit(body.limit);
          if (body.resetAt) setResetAt(body.resetAt);

          const limitMessage: ChatMessage = {
            role: 'assistant',
            content: limitMsg,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, limitMessage]);

          toast({
            title: '오늘 질문을 모두 사용했어요',
            description: limitMsg,
            // 한도 도달은 에러가 아닌 정상 안내
            variant: 'default',
          });
        } else {
          const friendlyMsg = getUserFriendlyError(error);

          // Add error message
          const errorMessage: ChatMessage = {
            role: 'assistant',
            content: `죄송해요, 응답 생성 중 오류가 발생했어요. ${friendlyMsg}`,
            timestamp: new Date().toISOString(),
          };
          // [CL-TOP20-R50-CHAT-20260703-094000] 실패한 사용자 메시지에 failed 마킹(참조 동일성 매칭)
          // → ChatMessage 가 "다시 시도" 버튼을 렌더한다. 429는 위 분기에서 처리(마킹 없음).
          setMessages((prev) => [
            ...prev.map((m) => (m === userMessage ? { ...m, failed: true } : m)),
            errorMessage,
          ]);

          toast({
            title: 'AI 응답 오류',
            description: friendlyMsg,
            variant: 'destructive',
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    // [CL-TOP20-P4-AICHAT-20260703-040000] budgetContext 의존성 추가(옵트인 토글 반영)
    // [CL-TOP20-R50-CHAT-20260703-094000] messages 의존 제거 — 베이스는 파라미터로 주입
    [user, isLoading, feature, context, budgetContext, conversationId, toast]
  );

  // 공개 API: 현재 대화를 베이스로 전송(기존 시그니처 불변)
  const sendMessage = useCallback(
    (content: string) => sendMessageWithBase(content, messages),
    [messages, sendMessageWithBase]
  );

  // [CL-TOP20-R50-CHAT-20260703-094000] 실패 메시지 재전송 —
  // 실패한 사용자 메시지(+바로 뒤에 붙은 오류 안내 assistant 말풍선)를 제거한 베이스로 재전송해
  // 동일 내용이 두 번 쌓이지 않는다(중복 메시지 0 보장).
  const retryMessage = useCallback(
    (failedMessage: ChatMessage) => {
      const idx = messages.findIndex(
        (m) =>
          m === failedMessage ||
          (m.role === 'user' && !!m.failed && m.timestamp === failedMessage.timestamp)
      );
      if (idx === -1 || !messages[idx].failed) return;

      const base = messages.filter((m, i) => {
        if (i === idx) return false; // 실패한 사용자 메시지 제거(재전송으로 대체)
        if (i === idx + 1 && m.role === 'assistant') return false; // 짝지어진 오류 안내 제거
        return true;
      });
      return sendMessageWithBase(messages[idx].content, base);
    },
    [messages, sendMessageWithBase]
  );

  // Clear conversation
  const clearMessages = useCallback(async () => {
    setMessages([]);
    if (conversationId) {
      await untypedSupabase
        .from('ai_conversations')
        .update({ messages: [], updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    }
  }, [conversationId]);

  return {
    messages,
    isLoading,
    sendMessage,
    // [CL-TOP20-R50-CHAT-20260703-094000] 실패 메시지 "다시 시도" 콜백
    retryMessage,
    clearMessages,
    messagesEndRef,
    // [CL-AI-CHAT-LIMIT5-20260408-100500] 일일 한도 카운터
    remainingToday,
    dailyLimit,
    limitReached,
    resetAt,
  };
}

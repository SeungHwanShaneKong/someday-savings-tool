// [EF-RESILIENCE-20260308-041500] AI Chat Hook — RAG→ai-chat 폴백 체인 보존
import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { searchKnowledge } from '@/lib/wedding-knowledge-base';
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
}

export type AIFeature = 'honeymoon' | 'qa' | 'budget';

interface UseAIChatOptions {
  feature: AIFeature;
  context?: Record<string, unknown>;
}

// ── RAG 응답 타입 ──
interface RAGResponse {
  reply: string;
  citations?: Citation[];
  rag_used?: boolean;
  freshness_info?: FreshnessInfo;
}

// ── ai-chat 응답 타입 ──
interface AIChatResponse {
  reply: string;
}

export function useAIChat({ feature, context }: UseAIChatOptions) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dbAvailable = useRef(true); // Tracks if ai_conversations table exists

  // Load existing conversation
  useEffect(() => {
    if (!user || !dbAvailable.current) return;

    const loadConversation = async () => {
      try {
        const { data, error } = await (supabase as any)
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
      } catch (error: any) {
        // Log once then suppress
        if (dbAvailable.current) {
          console.warn('[useAIChat] ai_conversations table not ready:', error.message || error.code);
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
  const sendMessage = useCallback(
    async (content: string) => {
      if (!user || !content.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...messages, userMessage];
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
          } catch {
            // RAG not deployed or failed — fall back to ai-chat
            const data = await edgeFunctionFetch<AIChatResponse>({
              functionName: 'ai-chat',
              timeoutMs: 45000,
              body: chatBody,
            });
            reply = data.reply;
          }
        } else {
          // Non-Q&A features: use ai-chat directly
          const data = await edgeFunctionFetch<AIChatResponse>({
            functionName: 'ai-chat',
            timeoutMs: 45000,
            body: chatBody,
          });
          reply = data.reply;
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
              await (supabase as any)
                .from('ai_conversations')
                .update({
                  messages: finalMessages,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', conversationId);
            } else {
              const { data: newConv } = await (supabase as any)
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

        const friendlyMsg = getUserFriendlyError(error);

        // Add error message
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: `죄송해요, 응답 생성 중 오류가 발생했어요. ${friendlyMsg}`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);

        toast({
          title: 'AI 응답 오류',
          description: friendlyMsg,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [user, messages, isLoading, feature, context, conversationId, toast]
  );

  // Clear conversation
  const clearMessages = useCallback(async () => {
    setMessages([]);
    if (conversationId) {
      await (supabase as any)
        .from('ai_conversations')
        .update({ messages: [], updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    }
  }, [conversationId]);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    messagesEndRef,
  };
}

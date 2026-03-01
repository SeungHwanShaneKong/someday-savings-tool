import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { searchKnowledge } from '@/lib/wedding-knowledge-base';
import type { Citation } from '@/lib/rag-sources';
import { EDGE_FUNCTION_URL, EDGE_FUNCTION_KEY } from '@/lib/edge-function-config';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: Citation[];   // RAG citations (assistant only)
  ragUsed?: boolean;        // Whether RAG was used for this response
}

export type AIFeature = 'honeymoon' | 'qa' | 'budget';

interface UseAIChatOptions {
  feature: AIFeature;
  context?: Record<string, unknown>;
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

        // Get auth token
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
          throw new Error('인증이 필요합니다');
        }

        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          apikey: EDGE_FUNCTION_KEY,
        };

        let reply: string;
        let citations: Citation[] | undefined;
        let ragUsed = false;

        // Phase 3: Try RAG query first for Q&A feature
        if (feature === 'qa') {
          try {
            const ragResponse = await fetch(
              `${EDGE_FUNCTION_URL}/functions/v1/rag-query`,
              {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  question: content,
                  feature,
                }),
              }
            );

            if (ragResponse.ok) {
              const ragData = await ragResponse.json();
              reply = ragData.reply;
              citations = ragData.citations;
              ragUsed = ragData.rag_used || false;
            } else {
              throw new Error('RAG unavailable');
            }
          } catch {
            // RAG not deployed or failed — fall back to ai-chat
            const response = await fetch(
              `${EDGE_FUNCTION_URL}/functions/v1/ai-chat`,
              {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  feature,
                  messages: updatedMessages.map((m) => ({
                    role: m.role,
                    content: m.content,
                  })),
                  context: enrichedContext,
                }),
              }
            );

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || `API 오류 (${response.status})`);
            }

            const data = await response.json();
            reply = data.reply;
          }
        } else {
          // Non-Q&A features: use ai-chat directly
          const response = await fetch(
            `${EDGE_FUNCTION_URL}/functions/v1/ai-chat`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                feature,
                messages: updatedMessages.map((m) => ({
                  role: m.role,
                  content: m.content,
                })),
                context: enrichedContext,
              }),
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API 오류 (${response.status})`);
          }

          const data = await response.json();
          reply = data.reply;
        }

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: reply,
          timestamp: new Date().toISOString(),
          citations,
          ragUsed,
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
      } catch (error: any) {
        console.error('AI chat error:', error);

        // Add error message
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: `죄송해요, 응답 생성 중 오류가 발생했어요. ${error.message || '잠시 후 다시 시도해 주세요.'}`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);

        toast({
          title: 'AI 응답 오류',
          description: error.message,
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

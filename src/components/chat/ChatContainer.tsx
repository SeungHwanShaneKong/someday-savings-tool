import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import type { ChatMessage as ChatMessageType } from '@/hooks/useAIChat';
// [CL-TOP20-P4-AICHAT-20260703-040000] 스타터 프롬프트 칩 타입
import type { StarterPrompt } from '@/lib/chat-prompts';
import { cn } from '@/lib/utils';

// [CL-TOP20-P4-AICHAT-20260703-040000] 쿼터 프리엠티브 배너 — 세션 1회 노출 키
export const QUOTA_WARN_SESSION_KEY = 'wedding_chat_quota_warn_shown';

interface ChatContainerProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  onSend: (message: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  placeholder?: string;
  welcomeMessage?: string;
  className?: string;
  // [CL-AI-CHAT-LIMIT5-20260408-100500] 일일 한도 카운터 (qa 5/일)
  remainingToday?: number | null;
  dailyLimit?: number | null;
  limitReached?: boolean;
  showLimitCounter?: boolean;
  // [CL-TOP20-P4-AICHAT-20260703-040000] 빈 대화 시 노출되는 추천 질문 칩(클릭 → 즉시 전송)
  starterPrompts?: StarterPrompt[];
}

export function ChatContainer({
  messages,
  isLoading,
  onSend,
  messagesEndRef,
  placeholder,
  welcomeMessage = '안녕하세요! 결혼 준비에 관해 무엇이든 물어보세요 😊',
  className,
  remainingToday,
  dailyLimit,
  limitReached = false,
  showLimitCounter = false,
  starterPrompts,
}: ChatContainerProps) {
  // [CL-TOP20-P4-AICHAT-20260703-040000] 잔여 ≤2 진입 시 1회 안내(세션 1회, sessionStorage)
  const lowQuota =
    showLimitCounter &&
    !limitReached &&
    typeof remainingToday === 'number' &&
    remainingToday > 0 &&
    remainingToday <= 2;

  const [quotaWarnVisible, setQuotaWarnVisible] = useState(false);
  useEffect(() => {
    if (!lowQuota) return;
    let alreadyShown = false;
    try {
      alreadyShown = sessionStorage.getItem(QUOTA_WARN_SESSION_KEY) === '1';
    } catch {
      /* sessionStorage 불가 — 마운트당 1회로 degrade */
    }
    if (!alreadyShown) {
      setQuotaWarnVisible(true);
      try {
        sessionStorage.setItem(QUOTA_WARN_SESSION_KEY, '1');
      } catch {
        /* noop */
      }
    }
  }, [lowQuota]);

  // [CL-TOP20-P4-AICHAT-20260703-040000] 잔여 ≤2 → placeholder 에 잔여 표시, 마지막 1회는 amber 강조
  const effectivePlaceholder = lowQuota ? `질문 입력 (${remainingToday}회 남음)` : placeholder;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-xs">🤖</span>
            </div>
            <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-muted/50 px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
              {welcomeMessage}
            </div>
          </div>
        )}

        {/* [CL-TOP20-P4-AICHAT-20260703-040000] 스타터 프롬프트 칩 — 빈 대화에서만, 클릭 시 즉시 전송 */}
        {messages.length === 0 && !!starterPrompts?.length && (
          <div className="pl-9 flex flex-wrap gap-2" role="group" aria-label="추천 질문">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                onClick={() => onSend(prompt.question)}
                disabled={isLoading || limitReached}
                className={cn(
                  'rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary',
                  'transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {prompt.label}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-xs">🤖</span>
            </div>
            <div className="rounded-2xl rounded-bl-md bg-muted/50 px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* [CL-TOP20-P4-AICHAT-20260703-040000] 쿼터 프리엠티브 안내 배너(잔여 ≤2, 세션 1회) */}
      {quotaWarnVisible && lowQuota && (
        <div className="px-3 pt-2">
          <div
            role="status"
            className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 px-3 py-2 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2"
          >
            <span aria-hidden="true">⏳</span>
            <span className="flex-1">
              오늘 {remainingToday}회 남았어요 — 아껴서 물어보세요
            </span>
            <button
              type="button"
              onClick={() => setQuotaWarnVisible(false)}
              aria-label="안내 닫기"
              className="p-0.5 rounded hover:bg-amber-100 dark:hover:bg-amber-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* [CL-AI-CHAT-LIMIT5-20260408-100500] 한도 카운터 / 한도 도달 배너 */}
      {showLimitCounter && limitReached && (
        <div className="px-3 pt-2">
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 px-3 py-2 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <span>🌙</span>
            <span>
              오늘의 {dailyLimit ?? 5}회 질문을 모두 사용하셨어요. 내일 00시(KST)에 다시 질문할 수 있어요.
            </span>
          </div>
        </div>
      )}
      {showLimitCounter && !limitReached && typeof remainingToday === 'number' && typeof dailyLimit === 'number' && (
        <div className="px-3 pt-2 flex justify-end">
          <div
            className={cn(
              'inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full',
              remainingToday <= 1
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                : 'bg-primary/10 text-primary'
            )}
          >
            <span>오늘 남은 질문</span>
            <span className="font-semibold">{remainingToday}/{dailyLimit}</span>
          </div>
        </div>
      )}

      {/* Input — [CL-TOP20-P4-AICHAT-20260703-040000] 잔여 표시 placeholder + 마지막 1회 amber 강조 */}
      <ChatInput
        onSend={onSend}
        isLoading={isLoading}
        placeholder={effectivePlaceholder}
        disabled={limitReached}
        urgent={lowQuota && remainingToday === 1}
      />
    </div>
  );
}

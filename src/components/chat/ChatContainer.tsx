import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import type { ChatMessage as ChatMessageType } from '@/hooks/useAIChat';
import { cn } from '@/lib/utils';

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
}: ChatContainerProps) {
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

      {/* Input */}
      <ChatInput
        onSend={onSend}
        isLoading={isLoading}
        placeholder={placeholder}
        disabled={limitReached}
      />
    </div>
  );
}

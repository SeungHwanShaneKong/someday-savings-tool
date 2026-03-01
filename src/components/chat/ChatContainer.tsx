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
}

export function ChatContainer({
  messages,
  isLoading,
  onSend,
  messagesEndRef,
  placeholder,
  welcomeMessage = '안녕하세요! 결혼 준비에 관해 무엇이든 물어보세요 😊',
  className,
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

      {/* Input */}
      <ChatInput
        onSend={onSend}
        isLoading={isLoading}
        placeholder={placeholder}
      />
    </div>
  );
}

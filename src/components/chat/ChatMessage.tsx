import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/hooks/useAIChat';
import { formatInlineCitation, getConfidenceLevel, getConfidenceLabel } from '@/lib/rag-sources';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const hasCitations = !isUser && message.citations && message.citations.length > 0;
  const confidence = hasCitations
    ? getConfidenceLevel(message.citations!)
    : 'none';

  return (
    <div
      className={cn('flex gap-2.5', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-xs">🤖</span>
        </div>
      )}

      <div className="max-w-[80%]">
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted/50 text-foreground rounded-bl-md'
          )}
        >
          {/* Parse markdown-like content */}
          {message.content.split('\n').map((line, i) => (
            <p key={i} className={cn(i > 0 && 'mt-1.5')}>
              {line || '\u00A0'}
            </p>
          ))}
        </div>

        {/* RAG Citations block */}
        {hasCitations && (
          <div className="mt-1.5 px-2">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] text-muted-foreground font-medium">
                {getConfidenceLabel(confidence)}
              </span>
            </div>
            <div className="space-y-0.5">
              {message.citations!.slice(0, 3).map((citation, i) => (
                <div
                  key={i}
                  className="text-[10px] text-muted-foreground/70 flex items-start gap-1"
                >
                  <span className="text-muted-foreground/50 mt-px">📎</span>
                  <span>{formatInlineCitation(citation)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RAG indicator */}
        {!isUser && message.ragUsed && !hasCitations && (
          <div className="mt-1 px-2">
            <span className="text-[10px] text-muted-foreground/50">
              🔍 데이터 기반 응답
            </span>
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-xs">👤</span>
        </div>
      )}
    </div>
  );
}

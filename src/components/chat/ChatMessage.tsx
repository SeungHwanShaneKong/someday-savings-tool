// [ZERO-COST-PIPELINE-2026-03-07] FreshnessBadge + ComparisonTable 통합
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/hooks/useAIChat';
import {
  formatInlineCitation,
  getConfidenceLevel,
  getConfidenceLabel,
  formatFreshnessLabel,
} from '@/lib/rag-sources';
import { FreshnessBadge } from './FreshnessBadge';
import { ComparisonTable, containsMarkdownTable } from './ComparisonTable';

interface ChatMessageProps {
  message: ChatMessageType;
  // [CL-TOP20-R50-CHAT-20260703-094000] 실패한 사용자 메시지 재전송 콜백(있을 때만 버튼 렌더)
  onRetry?: (message: ChatMessageType) => void;
}

export function ChatMessage({ message, onRetry }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const hasCitations = !isUser && message.citations && message.citations.length > 0;
  const confidence = hasCitations
    ? getConfidenceLevel(message.citations!)
    : 'none';

  return (
    <div
      // [CL-ANIM-UPGRADE-20260621-150000] 메시지 입장 — 은은한 fade+slide-up
      className={cn('flex gap-2.5 animate-chat-in', isUser ? 'justify-end' : 'justify-start')}
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
          {/* [ZERO-COST-PIPELINE-2026-03-07] 마크다운 테이블 감지 → ComparisonTable */}
          {!isUser && containsMarkdownTable(message.content) ? (
            <>
              {/* 테이블 이전 텍스트 렌더링 */}
              {message.content
                .split('\n')
                .filter((line) => {
                  const t = line.trim();
                  return !(t.startsWith('|') && t.endsWith('|'));
                })
                .map((line, i) => (
                  <p key={i} className={cn(i > 0 && 'mt-1.5')}>
                    {line || '\u00A0'}
                  </p>
                ))}
              <ComparisonTable markdown={message.content} />
            </>
          ) : (
            /* 기존 텍스트 렌더링 */
            message.content.split('\n').map((line, i) => (
              <p key={i} className={cn(i > 0 && 'mt-1.5')}>
                {line || '\u00A0'}
              </p>
            ))
          )}
        </div>

        {/* [ZERO-COST-PIPELINE-2026-03-07] 신선도 배지 */}
        {!isUser && message.freshnessInfo && (
          <div className="mt-1 px-2">
            <FreshnessBadge freshnessInfo={message.freshnessInfo} />
          </div>
        )}

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
                  <span>
                    {formatInlineCitation(citation)}
                    {/* [ZERO-COST-PIPELINE-2026-03-07] 수집 시각 표시 */}
                    {citation.crawled_at && (
                      <span className="ml-1 opacity-60">
                        · {formatFreshnessLabel(citation.crawled_at)}
                      </span>
                    )}
                  </span>
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

        {/* [CL-TOP20-R50-CHAT-20260703-094000] 전송 실패 복구 UI —
            네트워크/서버 실패로 failed 마킹된 사용자 메시지에만 표시.
            429(쿼터 소진)는 failed 마킹이 없어 이 버튼이 절대 뜨지 않는다. */}
        {isUser && message.failed && (
          <div className="mt-1 px-1 flex items-center justify-end gap-1.5" role="status">
            <span className="text-[11px] text-destructive">전송 실패</span>
            {onRetry && (
              <button
                type="button"
                onClick={() => onRetry(message)}
                aria-label="실패한 메시지 다시 시도"
                className={cn(
                  'text-[11px] font-medium text-destructive underline underline-offset-2 rounded',
                  'hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50'
                )}
              >
                다시 시도
              </button>
            )}
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

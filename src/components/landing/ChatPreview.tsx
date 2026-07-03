// [CL-TOP20-P1-CHATPRE-20260703-010000] ChatPreview — 무가입 AI 챗 미리보기(정직한 캔드 데모).
// Top 20 로드맵 P1(#1 일부). 실제 AI(Edge Function) 호출은 인증 필요·비용·남용 리스크로 금지 —
// 대신 wedding-knowledge-base.ts 에서 큐레이션한 실데이터 Q&A(chat-preview-data.ts)를
// 타이핑 애니메이션으로 재생하고 "미리보기 — 실제 AI 답변 예시" 라벨로 정직하게 고지한다.
// 말풍선 스타일은 src/components/chat/ChatMessage.tsx 의 톤을 단순화해 일치시켰다.
// 접근성: reduced-motion 시 즉시 전체 표시 · 타이핑 중 말풍선은 aria-hidden,
//         완료된 답변만 sr-only role="status" 로 한 번에 안내(글자 단위 SR 스팸 방지).
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { trackFunnel } from '@/lib/analytics/funnel-events';
import { CHAT_PREVIEW_QAS, type ChatPreviewQA } from '@/lib/chat-preview-data';

/** 타이핑 속도 — 24ms 마다 2자(약 12ms/자). 전체 답변 기준 약 1.5~2초 */
const TYPE_TICK_MS = 24;
const TYPE_CHARS_PER_TICK = 2;

interface PreviewTurn {
  qa: ChatPreviewQA;
  /** 답변 출력 완료 여부 — 완료 후에만 출처 라벨·SR 안내 노출 */
  done: boolean;
}

export interface ChatPreviewProps {
  /** "더 물어보고 싶다면 → 무료 가입" CTA 클릭 콜백 (예: /auth 이동) */
  onSignupClick: () => void;
  className?: string;
}

/** '\n' 구분 답변을 ChatMessage 와 동일한 문단 스타일로 렌더 */
function AnswerLines({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <p key={i} className={cn(i > 0 && 'mt-1.5')}>
          {line || ' '}
        </p>
      ))}
    </>
  );
}

export function ChatPreview({ onSignupClick, className }: ChatPreviewProps) {
  const reduced = useReducedMotion();
  const [turns, setTurns] = useState<PreviewTurn[]>([]);
  const [askedIds, setAskedIds] = useState<string[]>([]);
  const [typing, setTyping] = useState<ChatPreviewQA | null>(null);
  const [typedLength, setTypedLength] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const askedCountRef = useRef(0);
  const limitFiredRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  /** 답변 출력 완료 — 마지막 턴 done 전환 + SR 안내 + 칩 소진 시 한도 계측(1회) */
  const completeTurn = useCallback((qa: ChatPreviewQA) => {
    setTyping(null);
    setTurns((prev) =>
      prev.map((t, i) => (i === prev.length - 1 ? { ...t, done: true } : t))
    );
    setAnnouncement(`${qa.answer} (출처: ${qa.source})`);
    if (askedCountRef.current >= CHAT_PREVIEW_QAS.length && !limitFiredRef.current) {
      limitFiredRef.current = true;
      trackFunnel('chat_preview_limit');
    }
  }, []);

  // 타이핑 진행 — reduced-motion 이면 즉시 전체 표시(인터벌 미생성)
  useEffect(() => {
    if (!typing) return;
    if (reduced) {
      completeTurn(typing);
      return;
    }
    const id = window.setInterval(() => {
      setTypedLength((n) => Math.min(n + TYPE_CHARS_PER_TICK, typing.answer.length));
    }, TYPE_TICK_MS);
    return () => window.clearInterval(id);
  }, [typing, reduced, completeTurn]);

  // 타이핑 완주 감지 → 완료 처리
  useEffect(() => {
    if (typing && typedLength >= typing.answer.length) completeTurn(typing);
  }, [typing, typedLength, completeTurn]);

  // 새 말풍선·타이핑 진행 시 최신 메시지가 보이도록 스크롤 유지
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, typedLength]);

  const handleChipClick = (qa: ChatPreviewQA, index: number) => {
    if (typing || askedIds.includes(qa.id)) return;
    askedCountRef.current += 1;
    setAskedIds((prev) => [...prev, qa.id]);
    trackFunnel('chat_preview_send', { q: index });
    setTypedLength(0);
    setTurns((prev) => [...prev, { qa, done: false }]);
    setTyping(qa);
  };

  const exhausted = askedIds.length >= CHAT_PREVIEW_QAS.length;
  const hasAnswer = turns.some((t) => t.done);

  return (
    <section
      aria-label="AI 웨딩 상담 미리보기"
      className={cn('overflow-hidden rounded-2xl border bg-card shadow-sm', className)}
    >
      {/* 헤더 — 정직한 미리보기 고지(사용자를 속이지 않는다) */}
      <div className="flex items-center gap-2.5 border-b bg-muted/30 px-4 py-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10"
          aria-hidden="true"
        >
          <span className="text-sm">🤖</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">웨딩셈 AI 상담</p>
          <p className="text-[11px] text-muted-foreground">미리보기 — 실제 AI 답변 예시</p>
        </div>
      </div>

      {/* 대화 영역 */}
      <div
        ref={scrollRef}
        role="log"
        aria-label="미리보기 대화 내용"
        className="max-h-80 space-y-3 overflow-y-auto px-4 py-4"
      >
        {/* 시작 인사 (정적) */}
        <div className="flex justify-start gap-2.5">
          <div
            className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10"
            aria-hidden="true"
          >
            <span className="text-xs">🤖</span>
          </div>
          <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-muted/50 px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
            <p>안녕하세요, 결혼 준비 AI예요. 아래 질문을 누르면 실제 답변 예시를 바로 볼 수 있어요.</p>
          </div>
        </div>

        {turns.map((turn, i) => {
          const isTypingTurn = !turn.done;
          const shown = isTypingTurn ? turn.qa.answer.slice(0, typedLength) : turn.qa.answer;
          return (
            <div key={`${turn.qa.id}-${i}`} className="space-y-3">
              {/* 사용자 말풍선 */}
              <div className="flex justify-end gap-2.5">
                <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground">
                  <p>{turn.qa.question}</p>
                </div>
                <div
                  className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/10"
                  aria-hidden="true"
                >
                  <span className="text-xs">👤</span>
                </div>
              </div>
              {/* AI 말풍선 */}
              <div className="flex justify-start gap-2.5">
                <div
                  className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10"
                  aria-hidden="true"
                >
                  <span className="text-xs">🤖</span>
                </div>
                <div className="max-w-[80%]">
                  <div
                    className="rounded-2xl rounded-bl-md bg-muted/50 px-3.5 py-2.5 text-sm leading-relaxed text-foreground"
                    aria-hidden={isTypingTurn ? true : undefined}
                  >
                    <AnswerLines text={shown} />
                    {isTypingTurn && (
                      <span
                        className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-foreground/50 align-middle"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  {turn.done && (
                    <div className="mt-1 px-2 text-[10px] text-muted-foreground/70">
                      {`📎 출처: ${turn.qa.source}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SR 전용 안내 — 완료된 답변을 한 번에 알림 */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* 질문 칩 + CTA */}
      <div className="space-y-3 border-t px-4 py-3.5">
        {!exhausted && (
          <p className="text-xs text-muted-foreground">
            궁금한 질문을 눌러보세요 · 가입 없이 볼 수 있어요
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {CHAT_PREVIEW_QAS.map((qa, i) => {
            const used = askedIds.includes(qa.id);
            return (
              <button
                key={qa.id}
                type="button"
                onClick={() => handleChipClick(qa, i)}
                disabled={used || typing !== null}
                className={cn(
                  'rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors',
                  'hover:border-primary/40 hover:bg-primary/5',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-40'
                )}
              >
                {qa.question}
              </button>
            );
          })}
        </div>
        {exhausted && !typing && (
          <p className="text-xs text-muted-foreground">
            미리보기 질문을 모두 확인하셨어요. 가입하면 내 상황에 맞춘 질문을 이어갈 수 있어요.
          </p>
        )}
        {hasAnswer && (
          <Button type="button" size="sm" className="w-full" onClick={onSignupClick}>
            더 물어보고 싶다면 → 무료 가입
          </Button>
        )}
      </div>
    </section>
  );
}

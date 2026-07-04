import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useAIChat } from '@/hooks/useAIChat';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { useSEO } from '@/hooks/useSEO';
// [CL-TOP20-P4-AICHAT-20260703-040000] AI 챗 개인화 3종 — 예산 컨텍스트(옵트인)·스타터 칩
import { useChatBudgetSummary } from '@/hooks/useChatBudgetSummary';
import { getBudgetContextOptIn, setBudgetContextOptIn } from '@/lib/chat-budget-context';
import { STARTER_PROMPTS } from '@/lib/chat-prompts';
// [CL-BTNPERFECT-20260629] 대화 전체 삭제는 파괴적·비가역 → 확인 다이얼로그 + useAsyncAction(더블서밋 차단·실패 토스트)
import { useAsyncAction } from '@/hooks/useAsyncAction';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function Chat() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useSEO({
    title: 'AI 상담 - 웨딩셈',
    description: '결혼 준비에 대한 궁금한 점을 AI에게 물어보세요. 예산, 일정, 웨딩 트렌드 등 맞춤 상담.',
    path: '/chat',
  });

  // [CL-TOP20-P4-AICHAT-20260703-040000] "내 예산 참고" 옵트인(기본 ON, localStorage 기억)
  const [budgetRefEnabled, setBudgetRefEnabled] = useState<boolean>(() => getBudgetContextOptIn());
  const handleBudgetRefChange = (enabled: boolean) => {
    setBudgetRefEnabled(enabled);
    setBudgetContextOptIn(enabled);
  };
  // 읽기 전용 요약 훅(자동 생성/실시간 구독 없음) — OFF 면 조회 자체를 건너뜀
  // [CL-TOP20-R50-CHAT-20260703-094000] loading 구독 — 로딩 중 뮤트 칩 표시
  const { summary: budgetSummary, loading: budgetLoading } = useChatBudgetSummary({
    enabled: budgetRefEnabled,
  });

  const {
    messages,
    isLoading,
    sendMessage,
    // [CL-TOP20-R50-CHAT-20260703-094000] 실패 메시지 재전송
    retryMessage,
    clearMessages,
    messagesEndRef,
    // [CL-AI-CHAT-LIMIT5-20260408-100500] 일일 한도 카운터 (qa = 5/일)
    remainingToday,
    dailyLimit,
    limitReached,
  } = useAIChat({
    feature: 'qa',
    // [CL-TOP20-P4-AICHAT-20260703-040000] 토글 OFF → null(컨텍스트 미포함 보장)
    budgetContext: budgetRefEnabled ? budgetSummary : null,
  });

  // [CL-BTNPERFECT-20260629] 대화 삭제 — 동기 게이트(더블서밋)+실패 시 표준 토스트
  const clear = useAsyncAction(async () => { await clearMessages(); }, {
    toastOnError: '대화 삭제에 실패했어요. 잠시 후 다시 시도해주세요.',
  });

  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <button
            onClick={() => navigate('/')} /* [CL-HOME-BTN-20260315-140000] */
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="홈으로 돌아가기" /* [CL-BTNAUDIT3-20260704 | 뒤로 접근명] */
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <h1 className="text-base font-semibold text-foreground">
            💬 웨딩셈 Q&A
          </h1>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                disabled={messages.length === 0 || clear.pending}
                aria-label="대화 기록 삭제"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>대화 기록을 삭제할까요?</AlertDialogTitle>
                <AlertDialogDescription>
                  지금까지의 모든 Q&amp;A 대화가 삭제돼요. 이 작업은 되돌릴 수 없어요.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={() => clear.run()} className="bg-destructive hover:bg-destructive/90">
                  삭제
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {/* [CL-TOP20-P4-AICHAT-20260703-040000] 예산 컨텍스트 옵트인 토글 + 사용 중 칩 */}
        <div className="flex items-center justify-between gap-2 px-4 pb-2 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <Switch
              id="budget-context-toggle"
              checked={budgetRefEnabled}
              onCheckedChange={handleBudgetRefChange}
              aria-describedby="budget-context-desc"
            />
            <label
              htmlFor="budget-context-toggle"
              className="text-xs font-medium text-foreground cursor-pointer"
            >
              내 예산 참고
            </label>
            <span id="budget-context-desc" className="sr-only">
              켜면 총예산·상위 지출·결제 완료율 요약을 AI 답변에 참고합니다. 개인 식별 정보는 전송되지 않아요.
            </span>
          </div>
          {/* [CL-TOP20-R50-CHAT-20260703-094000] 로딩 중 뮤트 칩(스켈레톤 톤) — 완료 후 사용 중 칩으로 전환 */}
          {budgetRefEnabled && budgetLoading && (
            <span
              role="status"
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground animate-pulse"
            >
              <span aria-hidden="true">⏳</span> 예산 불러오는 중…
            </span>
          )}
          {budgetRefEnabled && !budgetLoading && budgetSummary && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
              <span aria-hidden="true">📊</span> 예산 맥락 사용 중
            </span>
          )}
        </div>
      </header>

      {/* Chat */}
      <ChatContainer
        messages={messages}
        isLoading={isLoading}
        onSend={sendMessage}
        messagesEndRef={messagesEndRef}
        placeholder="결혼 준비에 대해 무엇이든 물어보세요..."
        welcomeMessage="안녕하세요! 결혼 준비에 관해 무엇이든 물어보세요 😊 예식장 비용, 스드메 팁, 일정 관리, 신혼여행 추천 등 도움이 필요하시면 말씀해 주세요! (하루 5회 질문 가능)"
        className="flex-1"
        // [CL-AI-CHAT-LIMIT5-20260408-100500] qa 5/일 카운터
        remainingToday={remainingToday}
        dailyLimit={dailyLimit}
        limitReached={limitReached}
        showLimitCounter={true}
        // [CL-TOP20-P4-AICHAT-20260703-040000] 스타터 프롬프트 칩
        starterPrompts={STARTER_PROMPTS}
        // [CL-TOP20-R50-CHAT-20260703-094000] 전송 실패 복구(다시 시도)
        onRetryMessage={retryMessage}
      />
    </div>
  );
}

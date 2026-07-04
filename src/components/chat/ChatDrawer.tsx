// [CL-QA-50-SWEEP-20260408-133000] SheetDescription 추가 — Radix a11y 경고 해소
import { forwardRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Maximize2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAIChat } from '@/hooks/useAIChat';
import { ChatContainer } from './ChatContainer';
import { useIsMobile } from '@/hooks/use-mobile';
// [CL-BTNAUDIT3-20260704 | drawer-clear-safe] 대화 삭제는 파괴적·비가역 → 전체화면(Chat.tsx)과 동형 AlertDialog + useAsyncAction(더블서밋 차단·실패 토스트)
import { useAsyncAction } from '@/hooks/useAsyncAction';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
// [CL-TOP20-P4-AICHAT-20260703-040000] 스타터 프롬프트 칩.
// 예산 컨텍스트는 Drawer 미주입(의도적): App.tsx 전역 마운트(비로그인 표면 포함)라
// ①기존 예산 훅은 자동 생성(쓰기 부작용)+실시간 구독을 유발하고 ②useAuth 는 AuthProvider 밖에서 throw
// → 전역 표면에서 auth/예산 의존을 추가하지 않는다. 컨텍스트는 /chat 페이지(Chat.tsx)에서만 주입.
import { STARTER_PROMPTS } from '@/lib/chat-prompts';

interface ChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChatDrawer = forwardRef<HTMLDivElement, ChatDrawerProps>(function ChatDrawer({ open, onOpenChange }, _ref) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const {
    messages,
    isLoading,
    sendMessage,
    // [CL-TOP20-R50-CHAT-20260703-094000] 실패 메시지 재전송
    retryMessage,
    clearMessages,
    messagesEndRef,
    // [CL-AI-CHAT-LIMIT5-20260408-100500] qa 5/일 카운터
    remainingToday,
    dailyLimit,
    limitReached,
  } = useAIChat({ feature: 'qa' });

  const handleFullScreen = () => {
    onOpenChange(false);
    navigate('/chat');
  };

  // [CL-BTNAUDIT3-20260704 | drawer-clear-safe] 동기 게이트(더블서밋)+실패 시 표준 토스트 — Chat.tsx 와 동형
  const clear = useAsyncAction(async () => { await clearMessages(); }, {
    toastOnError: '대화 삭제에 실패했어요. 잠시 후 다시 시도해주세요.',
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'left'}
        className={
          isMobile
            ? 'h-[80vh] rounded-t-2xl p-0'
            : 'w-[380px] p-0 sm:max-w-[380px]'
        }
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b border-border flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-sm font-semibold flex items-center gap-2">
            💬 웨딩셈 Q&A
          </SheetTitle>
          {/* [CL-QA-50-SWEEP-20260408-133000] Screen-reader description (시각적으로 숨김) */}
          <SheetDescription className="sr-only">
            결혼 준비에 대한 질문을 입력하면 AI가 답변해드립니다. 하루 5회까지 이용 가능합니다.
          </SheetDescription>
          {/* [CL-BTNAUDIT3-20260704 | drawer-hdr-touch] 터치타깃 44px(모바일)·버튼 간격 gap-2 로 파괴적 오터치 방지 */}
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    // [CL-BTNAUDIT3-20260704 | drawer-hdr-touch] 히트영역 모바일 44px, md 이상 기존 28px 유지(아이콘 시각크기 불변)
                    className="h-10 w-10 md:h-7 md:w-7 p-0"
                    disabled={clear.pending}
                    // [CL-TOP20-R50-CHAT-20260703-094000] 아이콘 전용 버튼 접근성 이름
                    aria-label="대화 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
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
            )}
            <Button
              variant="ghost"
              size="sm"
              // [CL-BTNAUDIT3-20260704 | drawer-hdr-touch] 히트영역 모바일 44px, md 이상 기존 28px 유지
              className="h-10 w-10 md:h-7 md:w-7 p-0"
              onClick={handleFullScreen}
              // [CL-TOP20-R50-CHAT-20260703-094000] 아이콘 전용 버튼 접근성 이름
              aria-label="전체 화면으로 열기"
            >
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            </Button>
          </div>
        </SheetHeader>

        {/* Chat */}
        <ChatContainer
          messages={messages}
          isLoading={isLoading}
          onSend={sendMessage}
          messagesEndRef={messagesEndRef}
          placeholder="결혼 준비에 대해 무엇이든 물어보세요..."
          welcomeMessage="안녕하세요! 결혼 준비에 관해 무엇이든 물어보세요 😊 예식장 비용, 스드메 팁, 일정 관리 등 도움이 필요하시면 말씀해 주세요! (하루 5회 질문 가능)"
          className={isMobile ? 'h-[calc(80vh-52px)]' : 'h-[calc(100vh-52px)]'}
          // [CL-AI-CHAT-LIMIT5-20260408-100500]
          remainingToday={remainingToday}
          dailyLimit={dailyLimit}
          limitReached={limitReached}
          showLimitCounter={true}
          // [CL-TOP20-P4-AICHAT-20260703-040000] 스타터 프롬프트 칩
          starterPrompts={STARTER_PROMPTS}
          // [CL-TOP20-R50-CHAT-20260703-094000] 전송 실패 복구(다시 시도)
          onRetryMessage={retryMessage}
        />
      </SheetContent>
    </Sheet>
  );
});

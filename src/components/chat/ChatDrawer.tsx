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
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={clearMessages}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleFullScreen}
            >
              <Maximize2 className="w-3.5 h-3.5" />
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
        />
      </SheetContent>
    </Sheet>
  );
});

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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

export function ChatDrawer({ open, onOpenChange }: ChatDrawerProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    messagesEndRef,
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
          welcomeMessage="안녕하세요! 결혼 준비에 관해 무엇이든 물어보세요 😊 예식장 비용, 스드메 팁, 일정 관리 등 도움이 필요하시면 말씀해 주세요!"
          className={isMobile ? 'h-[calc(80vh-52px)]' : 'h-[calc(100vh-52px)]'}
        />
      </SheetContent>
    </Sheet>
  );
}

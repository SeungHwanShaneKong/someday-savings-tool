import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAIChat } from '@/hooks/useAIChat';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { useSEO } from '@/hooks/useSEO';

export default function Chat() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useSEO({
    title: 'AI 상담 - 웨딩셈',
    description: '결혼 준비에 대한 궁금한 점을 AI에게 물어보세요. 예산, 일정, 웨딩 트렌드 등 맞춤 상담.',
    path: '/chat',
  });

  const {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    messagesEndRef,
    // [CL-AI-CHAT-LIMIT5-20260408-100500] 일일 한도 카운터 (qa = 5/일)
    remainingToday,
    dailyLimit,
    limitReached,
  } = useAIChat({ feature: 'qa' });

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
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground">
            💬 웨딩셈 Q&A
          </h1>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={clearMessages}
            disabled={messages.length === 0}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
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
      />
    </div>
  );
}

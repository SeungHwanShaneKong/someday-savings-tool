import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ExternalLink, Copy, CheckCircle2 } from 'lucide-react';
import { getBrowserInfo, openInExternalBrowser, copyToClipboard } from '@/lib/kakao-browser';

export default function Auth() {
  const navigate = useNavigate();
  const { user, signInWithGoogle, loading } = useAuth();
  const { toast } = useToast();
  
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showBridgeUI, setShowBridgeUI] = useState(false);
  const [browserInfo] = useState(() => getBrowserInfo());
  const [copied, setCopied] = useState(false);

  // 페이지 진입 시 즉시 인앱 브라우저 감지 → Safari/Chrome으로 자동 전환 시도
  useEffect(() => {
    if (browserInfo.isInAppBrowser) {
      // 즉시 시스템 브라우저로 전환 시도 (iOS: Shortcuts, Android: intent)
      openInExternalBrowser(window.location.href);
      // 전환이 성공하면 이 페이지는 사라짐. 실패하면 브릿지 UI 표시
      const timer = setTimeout(() => setShowBridgeUI(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [browserInfo.isInAppBrowser]);

  const handleCopyUrl = useCallback(async () => {
    const success = await copyToClipboard(window.location.href);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const handleRetryBreakout = useCallback(() => {
    openInExternalBrowser(window.location.href);
  }, []);

  // Redirect if already logged in
  if (!loading && user) {
    return <Navigate to="/budget" replace />;
  }

  const handleGoogleSignIn = async () => {
    // 로그인 버튼 클릭 시에도 인앱 브라우저 재확인
    if (browserInfo.isInAppBrowser) {
      openInExternalBrowser(window.location.href);
      setShowBridgeUI(true);
      return;
    }

    // 일반 브라우저: 정상 Google 로그인 진행
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          title: 'Google 로그인 실패',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // 인앱 브라우저 감지됨 + 자동 전환 실패 → 브릿지 UI
  if (showBridgeUI && browserInfo.isInAppBrowser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-8">
        <div className="text-center max-w-sm w-full">
          {/* 아이콘 */}
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <ExternalLink className="w-10 h-10 text-primary" />
            </div>
          </div>
          
          {/* 제목 */}
          <h1 className="text-xl font-semibold text-foreground mb-2">
            외부 브라우저에서 열어주세요
          </h1>
          <p className="text-muted-foreground mb-6 text-sm">
            {browserInfo.detectedApp ? `${browserInfo.detectedApp} 내` : '현재'} 브라우저에서는 
            Google 로그인이 제한됩니다.
            <br />
            아래 방법으로 Safari/Chrome에서 접속해주세요.
          </p>
          
          {/* 버튼들 */}
          <div className="space-y-3 mb-8">
            <Button 
              onClick={handleRetryBreakout}
              className="w-full h-12"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              외부 브라우저로 열기
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleCopyUrl}
              className="w-full h-12"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2 text-primary" />
                  복사완료! 브라우저에 붙여넣기
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  URL 복사하기
                </>
              )}
            </Button>
          </div>
          
          {/* 수동 가이드 */}
          <div className="bg-muted/50 rounded-xl p-4 text-left">
            <p className="text-sm font-medium text-foreground mb-3">
              📱 직접 여는 방법
            </p>
            <ol className="text-sm text-muted-foreground space-y-2">
              {browserInfo.isIOS ? (
                <>
                  <li>1. 화면 하단의 <strong>Safari로 열기</strong> 아이콘을 탭하세요</li>
                  <li>2. 또는 우측 상단 <strong>⋯</strong> → <strong>Safari로 열기</strong></li>
                  <li>3. 위 방법이 없으면 URL을 복사하여 Safari에 붙여넣기</li>
                </>
              ) : browserInfo.isAndroid ? (
                <>
                  <li>1. 우측 상단 <strong>⋮</strong> 메뉴를 탭하세요</li>
                  <li>2. <strong>다른 브라우저로 열기</strong>를 선택하세요</li>
                </>
              ) : (
                <>
                  <li>1. 우측 상단 메뉴(⋮ 또는 ⋯)를 탭하세요</li>
                  <li>2. "외부 브라우저로 열기"를 선택하세요</li>
                </>
              )}
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-1 flex flex-col justify-center px-6 pb-8 max-w-lg mx-auto w-full">
        {/* Icon */}
        <div className="text-center mb-8">
          <span className="text-6xl">💒</span>
        </div>

        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-display text-foreground mb-2">
            간편하게 시작하세요
          </h1>
          <p className="text-body-lg text-muted-foreground">
            Google 계정으로 로그인하고<br />
            결혼 예산 계획을 시작해보세요
          </p>
        </div>

        {/* Google Login Button */}
        <Button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          className="w-full h-14 text-body-lg font-medium rounded-xl flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {isGoogleLoading ? '연결 중...' : 'Google로 계속하기'}
        </Button>

        {/* Info text */}
        <p className="text-center text-small text-muted-foreground mt-6">
          로그인하면 예산 데이터가 안전하게 저장되어<br />
          언제든 다시 확인할 수 있어요
        </p>
      </main>
    </div>
  );
}

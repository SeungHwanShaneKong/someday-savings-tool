import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ExternalLink, Copy, CheckCircle2, Bug } from 'lucide-react';
import {
  getBrowserInfo,
  openInExternalBrowserWithFallback,
  copyToClipboard,
  getAppSpecificGuide,
} from '@/lib/kakao-browser';
import { EDGE_FUNCTION_URL, EDGE_FUNCTION_KEY } from '@/lib/edge-function-config';

const DEV_TEST_EMAIL = 'dev-test@wedsem-local.dev';
const DEV_TEST_PASSWORD = 'devtest123456';

export default function Auth() {
  const navigate = useNavigate();
  const { user, signInWithGoogle, signIn, signUp, loading } = useAuth();
  const { toast } = useToast();
  const [isDevLoading, setIsDevLoading] = useState(false);
  
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showBridgeUI, setShowBridgeUI] = useState(false);
  const [browserInfo] = useState(() => getBrowserInfo());
  const [copied, setCopied] = useState(false);

  // 페이지 진입 시 즉시 인앱 브라우저 감지 → 다중 탈출 전략 실행
  useEffect(() => {
    if (browserInfo.isInAppBrowser) {
      openInExternalBrowserWithFallback(
        window.location.href,
        () => setShowBridgeUI(true) // 모든 자동 방법 실패 시 브릿지 UI 표시
      );
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
    openInExternalBrowserWithFallback(
      window.location.href,
      () => setShowBridgeUI(true)
    );
  }, []);

  // Redirect if already logged in
  if (!loading && user) {
    return <Navigate to="/budget" replace />;
  }

  const handleGoogleSignIn = async () => {
    // 로그인 버튼 클릭 시에도 인앱 브라우저 재확인
    if (browserInfo.isInAppBrowser) {
      openInExternalBrowserWithFallback(
        window.location.href,
        () => setShowBridgeUI(true)
      );
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

  // DEV ONLY: 테스트 계정으로 바이패스 로그인
  const handleDevLogin = async () => {
    if (!import.meta.env.DEV) return;
    setIsDevLoading(true);
    try {
      // 1. 먼저 password 로그인 시도 (이미 계정 존재+확인 시)
      const { error: signInError } = await signIn(DEV_TEST_EMAIL, DEV_TEST_PASSWORD);
      if (!signInError) {
        toast({ title: 'Dev 로그인 성공!' });
        return;
      }

      // 2. 로그인 실패 → Edge Function(Admin API)으로 유저 생성 (이메일 발송 없음)
      try {
        const res = await fetch(`${EDGE_FUNCTION_URL}/functions/v1/dev-create-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: EDGE_FUNCTION_KEY,
          },
          body: JSON.stringify({ email: DEV_TEST_EMAIL, password: DEV_TEST_PASSWORD }),
        });

        if (!res.ok) {
          const result = await res.json().catch(() => ({}));
          throw new Error(result.error || `Edge Function 오류 (${res.status})`);
        }

        // 3. 계정 생성/확인됨 → 로그인 재시도
        const { error: retryError } = await signIn(DEV_TEST_EMAIL, DEV_TEST_PASSWORD);
        if (retryError) {
          toast({
            title: 'Dev 로그인 실패',
            description: retryError.message,
            variant: 'destructive',
          });
          return;
        }
        toast({ title: 'Dev 계정 생성 + 로그인 성공!' });
      } catch (fnError: unknown) {
        // Edge Function 미배포 시 → 명확한 안내
        toast({
          title: 'Dev 로그인 실패',
          description: `signIn: ${signInError.message}\n\n해결: Supabase Dashboard → Auth → Users에서 dev-test@wedsem-local.dev 유저를 직접 생성(Auto Confirm)하거나, dev-create-user Edge Function을 배포하세요.`,
          variant: 'destructive',
        });
      }
    } finally {
      setIsDevLoading(false);
    }
  };

  // 앱별 맞춤 안내 가져오기
  const guide = getAppSpecificGuide(browserInfo.detectedApp, browserInfo.isIOS, browserInfo.isAndroid);

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
            아래 방법으로 {browserInfo.isIOS ? 'Safari' : 'Chrome'}에서 접속해주세요.
          </p>
          
          {/* 버튼들 */}
          <div className="space-y-3 mb-6">
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
              className="w-full h-12 border-2 border-primary/30"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2 text-primary" />
                  복사완료! 브라우저에 붙여넣기
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  URL 복사 후 Safari에 붙여넣기
                </>
              )}
            </Button>
          </div>
          
          {/* 앱별 맞춤 수동 가이드 */}
          <div className="bg-muted/50 rounded-xl p-4 text-left">
            <p className="text-sm font-medium text-foreground mb-3">
              📱 {browserInfo.detectedApp ? `${browserInfo.detectedApp}에서` : '직접'} 여는 방법
            </p>
            <ol className="text-sm text-muted-foreground space-y-2">
              {guide.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
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
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {isGoogleLoading ? '연결 중...' : 'Google로 계속하기'}
        </Button>

        {/* Info text */}
        <p className="text-center text-small text-muted-foreground mt-6">
          로그인하면 예산 데이터가 안전하게 저장되어<br />
          언제든 다시 확인할 수 있어요
        </p>

        {/* DEV ONLY: 테스트 로그인 바이패스 */}
        {import.meta.env.DEV && (
          <div className="mt-8 pt-6 border-t border-dashed border-yellow-500/40">
            <p className="text-center text-xs text-yellow-600 mb-3 font-mono">
              ⚠️ DEV MODE ONLY — 프로덕션에서 표시되지 않음
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleDevLogin}
              disabled={isDevLoading}
              className="w-full h-12 border-yellow-500/50 text-yellow-700 hover:bg-yellow-50 font-mono text-sm"
            >
              <Bug className="w-4 h-4 mr-2" />
              {isDevLoading ? 'Dev 로그인 중...' : 'Dev 테스트 로그인 (Supabase Email)'}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

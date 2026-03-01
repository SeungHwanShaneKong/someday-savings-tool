import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { ExternalLink, Copy, CheckCircle2 } from 'lucide-react';
import {
  getBrowserInfo,
  openInExternalBrowserWithFallback,
  copyToClipboard,
  getAppSpecificGuide,
} from '@/lib/kakao-browser';

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [browserInfo] = useState(() => getBrowserInfo());
  const [showBridgeUI, setShowBridgeUI] = useState(false);
  const [copied, setCopied] = useState(false);

  // 랜딩 페이지 진입 시 인앱 브라우저 감지 → 다중 탈출 전략 실행
  useEffect(() => {
    if (browserInfo.isInAppBrowser) {
      openInExternalBrowserWithFallback(
        window.location.href,
        () => setShowBridgeUI(true)
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

  const handleStart = () => {
    if (user) {
      navigate('/budget');
    } else {
      navigate('/auth');
    }
  };

  const guide = getAppSpecificGuide(browserInfo.detectedApp, browserInfo.isIOS, browserInfo.isAndroid);

  // 인앱 브라우저 + 자동 전환 실패 → 브릿지 UI
  if (showBridgeUI && browserInfo.isInAppBrowser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-8">
        <div className="text-center max-w-sm w-full">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <ExternalLink className="w-10 h-10 text-primary" />
            </div>
          </div>
          
          <h1 className="text-xl font-semibold text-foreground mb-2">
            외부 브라우저에서 열어주세요
          </h1>
          <p className="text-muted-foreground mb-6 text-sm">
            {browserInfo.detectedApp ? `${browserInfo.detectedApp} 내` : '현재'} 브라우저에서는 
            일부 기능이 제한됩니다.
            <br />
            아래 방법으로 {browserInfo.isIOS ? 'Safari' : 'Chrome'}에서 접속해주세요.
          </p>
          
          <div className="space-y-3 mb-6">
            <Button onClick={handleRetryBreakout} className="w-full h-12">
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-20">
        <div className="text-7xl mb-8 animate-bounce">💒</div>

        <div className="text-center mb-6 space-y-1">
          <p className="text-2xl sm:text-3xl font-medium text-muted-foreground tracking-wide">
            결혼 준비,
          </p>
          <p className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            꼼꼼한 셈 법
          </p>
          <h1 className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-primary via-blue-500 to-primary bg-clip-text text-transparent tracking-tighter">
            결혼셈
          </h1>
        </div>

        <p className="text-body-lg text-muted-foreground text-center mb-12 max-w-sm">복잡한 결혼 준비,
깔끔하게 정리된 예산 계획으로 한결 가벼워져요</p>

        <div className="w-full max-w-sm space-y-3 mb-12">
          <FeatureItem icon="📊" text="한눈에 보는 예산 현황" />
          <FeatureItem icon="📋" text="D-day 체크리스트로 준비 관리" />
          <FeatureItem icon="💡" text="숨겨진 비용 경고 & AI 인사이트" />
          <FeatureItem icon="✈️" text="AI 허니문 큐레이션 & 지도" />
          <FeatureItem icon="💬" text="웨딩 Q&A AI 챗봇" />
          <FeatureItem icon="🔗" text="예산표 이미지 저장 & 공유" />
        </div>

        <Button onClick={handleStart} disabled={loading} size="lg" className="w-full max-w-sm h-16 text-lg font-bold rounded-xl 
            bg-gradient-to-r from-blue-700 to-blue-600 
            text-white
            shadow-[0_4px_20px_rgba(0,80,200,0.5)] 
            hover:shadow-[0_6px_30px_rgba(0,80,200,0.6)] 
            hover:scale-[1.02] 
            active:scale-[0.98]
            transition-all duration-200 ease-out
            animate-pulse-subtle">
          {loading ? '로딩 중...' : user ? '예산 관리하기' : '시작하기'}
        </Button>

        {!loading && !user && <button onClick={() => navigate('/auth')} className="mt-4 text-body text-muted-foreground hover:text-primary transition-colors">
            이미 계정이 있으신가요?
          </button>}
      </main>

      <footer className="py-6 text-center text-small text-muted-foreground">
        결혼자금 계산기 • Made with 💙
      </footer>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-xl">{icon}</span>
      <span className="text-body text-muted-foreground">{text}</span>
    </div>
  );
}

import { useState, useEffect } from 'react';
import {
  openInExternalBrowserWithFallback,
  getBrowserInfo,
  copyToClipboard,
  getAppSpecificGuide,
} from '@/lib/kakao-browser';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy, CheckCircle2, Smartphone } from 'lucide-react';

interface KakaoInAppBrowserGuardProps {
  children: React.ReactNode;
  /** 가드가 필요한 페이지에서만 활성화 (기본: true) */
  enabled?: boolean;
}

/**
 * [CL-IMPROVE-7TASKS-20260330] 인앱 브라우저 가드 — Toss UI/UX 적용
 *
 * 인앱 브라우저(카카오톡, Threads, Instagram, Discord 등)에서 접근 시
 * 5단계 자동 탈출 체인 → 실패 시 Toss 스타일 브릿지 UI 표시.
 */
export function KakaoInAppBrowserGuard({
  children,
  enabled = true
}: KakaoInAppBrowserGuardProps) {
  const [isIAB, setIsIAB] = useState(false);
  const [detectedApp, setDetectedApp] = useState<string | null>(null);
  const [phase, setPhase] = useState<'detecting' | 'escaping' | 'bridge'>('detecting');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const info = getBrowserInfo();
    setIsIAB(info.isInAppBrowser);
    setDetectedApp(info.detectedApp);

    if (info.isInAppBrowser) {
      setPhase('escaping');
      // 5단계 자동 탈출 체인 시도 → 모두 실패 시 브릿지 UI
      openInExternalBrowserWithFallback(window.location.href, () => {
        setPhase('bridge');
      });
    }
  }, [enabled]);

  const handleCopyUrl = async () => {
    const success = await copyToClipboard(window.location.href);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleRetry = () => {
    setPhase('escaping');
    openInExternalBrowserWithFallback(window.location.href, () => {
      setPhase('bridge');
    });
  };

  // 인앱 브라우저가 아니거나 비활성화된 경우 자식 컴포넌트 렌더링
  if (!enabled || !isIAB) {
    return <>{children}</>;
  }

  const { isIOS, isAndroid } = getBrowserInfo();
  const guide = getAppSpecificGuide(detectedApp, isIOS, isAndroid);

  // 탈출 시도 중 로딩 화면
  if (phase === 'escaping') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
        <div className="text-center max-w-sm">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <h1 className="toss-title mb-2">브라우저로 이동 중</h1>
          <p className="toss-desc">잠시만 기다려주세요...</p>
        </div>
      </div>
    );
  }

  // 브릿지 UI (Toss 스타일)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-8">
      <div className="text-center max-w-sm w-full">
        {/* 아이콘 */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Smartphone className="w-10 h-10 text-primary" />
          </div>
        </div>

        {/* 제목 */}
        <h1 className="text-xl font-semibold text-foreground mb-2">
          외부 브라우저에서 열어주세요
        </h1>
        <p className="toss-desc mb-6">
          {detectedApp ? `${detectedApp}` : '현재'} 앱 내 브라우저에서는
          <br />일부 기능이 제한될 수 있어요.
        </p>

        {/* CTA 버튼 영역 */}
        <div className="space-y-3 mb-8">
          {/* PRIMARY CTA: URL 복사 */}
          <Button
            onClick={handleCopyUrl}
            className="toss-cta bg-primary text-white hover:bg-primary/90"
            size="lg"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                복사완료! Safari에 붙여넣기
              </>
            ) : (
              <>
                <Copy className="w-5 h-5 mr-2" />
                URL 복사하기
              </>
            )}
          </Button>

          {/* SECONDARY: 자동 이동 재시도 */}
          <Button
            variant="outline"
            onClick={handleRetry}
            className="w-full h-11 rounded-xl transition-all duration-200"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            외부 브라우저로 열기
          </Button>
        </div>

        {/* 앱별 안내 가이드 */}
        <div className="toss-card text-left">
          <p className="text-sm font-semibold text-foreground mb-3">
            {detectedApp ? `${detectedApp}에서 여는 방법` : '직접 여는 방법'}
          </p>
          <ol className="text-sm text-muted-foreground space-y-2">
            {guide.steps.map((step, i) => (
              <li key={i} className="leading-relaxed">{step}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

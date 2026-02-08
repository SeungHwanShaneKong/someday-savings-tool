import { useState, useEffect } from 'react';
import { 
  isKakaoTalkInAppBrowser, 
  openInExternalBrowser, 
  getBrowserInfo,
  copyToClipboard 
} from '@/lib/kakao-browser';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy, CheckCircle2 } from 'lucide-react';

interface KakaoInAppBrowserGuardProps {
  children: React.ReactNode;
  /** 가드가 필요한 페이지에서만 활성화 (기본: true) */
  enabled?: boolean;
}

/**
 * 카카오톡 인앱 브라우저에서 접근 시 외부 브라우저로 유도하는 가드 컴포넌트
 * 구글 OAuth 로그인이 인앱 브라우저에서 차단되는 문제를 해결합니다.
 */
export function KakaoInAppBrowserGuard({ 
  children, 
  enabled = true 
}: KakaoInAppBrowserGuardProps) {
  const [isKakao, setIsKakao] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    
    const kakaoDetected = isKakaoTalkInAppBrowser();
    setIsKakao(kakaoDetected);
    
    if (kakaoDetected) {
      // 자동으로 외부 브라우저로 전환 시도
      setIsRedirecting(true);
      
      const success = openInExternalBrowser();
      
      // 2초 후에도 페이지가 남아있으면 수동 가이드 표시
      const timer = setTimeout(() => {
        setIsRedirecting(false);
        if (!success) {
          setShowManualGuide(true);
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [enabled]);

  const handleCopyUrl = async () => {
    const success = await copyToClipboard(window.location.href);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRetryExternalBrowser = () => {
    setIsRedirecting(true);
    openInExternalBrowser();
    
    setTimeout(() => {
      setIsRedirecting(false);
      setShowManualGuide(true);
    }, 2000);
  };

  const { isAndroid, isIOS } = getBrowserInfo();

  // 카카오톡이 아니거나 비활성화된 경우 자식 컴포넌트 렌더링
  if (!enabled || !isKakao) {
    return <>{children}</>;
  }

  // 리다이렉트 중 로딩 화면
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
        <div className="text-center max-w-sm">
          {/* 로딩 애니메이션 */}
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          
          <h1 className="text-xl font-semibold text-foreground mb-2">
            안전한 로그인을 위해
          </h1>
          <p className="text-muted-foreground">
            브라우저로 이동 중입니다...
          </p>
        </div>
      </div>
    );
  }

  // 수동 가이드 화면
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
          카카오톡 내 브라우저에서는 구글 로그인이 제한됩니다.
          <br />
          아래 방법으로 외부 브라우저에서 접속해주세요.
        </p>
        
        {/* 버튼들 */}
        <div className="space-y-3 mb-8">
          <Button 
            onClick={handleRetryExternalBrowser}
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
        {showManualGuide && (
          <div className="bg-muted/50 rounded-xl p-4 text-left">
            <p className="text-sm font-medium text-foreground mb-3">
              📱 직접 여는 방법
            </p>
            <ol className="text-sm text-muted-foreground space-y-2">
              {isIOS ? (
                <>
                  <li>1. 우측 하단 <strong>Safari</strong> 아이콘 탭</li>
                  <li>2. 또는 우측 상단 <strong>⋯</strong> → <strong>Safari로 열기</strong></li>
                </>
              ) : isAndroid ? (
                <>
                  <li>1. 우측 상단 <strong>⋮</strong> 메뉴 탭</li>
                  <li>2. <strong>다른 브라우저로 열기</strong> 선택</li>
                </>
              ) : (
                <>
                  <li>1. 우측 상단 메뉴(⋮ 또는 ⋯) 탭</li>
                  <li>2. "외부 브라우저로 열기" 선택</li>
                </>
              )}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

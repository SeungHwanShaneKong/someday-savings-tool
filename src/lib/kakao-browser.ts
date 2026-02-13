/**
 * 인앱 브라우저 감지 및 외부 브라우저 전환 유틸리티
 * 
 * Google OAuth는 "disallowed_useragent" 정책에 따라 인앱 웹뷰에서의
 * 로그인을 차단합니다. 이 유틸리티는 주요 인앱 브라우저를 감지하고
 * 사용자를 시스템 기본 브라우저로 유도합니다.
 */

export interface BrowserInfo {
  isInAppBrowser: boolean;
  /** @deprecated Use isInAppBrowser instead */
  isKakaoTalk: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  userAgent: string;
  /** 감지된 인앱 브라우저 이름 */
  detectedApp: string | null;
}

/**
 * 인앱 브라우저 감지 패턴
 * 각 앱의 User-Agent에 포함되는 고유 문자열
 */
const IN_APP_BROWSER_PATTERNS: { pattern: RegExp; name: string }[] = [
  // 주요 메신저/SNS 인앱 브라우저
  { pattern: /KAKAOTALK/i, name: '카카오톡' },
  { pattern: /FB_IAB|FBAV|FBAN/i, name: 'Facebook' },
  { pattern: /Instagram/i, name: 'Instagram' },
  { pattern: /Threads/i, name: 'Threads' },
  { pattern: /musical_ly|TikTok|BytedanceWebview/i, name: 'TikTok' },
  { pattern: /Line\//i, name: 'LINE' },
  // 네이버 계열 앱 (네이버, 밴드, 카페, 블로그, 웨일 인앱 등)
  { pattern: /NAVER\(inapp|NAVERSEARCH|NaverBand|NaverCafe|NaverBlog|whale/i, name: '네이버' },
  // 한국 인기 앱
  { pattern: /DaumApps|Daum/i, name: '다음/카카오' },
  { pattern: /everytimeApp/i, name: '에브리타임' },
  { pattern: /CoupangApp/i, name: '쿠팡' },
  { pattern: /TossApp|toss\//i, name: '토스' },
  { pattern: /Baemin/i, name: '배달의민족' },
  { pattern: /Carrot|DanggnApp/i, name: '당근마켓' },
  // 기타
  { pattern: /SamsungBrowser\/.*CrossApp/i, name: 'Samsung Internet (앱 내)' },
  { pattern: /Twitter|X-Twitter/i, name: 'X (Twitter)' },
  { pattern: /Snapchat/i, name: 'Snapchat' },
  // 일반적인 웹뷰 감지 (마지막 폴백 — 다른 패턴에 매치되지 않을 때만 작동)
  { pattern: /wv\)|WebView/i, name: '인앱 브라우저' },
];

/**
 * 현재 브라우저 환경 정보를 반환
 */
export function getBrowserInfo(): BrowserInfo {
  const userAgent = navigator.userAgent || '';
  
  let detectedApp: string | null = null;
  for (const { pattern, name } of IN_APP_BROWSER_PATTERNS) {
    if (pattern.test(userAgent)) {
      detectedApp = name;
      break;
    }
  }

  return {
    isInAppBrowser: detectedApp !== null,
    isKakaoTalk: /KAKAOTALK/i.test(userAgent),
    isAndroid: /Android/i.test(userAgent),
    isIOS: /iPhone|iPad|iPod/i.test(userAgent),
    userAgent,
    detectedApp,
  };
}

/**
 * 인앱 브라우저인지 확인 (모든 종류)
 */
export function isInAppBrowser(): boolean {
  return getBrowserInfo().isInAppBrowser;
}

/**
 * @deprecated Use isInAppBrowser() instead
 */
export function isKakaoTalkInAppBrowser(): boolean {
  return isInAppBrowser();
}

/**
 * 외부 브라우저로 현재 페이지 열기
 * @param url 열려는 URL (기본값: 현재 페이지)
 * @returns 리다이렉트 시도 성공 여부
 */
export function openInExternalBrowser(url?: string): boolean {
  const targetUrl = url || window.location.href;
  const { isAndroid, isIOS, isInAppBrowser: isIAB } = getBrowserInfo();
  
  if (!isIAB) {
    return false;
  }

  try {
    if (isAndroid) {
      // Android: intent 스킴을 사용하여 Chrome 등 외부 브라우저로 열기
      const intentUrl = `intent://${targetUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;action=android.intent.action.VIEW;end`;
      window.location.href = intentUrl;
      return true;
    }
    
    if (isIOS) {
      // iOS 전략 1: 카카오톡 전용 스킴 (카카오톡에서만 작동)
      if (/KAKAOTALK/i.test(navigator.userAgent)) {
        const encodedUrl = encodeURIComponent(targetUrl);
        window.location.href = `kakaotalk://web/openExternal?url=${encodedUrl}`;
        return true;
      }
      
      // iOS 전략 2: Shortcuts 폴백 전략
      // 존재하지 않는 Shortcut을 실행 시도 → 실패 시 x-error 콜백으로
      // 시스템 기본 브라우저(Safari)에서 URL이 열림
      // iOS, iPadOS, macOS 모두에서 작동하는 가장 신뢰할 수 있는 방법
      const fakeShortcutName = crypto.randomUUID ? crypto.randomUUID() : `escape-${Date.now()}`;
      const shortcutsUrl = `shortcuts://x-callback-url/run-shortcut?name=${fakeShortcutName}&x-error=${encodeURIComponent(targetUrl)}`;
      window.location.replace(shortcutsUrl);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('외부 브라우저 열기 실패:', error);
    return false;
  }
}

/**
 * 클립보드에 URL 복사
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const result = document.execCommand('copy');
    document.body.removeChild(textArea);
    return result;
  } catch (error) {
    console.error('클립보드 복사 실패:', error);
    return false;
  }
}

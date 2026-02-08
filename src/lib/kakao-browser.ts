/**
 * 카카오톡 인앱 브라우저 감지 및 외부 브라우저 전환 유틸리티
 */

export interface BrowserInfo {
  isKakaoTalk: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  userAgent: string;
}

/**
 * 현재 브라우저 환경 정보를 반환
 */
export function getBrowserInfo(): BrowserInfo {
  const userAgent = navigator.userAgent || '';
  
  return {
    isKakaoTalk: /KAKAOTALK/i.test(userAgent),
    isAndroid: /Android/i.test(userAgent),
    isIOS: /iPhone|iPad|iPod/i.test(userAgent),
    userAgent,
  };
}

/**
 * 카카오톡 인앱 브라우저인지 확인
 */
export function isKakaoTalkInAppBrowser(): boolean {
  return getBrowserInfo().isKakaoTalk;
}

/**
 * 외부 브라우저로 현재 페이지 열기
 * @param url 열려는 URL (기본값: 현재 페이지)
 * @returns 리다이렉트 시도 성공 여부
 */
export function openInExternalBrowser(url?: string): boolean {
  const targetUrl = url || window.location.href;
  const { isAndroid, isIOS, isKakaoTalk } = getBrowserInfo();
  
  if (!isKakaoTalk) {
    return false;
  }

  try {
    if (isAndroid) {
      // Android: intent 스킴을 사용하여 외부 브라우저로 열기
      const intentUrl = `intent://${targetUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;action=android.intent.action.VIEW;end`;
      window.location.href = intentUrl;
      return true;
    }
    
    if (isIOS) {
      // iOS: 카카오톡 외부 브라우저 스킴 사용
      // 카카오톡에서 Safari로 열도록 유도
      const encodedUrl = encodeURIComponent(targetUrl);
      
      // 방법 1: 카카오톡 외부 브라우저 스킴 (일부 버전에서 작동)
      window.location.href = `kakaotalk://web/openExternal?url=${encodedUrl}`;
      
      // 방법 2: 0.5초 후에도 페이지가 남아있으면 다른 방법 시도
      setTimeout(() => {
        // Safari로 직접 열기 시도
        window.location.href = targetUrl;
      }, 500);
      
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

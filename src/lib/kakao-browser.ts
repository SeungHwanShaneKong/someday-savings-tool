/**
 * 인앱 브라우저 감지 및 외부 브라우저 전환 유틸리티
 * 
 * Google OAuth는 "disallowed_useragent" 정책에 따라 인앱 웹뷰에서의
 * 로그인을 차단합니다. 이 유틸리티는 주요 인앱 브라우저를 감지하고
 * 사용자를 시스템 기본 브라우저로 유도합니다.
 * 
 * iOS 탈출 전략 우선순위:
 *   1. 카카오톡 전용 스킴: kakaotalk://web/openExternal
 *   2. x-safari-https:// 스킴: Safari를 직접 호출
 *   3. shortcuts:// 폴백: 구형 iOS(17 이하)에서 작동
 *   4. 브릿지 UI: 수동 안내 (최종 폴백)
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
  // 네이버 계열 앱
  { pattern: /NAVER\(inapp|NAVERSEARCH|NaverBand|NaverCafe|NaverBlog|whale/i, name: '네이버' },
  // 한국 인기 앱
  { pattern: /DaumApps|Daum/i, name: '다음/카카오' },
  { pattern: /everytimeApp/i, name: '에브리타임' },
  { pattern: /CoupangApp/i, name: '쿠팡' },
  { pattern: /TossApp|toss\//i, name: '토스' },
  { pattern: /Baemin/i, name: '배달의민족' },
  { pattern: /Carrot|DanggnApp/i, name: '당근마켓' },
  // [CL-IMPROVE-7TASKS-20260330] 추가 메신저/커뮤니티 앱
  { pattern: /Discord/i, name: 'Discord' },
  { pattern: /Reddit/i, name: 'Reddit' },
  { pattern: /WhatsApp/i, name: 'WhatsApp' },
  { pattern: /Telegram/i, name: 'Telegram' },
  // 기타
  { pattern: /SamsungBrowser\/.*CrossApp/i, name: 'Samsung Internet (앱 내)' },
  { pattern: /Twitter|X-Twitter/i, name: 'X (Twitter)' },
  { pattern: /Snapchat/i, name: 'Snapchat' },
  // 일반적인 웹뷰 감지 (마지막 폴백)
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
 * 외부 브라우저로 현재 페이지 열기 (동기 - 즉시 1회 시도)
 * 
 * @param url 열려는 URL (기본값: 현재 페이지)
 * @returns 리다이렉트 시도 여부 (실제 성공은 비동기로만 확인 가능)
 */
export function openInExternalBrowser(url?: string): boolean {
  const targetUrl = url || window.location.href;
  const { isAndroid, isIOS, isInAppBrowser: isIAB } = getBrowserInfo();
  
  if (!isIAB) {
    return false;
  }

  try {
    if (isAndroid) {
      // Android: intent 스킴으로 Chrome 강제 호출
      const intentUrl = `intent://${targetUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;action=android.intent.action.VIEW;end`;
      window.location.href = intentUrl;
      return true;
    }
    
    if (isIOS) {
      // iOS 전략 1: 카카오톡 전용 스킴
      if (/KAKAOTALK/i.test(navigator.userAgent)) {
        const encodedUrl = encodeURIComponent(targetUrl);
        window.location.href = `kakaotalk://web/openExternal?url=${encodedUrl}`;
        return true;
      }
      
      // iOS 전략 2: x-safari-https:// 스킴
      // Safari를 직접 호출하는 URL 스킴. 많은 iOS 인앱 브라우저에서 작동.
      // targetUrl이 https://example.com/path 이면 x-safari-https://example.com/path 로 변환
      const safariUrl = targetUrl.replace(/^https:\/\//, 'x-safari-https://').replace(/^http:\/\//, 'x-safari-http://');
      window.location.href = safariUrl;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('외부 브라우저 열기 실패:', error);
    return false;
  }
}

/**
 * iOS 다중 탈출 전략을 순차적으로 시도하는 비동기 함수
 * 
 * 시도 순서:
 *   1. 카카오톡 전용 스킴 (카카오톡인 경우)
 *   2. x-safari-https:// 스킴 (Safari 직접 호출)
 *   3. shortcuts:// x-callback-url (구형 iOS 폴백)
 *   4. 모두 실패 → onFallback 콜백 호출
 * 
 * 각 단계에서 visibilitychange 또는 타이머로 성공 여부를 감지합니다.
 * 
 * @param url 열려는 URL
 * @param onFallback 모든 방법 실패 시 호출되는 콜백 (브릿지 UI 표시용)
 */
export function openInExternalBrowserWithFallback(
  url: string,
  onFallback: () => void
): void {
  const info = getBrowserInfo();
  
  if (!info.isInAppBrowser) {
    return;
  }

  // Android는 intent 스킴 한 번으로 충분
  if (info.isAndroid) {
    const intentUrl = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;action=android.intent.action.VIEW;end`;
    window.location.href = intentUrl;
    // Android intent가 실패하면 800ms 후 폴백
    setTimeout(onFallback, 800);
    return;
  }

  if (!info.isIOS) {
    onFallback();
    return;
  }

  // === iOS 다중 탈출 전략 ===

  // 1단계: 카카오톡 전용 스킴
  if (/KAKAOTALK/i.test(navigator.userAgent)) {
    window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
    // 카카오톡 스킴이 실패하면 800ms 후 2단계로
    setTimeout(() => attemptSafariScheme(url, onFallback), 800);
    return;
  }

  // 2단계부터 시작 (카카오톡이 아닌 경우)
  attemptSafariScheme(url, onFallback);
}

/**
 * [CL-IMPROVE-7TASKS-20260330] visibility 변화 감지 헬퍼
 * 스킴이 성공하면 document가 hidden 상태가 됨
 */
function waitForEscape(
  timeoutMs: number,
  onSuccess: () => void,
  onTimeout: () => void,
): () => void {
  let escaped = false;
  const handler = () => {
    if (document.hidden) {
      escaped = true;
      cleanup();
      onSuccess();
    }
  };
  document.addEventListener('visibilitychange', handler);

  const timer = setTimeout(() => {
    cleanup();
    if (!escaped) onTimeout();
  }, timeoutMs);

  function cleanup() {
    document.removeEventListener('visibilitychange', handler);
    clearTimeout(timer);
  }
  return cleanup;
}

/**
 * [CL-IMPROVE-7TASKS-20260330] iOS 5단계 탈출 체인
 *
 * 1. window.open(_blank) — 일부 인앱 브라우저에서 시스템 브라우저 호출
 * 2. <a target="_blank"> 프로그래밍 클릭 — DOM 기반 탈출
 * 3. x-safari-https:// — Safari 직접 호출 스킴
 * 4. location.replace — 현재 탭에서 직접 이동
 * 5. 브릿지 UI (자동 URL 복사 + 수동 안내)
 */
function attemptSafariScheme(url: string, onFallback: () => void): void {
  const STEP_TIMEOUT = 600;

  // --- Step 1: window.open ---
  try {
    const w = window.open(url, '_blank');
    if (w) {
      waitForEscape(STEP_TIMEOUT, () => {}, () => step2());
      return;
    }
  } catch { /* blocked — continue */ }
  step2();

  // --- Step 2: anchor click ---
  function step2() {
    try {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      waitForEscape(STEP_TIMEOUT, () => {}, () => step3());
    } catch {
      step3();
    }
  }

  // --- Step 3: x-safari-https:// ---
  function step3() {
    const safariUrl = url
      .replace(/^https:\/\//, 'x-safari-https://')
      .replace(/^http:\/\//, 'x-safari-http://');
    window.location.href = safariUrl;
    waitForEscape(STEP_TIMEOUT, () => {}, () => step4());
  }

  // --- Step 4: location.replace ---
  function step4() {
    try {
      window.location.replace(url);
    } catch { /* continue */ }
    waitForEscape(STEP_TIMEOUT, () => {}, () => step5());
  }

  // --- Step 5: 브릿지 UI (자동 클립보드 복사 + 수동 안내) ---
  function step5() {
    // 자동 URL 클립보드 복사 시도
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    onFallback();
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

/**
 * 앱별 Safari 전환 안내 메시지를 반환
 */
export function getAppSpecificGuide(detectedApp: string | null, isIOS: boolean, isAndroid: boolean): {
  steps: string[];
} {
  if (isAndroid) {
    return {
      steps: [
        '1. 우측 상단 ⋮ 메뉴를 탭하세요',
        '2. "다른 브라우저로 열기"를 선택하세요',
      ],
    };
  }

  if (!isIOS) {
    return {
      steps: [
        '1. 우측 상단 메뉴(⋮ 또는 ⋯)를 탭하세요',
        '2. "외부 브라우저로 열기"를 선택하세요',
      ],
    };
  }

  // [CL-IMPROVE-7TASKS-20260330] iOS 앱별 구체적 안내 (Discord/Reddit/WhatsApp/Telegram 추가)
  switch (detectedApp) {
    case 'Instagram':
    case 'Threads':
      return {
        steps: [
          '1. 화면 하단 ··· 아이콘을 탭하세요',
          '2. "Safari에서 열기"를 선택하세요',
        ],
      };
    case '카카오톡':
      return {
        steps: [
          '1. 우측 하단 ⋯ 아이콘을 탭하세요',
          '2. "다른 브라우저로 열기"를 선택하세요',
        ],
      };
    case 'Facebook':
      return {
        steps: [
          '1. 우측 하단 ⋯ 아이콘을 탭하세요',
          '2. "Safari로 열기"를 선택하세요',
        ],
      };
    case '네이버':
      return {
        steps: [
          '1. 우측 하단 ⋯ 아이콘을 탭하세요',
          '2. "Safari로 열기" 또는 "외부 브라우저"를 선택하세요',
        ],
      };
    case 'LINE':
      return {
        steps: [
          '1. 우측 하단 공유 아이콘을 탭하세요',
          '2. "Safari로 열기"를 선택하세요',
        ],
      };
    case 'Discord':
      return {
        steps: [
          '1. 링크를 길게 눌러주세요',
          '2. "Safari에서 열기"를 선택하세요',
        ],
      };
    case 'Reddit':
      return {
        steps: [
          '1. 우측 상단 ⋯ 아이콘을 탭하세요',
          '2. "Open in Safari"를 선택하세요',
        ],
      };
    case 'WhatsApp':
    case 'Telegram':
      return {
        steps: [
          '1. 링크를 길게 눌러주세요',
          '2. "Safari에서 열기"를 선택하세요',
        ],
      };
    default:
      return {
        steps: [
          '1. 화면 하단 또는 상단의 ⋯ / 공유 아이콘을 탭하세요',
          '2. "Safari로 열기" 또는 "브라우저에서 열기"를 선택하세요',
          '3. 위 방법이 없으면 URL을 복사하여 Safari에 붙여넣기',
        ],
      };
  }
}

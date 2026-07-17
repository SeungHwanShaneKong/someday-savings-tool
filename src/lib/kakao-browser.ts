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
  // [CL-INAPP-IOS-20260713-224500] iOS/Android Threads 앱 UA 는 'Threads' 가 아니라 내부 코드명
  //  'Barcelona' 토큰을 싣는다(실측: 403 disallowed_useragent 재현 스크린샷) → 미감지로 OAuth 가
  //  시도돼 구글이 차단. 두 토큰 모두 매칭해 근본 봉합.
  { pattern: /Threads|Barcelona/i, name: 'Threads' },
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

// [CL-INAPP-IOS-20260713-224500] iOS 홈화면 PWA(standalone) 판정 — standalone UA 도 'Safari/' 토큰이
//  없어 아래 WKWebView 휴리스틱에 걸리므로 반드시 제외(미가드 시 PWA 사용자의 Google 로그인 차단 회귀).
//  usePWAInstall.isStandaloneDisplay 와 동일 판정이지만 재구현: hooks 모듈은 로드 즉시 window 리스너를
//  등록하는 사이드이펙트가 있어 lib→hooks 역참조 부적절.
function isStandalonePWA(): boolean {
  try {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      && window.matchMedia('(display-mode: standalone)').matches) return true;
    return typeof navigator !== 'undefined'
      && (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

/**
 * 현재 브라우저 환경 정보를 반환
 */
export function getBrowserInfo(): BrowserInfo {
  const userAgent = (typeof navigator !== 'undefined' && navigator.userAgent) || '';

  let detectedApp: string | null = null;
  for (const { pattern, name } of IN_APP_BROWSER_PATTERNS) {
    if (pattern.test(userAgent)) {
      detectedApp = name;
      break;
    }
  }

  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

  // [CL-INAPP-IOS-20260713-224500] iOS 일반 WKWebView 휴리스틱(구체 패턴 미매칭 시 폴백).
  //  iOS 인앱 웹뷰는 Android 와 달리 'wv' 토큰이 없어 기존 폴백(/wv\)|WebView/)이 못 잡는다.
  //  iOS 실브라우저(Safari=Version/+Safari/, Chrome=CriOS, Firefox=FxiOS, Edge=EdgiOS, Opera=OPiOS/OPT/)는
  //  전부 'Safari/' 토큰을 유지 → 'AppleWebKit 있으면서 Safari/ 부재'가 인앱 신호. 홈화면 PWA 는 가드로
  //  제외. 오탐 시에도 탈출 안내(브릿지 UI)로 soft 강등이라 하드 차단 없음.
  if (
    !detectedApp && isIOS
    && /AppleWebKit/i.test(userAgent)
    && !/Safari\//i.test(userAgent)
    && !/CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|Version\//i.test(userAgent)
    && !isStandalonePWA()
  ) {
    detectedApp = '인앱 브라우저';
  }

  return {
    isInAppBrowser: detectedApp !== null,
    isKakaoTalk: /KAKAOTALK/i.test(userAgent),
    isAndroid: /Android/i.test(userAgent),
    isIOS,
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
 * [CL-SEC-INTENT-20260621] 외부 탈출 URL 안전화 — intent:// 인젝션·오픈 리다이렉트 차단.
 *
 * 탈출 대상은 언제나 "우리 앱의 현재 페이지"다(Auth/Landing/AcceptInvite 모두 window.location.href 전달).
 * 공격자가 보낸 동일 도메인 링크의 fragment(#...)에 '#Intent;...'를 심으면 Android intent: 파서가
 * 첫 '#' 를 Intent 블록 시작으로 해석해 임의 Intent(package/component/extras)를 주입할 수 있다.
 * 방어:
 *  - 동일 origin 이 아니면 우리 origin+pathname 으로 폴백(타 사이트로 못 내보냄)
 *  - URL fragment 제거(조기 '#Intent;' 종료 인젝션 원천 차단)
 *  - 쿼리스트링은 보존(초대 토큰 등 정상 파라미터)
 */
export function sanitizeBreakoutUrl(raw?: string): string {
  try {
    const u = new URL(raw || window.location.href);
    if (u.origin !== window.location.origin) {
      return window.location.origin + window.location.pathname;
    }
    u.hash = '';
    return u.toString();
  } catch {
    return window.location.origin + window.location.pathname;
  }
}

/**
 * [CL-SEC-INTENT-20260621] Android intent:// URL 을 파싱된 구성요소(host/path/query)로 안전 구성.
 * 정규식 prefix 제거가 아니라 컴포넌트만 사용 → 입력에 '#' 가 있어도 결과의 '#Intent;' 는 정확히 1개.
 * 원본 URL 은 S.browser_fallback_url 로 전달(크롬 미설치 시 폴백).
 */
function buildAndroidIntentUrl(safeUrl: string): string {
  const u = new URL(safeUrl);
  const stripped = u.host + u.pathname + u.search; // sanitize 가 fragment 를 제거했으므로 '#' 없음
  return `intent://${stripped}#Intent;scheme=https;package=com.android.chrome;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(safeUrl)};end`;
}

/**
 * 외부 브라우저로 현재 페이지 열기 (동기 - 즉시 1회 시도)
 * 
 * @param url 열려는 URL (기본값: 현재 페이지)
 * @returns 리다이렉트 시도 여부 (실제 성공은 비동기로만 확인 가능)
 */
export function openInExternalBrowser(url?: string): boolean {
  const targetUrl = sanitizeBreakoutUrl(url);
  const { isAndroid, isIOS, isInAppBrowser: isIAB } = getBrowserInfo();

  if (!isIAB) {
    return false;
  }

  try {
    if (isAndroid) {
      // Android: intent 스킴으로 Chrome 강제 호출 ([CL-SEC-INTENT-20260621] 파싱 구성요소로 빌드 → '#' 주입 차단)
      window.location.href = buildAndroidIntentUrl(targetUrl);
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

  // [CL-SEC-INTENT-20260621] 외부 탈출 대상은 항상 우리 앱 URL — origin 검증 + fragment 제거(intent 주입 차단)
  const safeUrl = sanitizeBreakoutUrl(url);

  // Android는 intent 스킴 한 번으로 충분
  if (info.isAndroid) {
    window.location.href = buildAndroidIntentUrl(safeUrl);
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
    window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(safeUrl)}`;
    // 카카오톡 스킴이 실패하면 800ms 후 2단계로
    setTimeout(() => attemptSafariScheme(safeUrl, onFallback), 800);
    return;
  }

  // 2단계부터 시작 (카카오톡이 아닌 경우)
  attemptSafariScheme(safeUrl, onFallback);
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

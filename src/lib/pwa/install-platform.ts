// [CL-PWA-A2HS-20260706-202320] "홈 화면/바탕화면 바로가기" 플랫폼 감지 — 순수 함수(테스트 결정성).
//
// 웹 표준상 사용자 바탕화면/홈 화면에 아이콘을 얹는 유일한 정식 경로 = PWA 설치(Add to Home Screen /
// Install app / Add to Dock). 브라우저/기기마다 트리거가 달라, navigator 접근을 인자로 격리해
// 판별자(InstallPlatform)를 산출한다. 이 파일은 React 비의존(순수) — 훅 래핑은 useInstallResolution.
//
// 판정 매트릭스(§계획 §1): installable(원터치) / ios / macos-safari / in-app / firefox / unsupported.

/** 설치 유도 방식 분기 판별자 */
export type InstallPlatform =
  | 'installable' // beforeinstallprompt 캡처됨(Android Chrome·삼성인터넷·데스크톱 Chrome/Edge/ChromeOS) → 원터치
  | 'ios' // iOS/iPadOS(WebKit) → 공유 시트 → '홈 화면에 추가'
  | 'macos-safari' // 맥 Safari → 공유 → 'Dock에 추가'(Safari 17+)
  | 'in-app' // 카카오/인스타/라인 등 인앱 브라우저 → 다른 브라우저로 열기
  | 'firefox' // Firefox(데스크톱/안드로이드) → 원터치 미지원 → 대체 안내
  | 'unsupported'; // 그 외 → 대체 안내(+ 데스크톱은 파일 폴백)

/** 파일 폴백(.url/.webloc) 종류·OS별 안내 분기용 */
export type InstallOS = 'android' | 'ios' | 'windows' | 'macos' | 'other';

export interface InstallResolution {
  platform: InstallPlatform;
  os: InstallOS;
  /** 네이티브 설치 프롬프트로 원터치 설치 가능(=installable) */
  canOneTap: boolean;
  /** 데스크톱인데 원터치 불가 → .url/.webloc 바탕화면 바로가기 파일 제공 가능 */
  canDownloadShortcut: boolean;
}

export interface ResolveInstallInput {
  /** usePWAInstall().isInstallable — beforeinstallprompt 캡처 여부 */
  isInstallable: boolean;
  /** usePWAInstall().isIOS — iOS/iPadOS(WebKit) 여부(iPadOS UA 위장 감지 포함) */
  isIOS: boolean;
  userAgent: string;
  /** iPadOS(Macintosh UA 위장) 구별용 — 여기서는 OS 산출 보조 */
  maxTouchPoints: number;
  /** kakao-browser.isInAppBrowser() — 인앱 브라우저 여부 */
  isInApp: boolean;
}

/** UA 로 데스크톱 Safari(맥) 판별 — Chromium/Edge/Firefox/OPR 계열 제외 */
function isDesktopSafari(ua: string): boolean {
  return /Safari/i.test(ua) && !/(Chrome|Chromium|Edg|OPR|CriOS|FxiOS|Firefox)/i.test(ua);
}

/** UA + isIOS 로 OS 산출. iOS 는 caller 의 정밀 판정(isIOSDevice)을 신뢰(iPadOS 위장 포함). */
export function detectOS(ua: string, isIOS: boolean): InstallOS {
  if (isIOS) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macos';
  return 'other';
}

/**
 * 설치 방식 해석. 우선순위(위에서부터 최초 매칭):
 * ① installable(이벤트 캡처 시 어떤 환경이든 원터치가 최선) → ② in-app → ③ ios
 * → ④ macos-safari → ⑤ firefox → ⑥ unsupported.
 */
export function resolveInstallPlatform(input: ResolveInstallInput): InstallResolution {
  const { isInstallable, isIOS, userAgent, isInApp } = input;
  const os = detectOS(userAgent, isIOS);

  let platform: InstallPlatform;
  if (isInstallable) {
    platform = 'installable';
  } else if (isInApp) {
    platform = 'in-app';
  } else if (isIOS) {
    platform = 'ios';
  } else if (os === 'macos' && isDesktopSafari(userAgent)) {
    platform = 'macos-safari';
  } else if (/Firefox|FxiOS/i.test(userAgent)) {
    platform = 'firefox';
  } else {
    platform = 'unsupported';
  }

  const canOneTap = platform === 'installable';
  // 원터치 불가한 데스크톱(Windows/macOS)에서만 바탕화면 바로가기 파일 폴백 제공
  const canDownloadShortcut = !canOneTap && (os === 'windows' || os === 'macos');

  return { platform, os, canOneTap, canDownloadShortcut };
}

/** 안내 모달용 아이콘 키(lucide 매핑은 InstallGuideDialog 에서) */
export type InstallGuideIcon = 'share' | 'download' | 'menu' | 'browser';

export interface InstallGuide {
  title: string;
  /** 순서 있는 단계 안내(굵은 강조는 **텍스트** 마크업 — 렌더러가 파싱) */
  steps: string[];
  icon: InstallGuideIcon;
}

/**
 * 플랫폼별(원터치 제외) 수동 안내 카피 — 한국어 표준.
 * installable 은 다이얼로그 없이 promptInstall() 이므로 제외.
 */
export const INSTALL_GUIDES: Record<Exclude<InstallPlatform, 'installable'>, InstallGuide> = {
  ios: {
    title: '홈 화면에 웨딩셈 추가',
    steps: [
      'Safari 하단의 **공유** 버튼을 누르세요',
      "메뉴에서 **‘홈 화면에 추가’** 를 선택하세요",
      "오른쪽 위 **‘추가’** 를 누르면 홈 화면에 아이콘이 생겨요",
    ],
    icon: 'share',
  },
  'macos-safari': {
    title: 'Dock에 웨딩셈 추가',
    steps: [
      '메뉴 막대 또는 주소창 옆의 **공유** 버튼을 누르세요',
      "**‘Dock에 추가’** 를 선택하세요 (Safari 17 이상)",
      '이전 버전이라면 아래 바로가기 파일을 내려받아 바탕화면에 두세요',
    ],
    icon: 'share',
  },
  firefox: {
    title: '바탕화면에 웨딩셈 바로가기',
    // [CL-AUDIT-PWA-EDGE-20260706-222500] "아래 파일" 정적 약속 제거 — 파일 안내는 canDownloadShortcut(win/mac)일 때만
    //   렌더되는 다운로드 버튼(+자체 helper)이 담당. Linux/기타(os='other')에서 없는 파일을 가리키던 불일치 해소.
    steps: [
      '**Chrome 또는 Edge** 로 열면 버튼 한 번으로 설치돼요',
      '모바일 Firefox 는 메뉴(⋮)에서 **‘홈 화면에 추가’** 를 선택하세요',
    ],
    icon: 'download',
  },
  unsupported: {
    title: '홈 화면·바탕화면에 추가',
    // [CL-AUDIT-PWA-EDGE-20260706-222500] "데스크톱은 아래 파일" 정적 약속 제거(위와 동일 사유).
    steps: [
      '**Chrome·Edge·Safari** 로 열면 더 간편하게 추가할 수 있어요',
      "브라우저 **메뉴(⋮)** 에서 **‘홈 화면에 추가’** 또는 **‘설치’** 를 선택하세요",
    ],
    icon: 'menu',
  },
  'in-app': {
    title: '브라우저에서 열어 추가',
    steps: [
      '현재 앱 내(인앱) 화면에서는 설치가 제한돼요',
      '우측 상단 **⋯ 메뉴** 에서 **‘다른 브라우저로 열기’** 를 선택하세요',
      '열린 Chrome·Safari 에서 설치 버튼을 누르면 완료돼요',
    ],
    icon: 'browser',
  },
};

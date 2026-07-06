// [CL-PWA-A2HS-20260706-202340] 바탕화면 바로가기 파일 폴백 — 설치 API 미지원 데스크톱(Firefox·구 Safari) 완결.
//
// 순수 웹은 사용자 바탕화면에 파일을 직접 쓸 수 없으므로(샌드박스), 대신 "바탕화면 바로가기 파일"을
// 다운로드로 제공한다. 사용자가 내려받아 바탕화면으로 옮기면 실제 바로가기가 완성된다.
//   - Windows: .url (Internet Shortcut, INI 형식)
//   - macOS  : .webloc (plist XML)
// URL 은 SITE_ORIGIN 단일소스(오픈 리다이렉트·도메인 드리프트 차단).
import { SITE_ORIGIN } from '@/config/site';

/** 다운로드 대상 OS(파일 포맷 결정) */
export type ShortcutOS = 'windows' | 'macos';

export interface ShortcutFile {
  filename: string;
  mime: string;
  content: string;
}

const SHORTCUT_URL = `${SITE_ORIGIN}/`;

/** Windows .url (Internet Shortcut) 콘텐츠 생성 */
export function buildWindowsUrlShortcut(): ShortcutFile {
  // CRLF 로 구분되는 INI 형식. 아이콘은 사이트 파비콘 참조(선택).
  const content = ['[InternetShortcut]', `URL=${SHORTCUT_URL}`, 'IconIndex=0', `IconFile=${SITE_ORIGIN}/favicon.ico`, ''].join('\r\n');
  return { filename: '웨딩셈.url', mime: 'application/internet-shortcut', content };
}

/** macOS .webloc (plist XML) 콘텐츠 생성 */
export function buildMacWeblocShortcut(): ShortcutFile {
  const content = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    '<dict>',
    '\t<key>URL</key>',
    `\t<string>${SHORTCUT_URL}</string>`,
    '</dict>',
    '</plist>',
    '',
  ].join('\n');
  return { filename: '웨딩셈.webloc', mime: 'application/x-webloc', content };
}

/** OS 에 맞는 바로가기 파일 스펙 반환 */
export function buildDesktopShortcut(os: ShortcutOS): ShortcutFile {
  return os === 'windows' ? buildWindowsUrlShortcut() : buildMacWeblocShortcut();
}

/**
 * 바탕화면 바로가기 파일을 브라우저 다운로드로 트리거.
 * 브라우저 기본 저장 위치는 '다운로드' 폴더 — 사용자가 바탕화면으로 옮기면 완성(안내 카피에 명시).
 * DOM 비가용(SSR/테스트) 환경에서는 안전하게 no-op 후 파일 스펙만 반환.
 */
export function downloadDesktopShortcut(os: ShortcutOS): ShortcutFile {
  const file = buildDesktopShortcut(os);
  try {
    if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      return file;
    }
    const blob = new Blob([file.content], { type: file.mime });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // 메모리 누수 방지 — 다음 틱에 revoke(클릭 처리 후). revoke 부재/무효 환경은 안전 무시.
    setTimeout(() => {
      try {
        if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(href);
      } catch {
        /* no-op */
      }
    }, 0);
  } catch {
    // 다운로드 실패는 무음 — 안내 모달 자체는 계속 유효
  }
  return file;
}

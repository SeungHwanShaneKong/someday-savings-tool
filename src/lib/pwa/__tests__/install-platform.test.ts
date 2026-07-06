// [CL-PWA-A2HS-20260706-202430] 설치 방식 감지 — §계획 §1 매트릭스 12행 결정성 검증.
import { describe, it, expect } from 'vitest';
import { resolveInstallPlatform, detectOS, INSTALL_GUIDES } from '../install-platform';

const UA = {
  galaxyChrome:
    'Mozilla/5.0 (Linux; Android 13; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  ipadSafari: // iPadOS 13+ 는 Macintosh 로 위장 → caller(isIOSDevice)가 isIOS=true 로 판정
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  macChrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  winChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  winEdge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  winFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  androidFirefox: 'Mozilla/5.0 (Android 13; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0',
  kakao:
    'Mozilla/5.0 (Linux; Android 13; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 KAKAOTALK 10.0.0',
};

const base = { isInstallable: false, isIOS: false, maxTouchPoints: 0, isInApp: false };

describe('resolveInstallPlatform — 매트릭스 12행', () => {
  it('1) 갤럭시 Chrome(설치 이벤트 O) → installable/android/원터치', () => {
    const r = resolveInstallPlatform({ ...base, isInstallable: true, userAgent: UA.galaxyChrome });
    expect(r.platform).toBe('installable');
    expect(r.os).toBe('android');
    expect(r.canOneTap).toBe(true);
    expect(r.canDownloadShortcut).toBe(false);
  });

  it('2) 안드로이드 Firefox(이벤트 X) → firefox/android/파일폴백X', () => {
    const r = resolveInstallPlatform({ ...base, userAgent: UA.androidFirefox });
    expect(r.platform).toBe('firefox');
    expect(r.os).toBe('android');
    expect(r.canDownloadShortcut).toBe(false);
  });

  it('3) 아이폰 Safari → ios/ios/파일폴백X', () => {
    const r = resolveInstallPlatform({ ...base, isIOS: true, userAgent: UA.iphoneSafari });
    expect(r.platform).toBe('ios');
    expect(r.os).toBe('ios');
    expect(r.canOneTap).toBe(false);
    expect(r.canDownloadShortcut).toBe(false);
  });

  it('4) 아이패드 Safari(Macintosh 위장·isIOS=true) → ios (macos-safari 로 오분류 안 됨)', () => {
    const r = resolveInstallPlatform({ ...base, isIOS: true, maxTouchPoints: 5, userAgent: UA.ipadSafari });
    expect(r.platform).toBe('ios');
    expect(r.os).toBe('ios');
  });

  it('5) Windows Chrome(설치 이벤트 O) → installable/windows', () => {
    const r = resolveInstallPlatform({ ...base, isInstallable: true, userAgent: UA.winChrome });
    expect(r.platform).toBe('installable');
    expect(r.os).toBe('windows');
    expect(r.canOneTap).toBe(true);
  });

  it('5b) Windows Edge(설치 이벤트 O) → installable/windows', () => {
    const r = resolveInstallPlatform({ ...base, isInstallable: true, userAgent: UA.winEdge });
    expect(r.platform).toBe('installable');
    expect(r.os).toBe('windows');
  });

  it('6) Windows Firefox(이벤트 X) → firefox/windows/파일폴백O', () => {
    const r = resolveInstallPlatform({ ...base, userAgent: UA.winFirefox });
    expect(r.platform).toBe('firefox');
    expect(r.os).toBe('windows');
    expect(r.canDownloadShortcut).toBe(true);
  });

  it('7) 맥 Chrome(설치 이벤트 O) → installable/macos', () => {
    const r = resolveInstallPlatform({ ...base, isInstallable: true, userAgent: UA.macChrome });
    expect(r.platform).toBe('installable');
    expect(r.os).toBe('macos');
  });

  it('7b) 맥 Chrome(이벤트 X·엣지케이스) → unsupported/macos/파일폴백O (Safari 로 오분류 안 됨)', () => {
    const r = resolveInstallPlatform({ ...base, userAgent: UA.macChrome });
    expect(r.platform).toBe('unsupported');
    expect(r.os).toBe('macos');
    expect(r.canDownloadShortcut).toBe(true);
  });

  it('8) 맥 Safari 17+ → macos-safari/macos/파일폴백O', () => {
    const r = resolveInstallPlatform({ ...base, userAgent: UA.macSafari });
    expect(r.platform).toBe('macos-safari');
    expect(r.os).toBe('macos');
    expect(r.canOneTap).toBe(false);
    expect(r.canDownloadShortcut).toBe(true);
  });

  it('11) 카카오 인앱(isInApp=true) → in-app (Chrome UA 여도 인앱 우선)', () => {
    const r = resolveInstallPlatform({ ...base, isInApp: true, userAgent: UA.kakao });
    expect(r.platform).toBe('in-app');
  });

  it('우선순위: 설치 이벤트 O 이면 인앱 여부와 무관하게 installable(원터치 최우선)', () => {
    const r = resolveInstallPlatform({ ...base, isInstallable: true, isInApp: true, userAgent: UA.kakao });
    expect(r.platform).toBe('installable');
  });
});

describe('detectOS', () => {
  it('isIOS=true → ios (Macintosh 위장이어도)', () => {
    expect(detectOS(UA.ipadSafari, true)).toBe('ios');
  });
  it('Android/Windows/Macintosh/기타', () => {
    expect(detectOS(UA.galaxyChrome, false)).toBe('android');
    expect(detectOS(UA.winChrome, false)).toBe('windows');
    expect(detectOS(UA.macSafari, false)).toBe('macos');
    expect(detectOS('SomethingUnknown/1.0', false)).toBe('other');
  });
});

describe('INSTALL_GUIDES', () => {
  it('installable 제외 모든 플랫폼에 title·steps(≥2)·icon 존재', () => {
    for (const key of ['ios', 'macos-safari', 'firefox', 'unsupported', 'in-app'] as const) {
      const g = INSTALL_GUIDES[key];
      expect(g.title.length).toBeGreaterThan(0);
      expect(g.steps.length).toBeGreaterThanOrEqual(2);
      expect(['share', 'download', 'menu', 'browser']).toContain(g.icon);
    }
  });
});

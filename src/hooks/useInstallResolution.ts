// [CL-PWA-A2HS-20260706-202400] 설치 방식 해석 훅 — usePWAInstall + navigator + 인앱 감지를 결합해
// 단일 InstallResolution 을 반환한다(InstallAppButton·InstallPrompt 가 공유 → 로직 단일화).
import { useMemo } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { isInAppBrowser } from '@/lib/kakao-browser';
import { resolveInstallPlatform, type InstallResolution } from '@/lib/pwa/install-platform';

export interface UseInstallResolution {
  resolution: InstallResolution;
  isStandalone: boolean;
  /** 네이티브 설치 프롬프트(이벤트당 1회) — canOneTap 일 때만 유효 */
  promptInstall: ReturnType<typeof usePWAInstall>['promptInstall'];
}

/** 현재 브라우저/기기의 설치 방식 해석 + standalone 여부 + 원터치 트리거를 반환 */
export function useInstallResolution(): UseInstallResolution {
  const { isInstallable, isIOS, isStandalone, promptInstall } = usePWAInstall();

  const resolution = useMemo<InstallResolution>(() => {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    // 인앱 감지 실패(예외·미가용)는 "인앱 아님"으로 안전 degrade — 설치 버튼이 페이지를 깨지 않게.
    let isInApp = false;
    try {
      isInApp = isInAppBrowser();
    } catch {
      isInApp = false;
    }
    return resolveInstallPlatform({
      isInstallable,
      isIOS,
      userAgent: nav?.userAgent ?? '',
      maxTouchPoints: nav?.maxTouchPoints ?? 0,
      isInApp,
    });
  }, [isInstallable, isIOS]);

  return { resolution, isStandalone, promptInstall };
}

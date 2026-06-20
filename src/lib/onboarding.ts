// [CL-ONBOARDING-20260619-222424] 온보딩 첫 방문 게이팅 (버전 키 + 안전 localStorage)
// 버전 접미사로 향후 투어 개편 시 재노출 가능. Safari 프라이빗 모드 등 throw 방어.

export const ONBOARDING_STORAGE_KEY = 'onboarding_seen_v1';

export function hasSeenOnboarding(): boolean {
  try {
    return !!localStorage.getItem(ONBOARDING_STORAGE_KEY);
  } catch {
    return false;
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
  } catch {
    /* 저장 실패는 무시(폴백) */
  }
}

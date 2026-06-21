// [CL-FEEDBACK-DAILY-20260621] 기능 요청 프롬프트 — 사용자별 하루 1회 게이트
// KST 날짜 + localStorage 키. 사람들이 피곤하지 않도록 당일 1회만 노출(탭하든 안하든).
import { toKSTDateString } from '@/lib/gamification/streak-calc';

const keyFor = (userKey: string) => `feature_prompt_shown_${userKey}_${toKSTDateString()}`;

/** 오늘(KST) 아직 안 보여줬으면 true. (Safari 프라이빗 등 실패 시 false=노출 안 함) */
export function shouldShowFeaturePrompt(userKey: string): boolean {
  try {
    return !localStorage.getItem(keyFor(userKey));
  } catch {
    return false;
  }
}

/** 오늘 노출함으로 표시(당일 재노출 0). */
export function markFeaturePromptShown(userKey: string): void {
  try {
    localStorage.setItem(keyFor(userKey), '1');
  } catch {
    /* 무시 */
  }
}

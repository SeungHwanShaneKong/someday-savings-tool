// [CL-FEEDBACK-DAILY-20260621] 피드백 프롬프트 1일1회 게이트 단위 테스트
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { shouldShowFeaturePrompt, markFeaturePromptShown } from '../feature-request-gate';

describe('feature-request-gate (하루 1회)', () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch { /* noop */ }
    vi.useRealTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('처음엔 노출 가능(true)', () => {
    expect(shouldShowFeaturePrompt('user-1')).toBe(true);
  });

  it('표시 후 같은 날엔 재노출 0(false)', () => {
    markFeaturePromptShown('user-1');
    expect(shouldShowFeaturePrompt('user-1')).toBe(false);
  });

  it('사용자별로 독립(다른 사용자는 여전히 노출 가능)', () => {
    markFeaturePromptShown('user-1');
    expect(shouldShowFeaturePrompt('user-2')).toBe(true);
  });

  it('날짜(KST)가 바뀌면 다시 노출 가능', () => {
    // 1일차에 표시 → 소진
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-21T05:00:00.000Z')); // KST 14:00 6/21
    markFeaturePromptShown('user-1');
    expect(shouldShowFeaturePrompt('user-1')).toBe(false);

    // 다음 날(KST)로 이동 → 키가 달라져 재노출
    vi.setSystemTime(new Date('2026-06-22T05:00:00.000Z')); // KST 14:00 6/22
    expect(shouldShowFeaturePrompt('user-1')).toBe(true);
  });
});

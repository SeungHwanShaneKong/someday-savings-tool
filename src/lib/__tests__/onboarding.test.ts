// [CL-ONBOARDING-20260619-222424] 온보딩 게이팅 로직 단위 검증
import { describe, it, expect, beforeEach } from 'vitest';
import { hasSeenOnboarding, markOnboardingSeen, ONBOARDING_STORAGE_KEY } from '../onboarding';

beforeEach(() => localStorage.removeItem(ONBOARDING_STORAGE_KEY));

describe('onboarding gating', () => {
  it('OB.1 초기엔 안 본 상태', () => {
    expect(hasSeenOnboarding()).toBe(false);
  });
  it('OB.2 mark 후 본 상태 + 버전 키 저장', () => {
    markOnboardingSeen();
    expect(hasSeenOnboarding()).toBe(true);
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('1');
  });
});

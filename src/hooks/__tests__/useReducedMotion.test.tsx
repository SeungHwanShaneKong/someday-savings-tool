// [CL-ANIM-UPGRADE-20260621-150000] useReducedMotion 단위 테스트
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useReducedMotion } from '../useReducedMotion';

const mockMatchMedia = (matches: boolean) =>
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList);

describe('useReducedMotion', () => {
  afterEach(() => vi.restoreAllMocks());

  it('matchMedia.matches=false 면 false(모션 허용)', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('matchMedia.matches=true 면 true(모션 감소 선호)', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });
});

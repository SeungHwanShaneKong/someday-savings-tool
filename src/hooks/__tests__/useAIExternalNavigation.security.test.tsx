// [CL-QUALITY-REDIRECT-20260621] useAIExternalNavigation origin allowlist 검증 회귀 가드(open-redirect 차단).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAIExternalNavigation } from '@/hooks/useAIExternalNavigation';

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

let realLoc: PropertyDescriptor | undefined;
let captured = '';
beforeEach(() => {
  vi.useFakeTimers();
  realLoc = Object.getOwnPropertyDescriptor(window, 'location');
  captured = '';
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      origin: 'https://moderninsightspot.com',
      pathname: '/',
      get href() { return 'https://moderninsightspot.com/'; },
      set href(v: string) { captured = v; },
    },
  });
});
afterEach(() => {
  if (realLoc) Object.defineProperty(window, 'location', realLoc);
  vi.useRealTimers();
});

describe('useAIExternalNavigation — URL allowlist 검증', () => {
  it('SEC.1 javascript: 스킴은 차단(location.href 미대입)', () => {
    const { result } = renderHook(() => useAIExternalNavigation());
    act(() => result.current.startNavigation({ url: 'javascript:alert(document.cookie)//', title: 'x' }));
    act(() => vi.advanceTimersByTime(500));
    expect(captured).not.toContain('javascript:');
  });

  it('SEC.2 비허용 외부 origin 차단', () => {
    const { result } = renderHook(() => useAIExternalNavigation());
    act(() => result.current.startNavigation({ url: 'https://evil.example.com/phish', title: 'x' }));
    act(() => vi.advanceTimersByTime(500));
    expect(captured).not.toContain('evil.example.com');
  });

  it('SEC.3 허용된 honeymoon 서브도메인은 통과(회귀)', () => {
    const { result } = renderHook(() => useAIExternalNavigation());
    act(() => result.current.startNavigation({ url: 'https://honeymoon.moderninsightspot.com', title: 'x' }));
    act(() => vi.advanceTimersByTime(500));
    expect(captured).toBe('https://honeymoon.moderninsightspot.com');
  });
});

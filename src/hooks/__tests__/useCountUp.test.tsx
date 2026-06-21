// [CL-ANIM-UPGRADE-20260621-150000] useCountUp 단위 테스트
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useCountUp } from '../useCountUp';

const mockReducedMotion = (matches: boolean) =>
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

describe('useCountUp', () => {
  afterEach(() => vi.restoreAllMocks());

  it('초기 렌더는 target 값으로 시작한다', () => {
    const { result } = renderHook(({ t }) => useCountUp(t, 200), {
      initialProps: { t: 500 },
    });
    expect(result.current).toBe(500);
  });

  it('새 target 으로 보간 후 정확히 그 값에 정착한다', async () => {
    const { result, rerender } = renderHook(({ t }) => useCountUp(t, 80), {
      initialProps: { t: 0 },
    });
    rerender({ t: 1000 });
    await waitFor(() => expect(result.current).toBe(1000));
  });

  it('reduced-motion 이면 보간 없이 즉시 target', async () => {
    mockReducedMotion(true);
    const { result, rerender } = renderHook(({ t }) => useCountUp(t, 500), {
      initialProps: { t: 0 },
    });
    rerender({ t: 9000 });
    await waitFor(() => expect(result.current).toBe(9000));
  });

  // [CL-AUDIT-COUNTUP-FINITE-20260622] 비유한값 방어 — 'NaN원'/'Infinity억' 렌더 차단
  it('NaN target → 0 으로 정규화', () => {
    const { result } = renderHook(() => useCountUp(NaN, 100));
    expect(result.current).toBe(0);
  });

  it('Infinity target → 0 으로 정규화', () => {
    const { result } = renderHook(() => useCountUp(Infinity, 100));
    expect(result.current).toBe(0);
  });
});

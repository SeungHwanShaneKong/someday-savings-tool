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

  // [CL-BTN-AUDIT-20260703-120000] 숨겨진/비활성 탭에서 rAF 가 throttle(콜백 미발화)돼도
  //   시각값이 최종 target 으로 수렴해야 한다(시각값↔aria-live 발산 방지). 프리뷰(hidden tab)에서
  //   시뮬레이터 총액이 stale 로 고정되던 강건성 공백의 회귀 가드.
  it('숨겨진 탭(rAF 미발화)에서도 최종값으로 즉시 스냅한다', () => {
    // rAF 를 콜백이 절대 발화되지 않도록 mock(백그라운드 탭 throttle 재현)
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
    const hiddenDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    try {
      const { result, rerender } = renderHook(({ t }) => useCountUp(t, 500), {
        initialProps: { t: 100 },
      });
      expect(result.current).toBe(100);
      rerender({ t: 9000 });
      // 수정 전: rAF 콜백 미발화 + 폴백 없음 → 100 에 고정(RED). 수정 후: 즉시 9000.
      expect(result.current).toBe(9000);
    } finally {
      rafSpy.mockRestore();
      if (hiddenDesc) Object.defineProperty(document, 'hidden', hiddenDesc);
      else delete (document as unknown as { hidden?: boolean }).hidden;
    }
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

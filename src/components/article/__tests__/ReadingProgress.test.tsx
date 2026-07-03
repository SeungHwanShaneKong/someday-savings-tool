/**
 * [CL-TOP20-P2-ARTICLE-20260703-020000] ReadingProgress 단위 테스트
 * jsdom 은 레이아웃이 없으므로 scrollHeight/clientHeight/scrollY 를 직접 정의하고
 * rAF 를 큐 스텁으로 치환해 스로틀·진행률 계산을 결정론적으로 검증한다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReadingProgress from '../ReadingProgress';

/* ─── 스크롤 메트릭 스텁 ─── */
function setScrollMetrics(opts: { scrollHeight: number; clientHeight: number; scrollY: number }) {
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    value: opts.scrollHeight,
    configurable: true,
  });
  Object.defineProperty(document.documentElement, 'clientHeight', {
    value: opts.clientHeight,
    configurable: true,
  });
  Object.defineProperty(window, 'scrollY', {
    value: opts.scrollY,
    writable: true,
    configurable: true,
  });
}

/* ─── matchMedia 스텁(reduced-motion 토글) — setup.ts 기본은 matches:false ─── */
function setMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe('ReadingProgress — 스크롤 읽기 진행바', () => {
  let rafQueue: FrameRequestCallback[] = [];
  let rafSpy: ReturnType<typeof vi.fn>;

  const flushRaf = () => {
    const q = [...rafQueue];
    rafQueue = [];
    q.forEach((cb) => cb(0));
  };

  beforeEach(() => {
    rafQueue = [];
    rafSpy = vi.fn((cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });
    vi.stubGlobal('requestAnimationFrame', rafSpy);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setMatchMedia(false); // 기본값 복원
  });

  it('R1: 마운트 시 스크롤 0 → scaleX(0) 초기 렌더 + 장식 요소(aria-hidden)', () => {
    setScrollMetrics({ scrollHeight: 2000, clientHeight: 1000, scrollY: 0 });
    render(<ReadingProgress />);
    expect(screen.getByTestId('reading-progress')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('reading-progress-bar').style.transform).toBe('scaleX(0)');
  });

  it('R2: 50% 스크롤 후 scroll 이벤트 → rAF 플러시 시 scaleX(0.5)', () => {
    setScrollMetrics({ scrollHeight: 2000, clientHeight: 1000, scrollY: 0 });
    render(<ReadingProgress />);
    setScrollMetrics({ scrollHeight: 2000, clientHeight: 1000, scrollY: 500 });
    fireEvent.scroll(window);
    flushRaf();
    expect(screen.getByTestId('reading-progress-bar').style.transform).toBe('scaleX(0.5)');
  });

  it('R3: rAF 스로틀 — 플러시 전 연속 scroll 3회에도 rAF 예약은 1회', () => {
    setScrollMetrics({ scrollHeight: 2000, clientHeight: 1000, scrollY: 100 });
    render(<ReadingProgress />);
    fireEvent.scroll(window);
    fireEvent.scroll(window);
    fireEvent.scroll(window);
    expect(rafSpy).toHaveBeenCalledTimes(1);
  });

  it('R4: prefers-reduced-motion → transition 클래스 제거, 기본은 포함', () => {
    setScrollMetrics({ scrollHeight: 2000, clientHeight: 1000, scrollY: 0 });
    setMatchMedia(true);
    const { unmount } = render(<ReadingProgress />);
    expect(screen.getByTestId('reading-progress-bar').className).not.toContain('transition-transform');
    unmount();

    setMatchMedia(false);
    render(<ReadingProgress />);
    expect(screen.getByTestId('reading-progress-bar').className).toContain('transition-transform');
  });

  it('R5: 스크롤 여지 0(짧은 문서) → 0-나눗셈 없이 scaleX(0)', () => {
    setScrollMetrics({ scrollHeight: 800, clientHeight: 800, scrollY: 0 });
    render(<ReadingProgress />);
    expect(screen.getByTestId('reading-progress-bar').style.transform).toBe('scaleX(0)');
  });

  it('R6: 진행률 상한 클램프 — scrollY 가 범위를 넘어도 scaleX(1)', () => {
    setScrollMetrics({ scrollHeight: 2000, clientHeight: 1000, scrollY: 99999 });
    render(<ReadingProgress />);
    fireEvent.scroll(window);
    flushRaf();
    expect(screen.getByTestId('reading-progress-bar').style.transform).toBe('scaleX(1)');
  });

  it('R7: 언마운트 시 scroll 리스너 정리(다음 scroll 에 rAF 미예약)', () => {
    setScrollMetrics({ scrollHeight: 2000, clientHeight: 1000, scrollY: 0 });
    const { unmount } = render(<ReadingProgress />);
    unmount();
    rafSpy.mockClear();
    fireEvent.scroll(window);
    expect(rafSpy).not.toHaveBeenCalled();
  });
});

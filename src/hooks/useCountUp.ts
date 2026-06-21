// [CL-ANIM-UPGRADE-20260621-150000] 숫자 카운트업 — prev→next 보간(rAF, easeOutCubic)
// 총액 등 "변화가 보이면 만족스러운" 숫자에만 사용. reduced-motion 이면 즉시 최종값.
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * target 값으로 부드럽게 카운트업되는 정수를 반환한다.
 * - 새 target 으로 바뀌면 "현재 표시값"에서 출발해 durationMs 동안 보간.
 * - prefers-reduced-motion 이면 보간 없이 즉시 target.
 */
export function useCountUp(rawTarget: number, durationMs = 500): number {
  // [CL-AUDIT-COUNTUP-FINITE-20260622] NaN/Infinity 방어 — 비유한값은 0으로 정규화('NaN원'/'Infinity억' 렌더 차단)
  const target = Number.isFinite(rawTarget) ? rawTarget : 0;
  const reduced = useReducedMotion();
  const [value, _setValue] = useState(target);
  const valueRef = useRef(target);

  const setValue = (v: number) => {
    valueRef.current = v;
    _setValue(v);
  };

  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    const from = valueRef.current;
    if (from === target) return;
    if (typeof window === 'undefined' || !window.requestAnimationFrame) {
      setValue(target);
      return;
    }

    let rafId = 0;
    let start: number | undefined;
    const tick = (now: number) => {
      if (start === undefined) start = now;
      const t = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(from + (target - from) * easeOutCubic(t)));
      if (t < 1) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [target, durationMs, reduced]);

  return value;
}

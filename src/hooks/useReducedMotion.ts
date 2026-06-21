// [CL-ANIM-UPGRADE-20260621-150000] prefers-reduced-motion JS 게이트
// CSS는 @media 로 이미 처리되나, JS 구동 효과(파티클 스폰·숫자 카운트업)는
// 런타임에 모션 여부를 알아야 즉시 정적으로 폴백할 수 있다.
import { useState, useEffect } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/** 사용자가 "모션 줄이기"를 선호하면 true. SSR/프리렌더 환경에선 false(모션 허용) 기본. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

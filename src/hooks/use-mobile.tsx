import * as React from "react";

// [CL-AUDIT-POKE-D1-20260711] 단일 브레이크포인트 소스 — effect 시점 동기 판정이 필요한 곳
//   (예: PokeNudgeCard 넛지 배타)이 useIsMobile(비동기 첫-렌더 false) 대신 이 상수로 직독하도록 export.
export const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

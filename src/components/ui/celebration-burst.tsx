// [CL-ANIM-UPGRADE-20260621-150000] CelebrationBurst — CSS 전용 축하 파티클 (canvas 없음)
// InsightCard 의 .insight-particle 패턴을 일반화: 방사형 분산 + 개수/색/반경 파라미터화.
// 희소한 성취(체크리스트 100%·뱃지 언락)에만 사용. reduced-motion 이면 아무것도 렌더하지 않음.
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface CelebrationBurstProps {
  /** true 로 바뀌는 순간 1회 분사 */
  active: boolean;
  /** 파티클 개수 (기본 14) */
  count?: number;
  /** 분사 반경 px (기본 64) */
  radius?: number;
  /** 파티클 색 클래스 풀 (Tailwind bg-*) */
  colors?: string[];
  /** 분사 지속(ms) 후 onDone 호출 — 부모가 active 를 내릴 수 있게 */
  onDone?: () => void;
  className?: string;
}

// 결혼 도메인 따뜻한 팔레트 (chart 토큰과 정합)
const DEFAULT_COLORS = [
  'bg-primary',
  'bg-pink-400',
  'bg-amber-400',
  'bg-emerald-400',
  'bg-violet-400',
  'bg-sky-400',
];

const DURATION_MS = 750;

export function CelebrationBurst({
  active,
  count = 14,
  radius = 64,
  colors = DEFAULT_COLORS,
  onDone,
  className,
}: CelebrationBurstProps) {
  const reduced = useReducedMotion();
  const [bursting, setBursting] = useState(false);

  useEffect(() => {
    if (!active || reduced) return;
    setBursting(true);
    const t = setTimeout(() => {
      setBursting(false);
      onDone?.();
    }, DURATION_MS);
    return () => clearTimeout(t);
    // active 의 상승엣지에만 반응
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduced]);

  if (reduced || !bursting) return null;

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 z-10 overflow-visible', className)}
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => {
        // 방사형 균등 분산 + 반경을 인덱스 패리티로 살짝 변주(생동감, 결정론적)
        const angle = (i / count) * Math.PI * 2;
        const r = radius * (i % 3 === 0 ? 1 : i % 3 === 1 ? 0.78 : 0.92);
        const tx = `${Math.round(Math.cos(angle) * r)}px`;
        const ty = `${Math.round(Math.sin(angle) * r)}px`;
        return (
          <span
            key={i}
            className={cn('celebration-particle is-active', colors[i % colors.length])}
            style={
              {
                '--tx': `calc(-50% + ${tx})`,
                '--ty': `calc(-50% + ${ty})`,
                animationDelay: `${(i % 5) * 24}ms`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

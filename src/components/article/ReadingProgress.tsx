/**
 * [CL-TOP20-P2-ARTICLE-20260703-020000] 아티클 스크롤 읽기 진행바 (Top 20 로드맵 P2-#10)
 *
 * - fixed top-0 + h-1 + bg-primary, width 대신 transform: scaleX(진행률) — 리플로우 없는 GPU 합성 경로.
 * - rAF 스로틀(프레임당 1회) + passive scroll/resize 리스너 — 스크롤 성능 비침해.
 * - setState 대신 ref 직접 스타일 갱신 — 스크롤마다 리렌더 0회.
 * - prefers-reduced-motion 시 transition 제거(useReducedMotion 공용 훅 재사용, 즉시 반영).
 * - 장식 요소이므로 aria-hidden(스크린리더 소음 방지) + pointer-events-none.
 */
import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const update = () => {
      rafRef.current = null;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      // 스크롤 여지가 없으면(짧은 문서) 0 고정 — 0-나눗셈 가드
      const ratio =
        scrollable > 0
          ? Math.min(1, Math.max(0, (window.scrollY || doc.scrollTop || 0) / scrollable))
          : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${ratio})`;
    };

    const onScroll = () => {
      if (rafRef.current !== null) return; // rAF 스로틀: 예약 중이면 스킵
      rafRef.current = window.requestAnimationFrame(update);
    };

    update(); // 진입 시 현재 스크롤 위치 즉시 반영(중간 진입·복원 대응)
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      data-testid="reading-progress"
      className="fixed top-0 left-0 right-0 z-50 h-1 pointer-events-none"
    >
      <div
        ref={barRef}
        data-testid="reading-progress-bar"
        className={`h-full w-full origin-left bg-primary${
          reducedMotion ? '' : ' transition-transform duration-150 ease-out'
        }`}
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}

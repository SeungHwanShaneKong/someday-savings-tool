/**
 * [CL-AI-EXTNAV-OVERLAY-20260418-205622] AI 외부 이동 풀스크린 로딩 오버레이
 * - 선물 추천 AI / AI 허니문 큐레이션 카드 클릭 시 외부 도메인 이동 대기 UX
 * - Sparkles + glow + 3단계 메시지 로테이션 + bounce dots + phase progress
 * - 기존 LoadingStep.tsx 디자인 DNA 계승, 새로운 CSS 추가 없음
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIExternalNavigationOverlayProps {
  open: boolean;
  title: string;
}

const PHASE_MESSAGES = [
  'AI 모델 깨우는 중',
  'AI 모델 연결 중',
  '곧 연결 완료',
] as const;

const PHASE_INTERVAL_MS = 1100;

export function AIExternalNavigationOverlay({
  open,
  title,
}: AIExternalNavigationOverlayProps) {
  const [phase, setPhase] = useState<0 | 1 | 2>(0);

  // 메시지 단계별 로테이션: 0 → 1 → 2 (1.1초 간격)
  useEffect(() => {
    if (!open) {
      setPhase(0);
      return;
    }
    const t1 = window.setTimeout(() => setPhase(1), PHASE_INTERVAL_MS);
    const t2 = window.setTimeout(() => setPhase(2), PHASE_INTERVAL_MS * 2);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [open]);

  // SSR 가드 + 미노출 시 렌더 생략
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm animate-fade-up px-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">
        AI 외부 서비스 페이지로 이동하는 중입니다. {PHASE_MESSAGES[phase]}.
      </span>

      {/* Sparkles 아이콘 + 배경 글로우 */}
      <div className="relative mb-8">
        <Sparkles
          className="w-16 h-16 text-primary animate-float"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-primary/10 rounded-full blur-2xl animate-pulse"
          aria-hidden="true"
        />
      </div>

      {/* 카드별 커스텀 타이틀 */}
      <h2 className="text-heading text-foreground mb-3 text-center max-w-sm">
        {title}
      </h2>

      {/* 단계별 회전 메시지 */}
      <p
        key={phase}
        className="text-sm text-muted-foreground mb-2 animate-fade-up"
        style={{ animationDuration: '0.3s' }}
      >
        {PHASE_MESSAGES[phase]}
      </p>

      <p className="text-xs text-muted-foreground/60 mb-6 text-center">
        잠시만 기다려주세요 · 외부 AI 서비스로 이동합니다
      </p>

      {/* Animated bounce dots (기존 LoadingStep DNA) */}
      <div className="flex gap-1.5 mb-6" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>

      {/* Phase progress indicator — 3-bar */}
      <div className="flex gap-2" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 w-8 rounded-full transition-colors duration-300',
              i <= phase ? 'bg-primary' : 'bg-muted',
            )}
          />
        ))}
      </div>
    </div>,
    document.body,
  );
}

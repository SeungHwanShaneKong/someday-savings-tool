/**
 * [CL-HONEYMOON-REDESIGN-20260316] 환영 화면
 * 토스 스타일 1-screen-1-action CTA
 */

import { Sparkles, Heart, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WelcomeStepProps {
  onStart: () => void;
  onSkip?: () => void;
}

export function WelcomeStep({ onStart, onSkip }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-12 text-center">
      {/* Floating icons */}
      <div className="relative mb-8">
        <div className="text-6xl animate-float">✈️</div>
        <Heart
          className="absolute -top-2 -right-4 w-5 h-5 text-rose-400 animate-bounce"
          style={{ animationDelay: '0.3s' }}
          aria-hidden="true"
        />
        <Sparkles
          className="absolute -bottom-1 -left-4 w-5 h-5 text-amber-400 animate-bounce"
          style={{ animationDelay: '0.6s' }}
          aria-hidden="true"
        />
      </div>

      {/* Title */}
      <h1 className="text-heading text-foreground mb-3">
        우리만의 허니문,
        <br />
        찾아볼까요?
      </h1>

      {/* Subtitle */}
      <p className="text-body text-muted-foreground mb-2 max-w-xs">
        간단한 이미지 테스트로
        <br />
        딱 맞는 여행지를 추천해 드려요
      </p>

      {/* Sub info */}
      <div className="flex items-center gap-4 text-caption text-muted-foreground/70 mb-10">
        <span className="flex items-center gap-1">
          <Plane className="w-3.5 h-3.5" aria-hidden="true" />
          약 2분 소요
        </span>
        <span>•</span>
        <span>AI 맞춤 추천</span>
      </div>

      {/* CTA */}
      <Button
        size="lg"
        onClick={onStart}
        className="rounded-2xl px-10 py-6 text-base font-semibold shadow-primary-glow animate-pulse-subtle w-full max-w-xs"
      >
        <Sparkles className="w-5 h-5 mr-2" />
        시작하기
      </Button>

      {/* Skip option — 온보딩 건너뛰고 바로 지도 */}
      {onSkip && (
        <button
          onClick={onSkip}
          className="mt-4 text-small text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          바로 지도 보기
        </button>
      )}
    </div>
  );
}

/**
 * [CL-GAMIFY-INT-20260418-222329] 🔥 Streak 카운터
 * - 숫자 + 불꽃 이모지 + 마일스톤 도달 시 애니메이션
 * - variant: login(로그인 streak) | checklist(체크리스트 streak)
 * - 0일일 때는 흐린 상태 (첫 로그인 권유)
 */
import { cn } from '@/lib/utils';
import {
  currentMilestone,
  daysToNextMilestone,
} from '@/lib/gamification/streak-calc';

interface StreakFlameProps {
  days: number;
  variant?: 'login' | 'checklist';
  size?: 'sm' | 'md' | 'lg';
  showNextMilestone?: boolean;
  className?: string;
}

const VARIANT_LABELS = {
  login: '로그인 연속',
  checklist: '체크리스트 연속',
} as const;

const SIZE_STYLES = {
  sm: { wrap: 'gap-1 px-2 py-1 text-xs', emoji: 'text-sm', number: 'text-sm' },
  md: { wrap: 'gap-1.5 px-3 py-1.5 text-sm', emoji: 'text-lg', number: 'text-base' },
  lg: { wrap: 'gap-2 px-4 py-2 text-base', emoji: 'text-2xl', number: 'text-xl' },
};

export function StreakFlame({
  days,
  variant = 'login',
  size = 'md',
  showNextMilestone = false,
  className,
}: StreakFlameProps) {
  const sz = SIZE_STYLES[size];
  const milestone = currentMilestone(days);
  const toNext = daysToNextMilestone(days);
  const isHot = days >= 3; // 3일 이상이면 "hot" 상태

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border',
        sz.wrap,
        isHot
          ? 'border-orange-400/60 bg-orange-500/10 text-orange-700 dark:text-orange-300'
          : 'border-border bg-muted/30 text-muted-foreground',
        milestone >= 30 && 'animate-glow-pulse',
        className,
      )}
      role="status"
      aria-label={`${VARIANT_LABELS[variant]} ${days}일`}
    >
      <span className={cn(sz.emoji, !isHot && 'grayscale opacity-60')} aria-hidden>
        {milestone >= 365 ? '🌟' : milestone >= 100 ? '💎' : milestone >= 30 ? '🥇' : milestone >= 14 ? '🥈' : milestone >= 7 ? '🥉' : '🔥'}
      </span>
      <span className={cn('font-bold tabular-nums', sz.number)}>{days}</span>
      <span className="text-[10px] opacity-80 uppercase tracking-wider hidden sm:inline">
        일 연속
      </span>
      {showNextMilestone && toNext !== null && days > 0 && (
        <span className="text-[10px] opacity-70 hidden md:inline">
          · {toNext}일 더
        </span>
      )}
    </div>
  );
}

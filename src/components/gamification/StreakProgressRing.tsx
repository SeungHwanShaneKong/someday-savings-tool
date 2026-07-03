/**
 * [CL-TOP20-P4-GAMIFY-20260703-040000] 🔥 스트릭 원형 진행 링
 * - LevelRing 의 SVG 원형 패턴 계승: 다음 마일스톤(7/14/30/100/365)까지 구간 내 진행률 시각화
 * - 중앙에 기존 StreakFlame 재사용(정보 유실 0) + 하단 "🏆 n일 더!" 카운트다운
 * - 진행 스트로크 = wedding-gold 토큰(웜톤) · reduced-motion 시 transition 제거(motion-reduce)
 * - 계산은 순수 함수 milestoneProgress 에 위임 (경계 테스트 별도)
 */
import { cn } from '@/lib/utils';
import { StreakFlame } from './StreakFlame';
import { milestoneProgress } from '@/lib/gamification/milestone-progress';

interface StreakProgressRingProps {
  /** 현재 스트릭 일수 (useStreak.loginStreakDays / checklistStreakDays) */
  days: number;
  variant?: 'login' | 'checklist';
  /** 링 지름 px (기본 124) */
  size?: number;
  className?: string;
}

const VARIANT_LABELS = {
  login: '로그인 연속',
  checklist: '체크리스트 연속',
} as const;

export function StreakProgressRing({
  days,
  variant = 'login',
  size = 124,
  className,
}: StreakProgressRingProps) {
  const { next, ratio, daysToNext } = milestoneProgress(days);
  const percent = Math.round(ratio * 100);

  const strokeWidth = 6;
  const radius = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - ratio);

  return (
    <div className={cn('inline-flex flex-col items-center gap-1.5', className)}>
      <div
        className="relative"
        style={{ width: size, height: size }}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={
          next !== null
            ? `${VARIANT_LABELS[variant]} 다음 마일스톤 ${next}일까지 ${daysToNext}일 남음`
            : `${VARIANT_LABELS[variant]} 최고 마일스톤 달성`
        }
      >
        <svg
          className="-rotate-90"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
        >
          {/* 트랙 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          {/* 진행 (웜톤 wedding-gold) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--wedding-gold))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={`${strokeDashoffset}`}
            className="transition-all duration-700 ease-out motion-reduce:transition-none"
          />
        </svg>
        {/* 중앙: 기존 StreakFlame 그대로 재사용 (일수·마일스톤 아이콘·hot 상태 유지) */}
        <div className="absolute inset-0 flex items-center justify-center p-2">
          <StreakFlame days={days} variant={variant} size="sm" />
        </div>
      </div>
      {/* 하단 카운트다운 — 정보는 progressbar aria-label 이 이미 전달 → 중복 낭독 방지 */}
      <p className="text-xs font-medium text-muted-foreground" aria-hidden="true">
        {next !== null ? (
          <>
            <span aria-hidden>🏆</span> {daysToNext}일 더!
          </>
        ) : (
          <>
            <span aria-hidden>🌟</span> 최고 기록 달성!
          </>
        )}
      </p>
    </div>
  );
}

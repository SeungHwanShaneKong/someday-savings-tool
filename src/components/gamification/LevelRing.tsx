/**
 * [CL-GAMIFY-INT-20260418-222329] 사용자 레벨 원형 진행 링
 * - ChecklistProgress.tsx 의 SVG 원형 패턴을 차용
 * - 총 포인트 + 레벨 + 다음 레벨까지 %
 */
import { cn } from '@/lib/utils';
import {
  calculateLevel,
  pointsToNextLevel,
} from '@/lib/gamification/types';

interface LevelRingProps {
  totalPoints: number;
  size?: number;
  className?: string;
}

export function LevelRing({
  totalPoints,
  size = 112,
  className,
}: LevelRingProps) {
  const level = calculateLevel(totalPoints);
  const nextLevelRemaining = pointsToNextLevel(totalPoints);
  const currentLevelThreshold = (level - 1) * (level - 1) * 100;
  const nextLevelThreshold = level * level * 100;
  const pointsInLevel = totalPoints - currentLevelThreshold;
  const pointsForLevel = nextLevelThreshold - currentLevelThreshold;
  const percent =
    pointsForLevel > 0
      ? Math.min(100, Math.round((pointsInLevel / pointsForLevel) * 100))
      : 100;

  const radius = (size / 2) - 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percent / 100);

  return (
    <div
      className={cn('relative', className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`레벨 ${level}, 다음 레벨까지 ${nextLevelRemaining}포인트`}
    >
      <svg
        className="-rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="6"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={`${strokeDashoffset}`}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          LV
        </span>
        <span className="text-2xl font-bold text-foreground leading-none">
          {level}
        </span>
        <span className="text-[10px] text-muted-foreground mt-0.5">
          {totalPoints.toLocaleString()}pt
        </span>
      </div>
    </div>
  );
}

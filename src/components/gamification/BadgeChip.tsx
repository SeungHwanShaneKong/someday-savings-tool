/**
 * [CL-GAMIFY-INT-20260418-222329] 단일 뱃지 카드
 * - Rarity 3등급별 border/glow 차등
 * - earned=true: 컬러 풀, earned=false: 회색톤 (미획득)
 * - tooltip으로 description + points_reward 표시
 */
import { cn } from '@/lib/utils';
import type { BadgeDefinition, BadgeRarity } from '@/lib/gamification/types';

interface BadgeChipProps {
  badge: BadgeDefinition;
  earned?: boolean;
  earnedAt?: string; // ISO
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const RARITY_STYLES: Record<BadgeRarity, { base: string; glow: string }> = {
  common: {
    base: 'border-border bg-muted/30',
    glow: '',
  },
  rare: {
    base: 'border-blue-400/60 bg-blue-500/10',
    glow: 'shadow-[0_0_12px_hsl(var(--primary)/0.35)]',
  },
  legendary: {
    base: 'border-amber-400/70 bg-amber-500/10',
    glow: 'shadow-[0_0_18px_hsl(45_95%_55%/0.45)] animate-glow-pulse',
  },
};

const SIZE_STYLES = {
  sm: { wrap: 'w-16 h-20 p-2', emoji: 'text-2xl', name: 'text-[10px]' },
  md: { wrap: 'w-24 h-28 p-3', emoji: 'text-4xl', name: 'text-xs' },
  lg: { wrap: 'w-32 h-36 p-4', emoji: 'text-5xl', name: 'text-sm' },
};

export function BadgeChip({
  badge,
  earned = false,
  earnedAt,
  size = 'md',
  onClick,
}: BadgeChipProps) {
  const rarity = RARITY_STYLES[badge.rarity];
  const sz = SIZE_STYLES[size];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'flex flex-col items-center justify-between rounded-xl border-2',
        'transition-all duration-200',
        sz.wrap,
        earned
          ? cn(rarity.base, rarity.glow, onClick && 'hover:scale-105')
          : 'border-dashed border-border/40 bg-muted/10 grayscale opacity-50',
        onClick && 'cursor-pointer',
      )}
      aria-label={`${badge.name_ko}${earned ? ' (획득함)' : ' (미획득)'} — ${badge.description}`}
      title={
        earned
          ? `${badge.name_ko}\n${badge.description}\n+${badge.points_reward}pt${earnedAt ? `\n획득: ${new Date(earnedAt).toLocaleDateString('ko-KR')}` : ''}`
          : `${badge.name_ko}\n${badge.description}\n조건 충족 시 잠금 해제`
      }
    >
      <div className={cn(sz.emoji, !earned && 'opacity-60')} aria-hidden>
        {earned ? badge.icon_emoji : '🔒'}
      </div>
      <div
        className={cn(
          sz.name,
          'font-semibold leading-tight mt-1 line-clamp-2 text-center',
          earned ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {badge.name_ko}
      </div>
      {earned && badge.rarity !== 'common' && (
        <div
          className={cn(
            'text-[9px] uppercase tracking-wider mt-1',
            badge.rarity === 'legendary' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400',
          )}
          aria-hidden
        >
          {badge.rarity}
        </div>
      )}
    </button>
  );
}

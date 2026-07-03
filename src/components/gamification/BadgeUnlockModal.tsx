/**
 * [CL-GAMIFY-INT-20260418-222329] 뱃지 획득 축하 모달
 * - PraiseModal 디자인 DNA 계승 + rarity별 particle burst
 * - legendary는 금색 glow + animate-wc-winner-pulse
 * - 다수 뱃지 동시 unlock 시 useBadgeUnlock 훅이 큐 관리
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { BadgeDefinition } from '@/lib/gamification/types';
import { CelebrationBurst } from '@/components/ui/celebration-burst'; // [CL-ANIM-UPGRADE-20260621-150000]

interface BadgeUnlockModalProps {
  open: boolean;
  badge: BadgeDefinition | null;
  pointsGained: number;
  onClose: () => void;
  /**
   * [CL-TOP20-P4-GAMIFY-20260703-040000] 생애 첫 배지 풀스크린 축하 변형.
   * true 면 뷰포트 전체 다중 파티클(총 ≤40)·확대 히어로. 기본 false = 기존 모달 완전 불변.
   * (pendingUnlock.is_first_badge 를 연결)
   */
  fullscreen?: boolean;
}

const RARITY_HERO = {
  common: {
    glow: 'bg-muted/40',
    border: 'border-border',
    headline: '뱃지 획득!',
  },
  rare: {
    glow: 'bg-blue-500/20',
    border: 'border-blue-400/60',
    headline: '🌟 레어 뱃지 획득!',
  },
  legendary: {
    glow: 'bg-amber-500/25',
    border: 'border-amber-400/70',
    headline: '👑 전설 뱃지 획득!',
  },
} as const;

// [CL-TOP20-P4-GAMIFY-20260703-040000] 풀스크린 위성 버스트 배치 (뷰포트 3지점, 각 7개)
// 파티클 예산: 중앙(≤18) + 위성 3×7=21 → 총 ≤39 (상한 40 준수).
// reduced-motion 이면 CelebrationBurst 자체가 null 렌더 → 자동 정적.
const FULLSCREEN_SATELLITES = [
  { key: 'tl', className: 'left-[22%] top-[24%]' },
  { key: 'tr', className: 'right-[22%] top-[30%]' },
  { key: 'bc', className: 'left-1/2 bottom-[22%]' },
] as const;
const SATELLITE_PARTICLES = 7;
const FIRST_BADGE_COLORS = [
  'bg-wedding-gold',
  'bg-amber-400',
  'bg-pink-400',
  'bg-primary',
];

export function BadgeUnlockModal({
  open,
  badge,
  pointsGained,
  onClose,
  fullscreen = false,
}: BadgeUnlockModalProps) {
  if (!badge) return null;
  const rarity = RARITY_HERO[badge.rarity];

  // [CL-ANIM-UPGRADE-20260621-150000] 레어리티별 축하 파티클 강도/색
  const isLegendary = badge.rarity === 'legendary';
  const burstColors = isLegendary
    ? ['bg-amber-400', 'bg-yellow-300', 'bg-amber-500', 'bg-orange-300']
    : undefined;
  const burstCount = isLegendary ? 18 : badge.rarity === 'rare' ? 14 : 10;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={cn(
          fullscreen
            ? // [CL-TOP20-P4-GAMIFY-20260703-040000] 풀스크린 변형 — 첫 배지 전용
              'h-[100dvh] max-h-[100dvh] w-screen max-w-none sm:max-w-none rounded-none sm:rounded-none border-0 flex flex-col items-center justify-center overflow-hidden text-center'
            : 'max-w-sm text-center sm:max-w-md',
        )}
      >
        {/* [CL-TOP20-P4-GAMIFY-20260703-040000] 첫 배지 풀스크린: 뷰포트 위성 파티클(장식) */}
        {fullscreen && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            {FULLSCREEN_SATELLITES.map((s) => (
              <div key={s.key} className={cn('absolute', s.className)}>
                <CelebrationBurst
                  key={`${badge.id}-${s.key}`}
                  active={open}
                  count={SATELLITE_PARTICLES}
                  radius={110}
                  colors={FIRST_BADGE_COLORS}
                />
              </div>
            ))}
          </div>
        )}
        <DialogHeader className="items-center space-y-4 pt-4">
          <div className="relative">
            {/* [CL-ANIM-UPGRADE-20260621-150000] 언락 순간 파티클 분사 (배지별 재분사: key) */}
            <CelebrationBurst
              key={badge.id}
              active={open}
              count={burstCount}
              radius={isLegendary ? 84 : 68}
              colors={burstColors}
            />
            <div
              className={cn(
                'absolute inset-0 rounded-full blur-3xl',
                rarity.glow,
                badge.rarity === 'legendary' && 'animate-pulse',
              )}
              aria-hidden
            />
            <div
              className={cn(
                'relative flex items-center justify-center rounded-full border-4 bg-background',
                fullscreen ? 'w-36 h-36' : 'w-28 h-28',
                fullscreen && 'border-wedding-gold',
                !fullscreen && rarity.border,
                'animate-wc-winner-pulse motion-reduce:animate-none',
              )}
            >
              <span className={fullscreen ? 'text-7xl' : 'text-6xl'} aria-hidden>
                {badge.icon_emoji}
              </span>
            </div>
          </div>

          <DialogTitle className={fullscreen ? 'text-2xl' : 'text-xl'}>
            {fullscreen ? '🎉 첫 번째 뱃지 획득!' : rarity.headline}
          </DialogTitle>
          {fullscreen && (
            <p className="text-sm text-muted-foreground -mt-2">
              웨딩 준비 여정의 시작을 축하해요
            </p>
          )}

          <div className="space-y-1">
            <div className="text-2xl font-bold">{badge.name_ko}</div>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              {badge.description}
            </DialogDescription>
          </div>

          {pointsGained > 0 && (
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-semibold text-sm animate-insight-check-pop">
              <span aria-hidden>✨</span>
              <span>+{pointsGained}pt 획득</span>
            </div>
          )}
        </DialogHeader>
        <Button onClick={onClose} className={cn('mt-4', fullscreen ? 'w-full max-w-xs' : 'w-full')}>
          확인
        </Button>
      </DialogContent>
    </Dialog>
  );
}

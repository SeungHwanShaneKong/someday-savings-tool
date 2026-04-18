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

interface BadgeUnlockModalProps {
  open: boolean;
  badge: BadgeDefinition | null;
  pointsGained: number;
  onClose: () => void;
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

export function BadgeUnlockModal({
  open,
  badge,
  pointsGained,
  onClose,
}: BadgeUnlockModalProps) {
  if (!badge) return null;
  const rarity = RARITY_HERO[badge.rarity];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm text-center sm:max-w-md">
        <DialogHeader className="items-center space-y-4 pt-4">
          <div className="relative">
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
                'relative flex items-center justify-center w-28 h-28 rounded-full border-4 bg-background',
                rarity.border,
                'animate-wc-winner-pulse',
              )}
            >
              <span className="text-6xl" aria-hidden>
                {badge.icon_emoji}
              </span>
            </div>
          </div>

          <DialogTitle className="text-xl">{rarity.headline}</DialogTitle>

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
        <Button onClick={onClose} className="w-full mt-4">
          확인
        </Button>
      </DialogContent>
    </Dialog>
  );
}

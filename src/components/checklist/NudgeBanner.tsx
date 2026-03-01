import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, X } from 'lucide-react';
import { getRandomNoDdayNudge, getRandomIncompleteNudge } from '@/lib/checklist-nudges';

interface NudgeBannerProps {
  type: 'no-dday' | 'incomplete';
  onAction?: () => void;
  actionLabel?: string;
}

export function NudgeBanner({ type, onAction, actionLabel }: NudgeBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [nudge] = useState(() =>
    type === 'no-dday' ? getRandomNoDdayNudge() : getRandomIncompleteNudge()
  );

  if (dismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-primary/10 via-blue-50 to-primary/5 rounded-2xl p-4 border border-primary/20">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground rounded-full"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <span className="text-2xl flex-shrink-0">{nudge.emoji}</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground leading-snug">
            {nudge.message}
          </p>
          {onAction && actionLabel && (
            <Button
              size="sm"
              variant="default"
              className="mt-2.5 h-8 text-xs"
              onClick={onAction}
            >
              <Calendar className="w-3.5 h-3.5 mr-1" />
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

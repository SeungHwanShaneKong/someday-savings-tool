import { formatKoreanWon } from '@/lib/budget-categories';
import { cn } from '@/lib/utils';

interface FloatingTotalBarProps {
  total: number;
  className?: string;
}

export function FloatingTotalBar({ total, className }: FloatingTotalBarProps) {
  return (
    <div 
      className={cn(
        'fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-toss-lg animate-float-up z-50',
        className
      )}
    >
      <div className="max-w-lg mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <span className="text-caption text-muted-foreground">총 예상 비용</span>
          <span className="text-heading text-primary animate-number">
            {formatKoreanWon(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

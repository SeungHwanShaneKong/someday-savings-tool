import { Info } from 'lucide-react';
import { formatKoreanWon } from '@/lib/budget-categories';
import { getAverageCost, SOURCE_TEXT } from '@/lib/average-costs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface AverageCostTooltipProps {
  categoryId: string;
  subCategoryId: string;
  className?: string;
}

export function AverageCostTooltip({ 
  categoryId, 
  subCategoryId,
  className 
}: AverageCostTooltipProps) {
  const isMobile = useIsMobile();
  const averageCost = getAverageCost(categoryId, subCategoryId);

  if (!averageCost) return null;

  const content = (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="text-xs text-muted-foreground">평균 비용</span>
        <span className="font-semibold text-primary">
          {averageCost.amount === 0 ? '무료' : formatKoreanWon(averageCost.amount)}
        </span>
      </div>
      {averageCost.note && (
        <p className="text-xs text-muted-foreground">
          ({averageCost.note})
        </p>
      )}
      <p className="text-[10px] text-muted-foreground/70 pt-1 border-t border-border">
        {SOURCE_TEXT}
      </p>
    </div>
  );

  // Mobile: Use Popover for tap-to-dismiss behavior
  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button 
            className={cn(
              "inline-flex items-center justify-center",
              "w-6 h-6 rounded-full",
              "bg-primary/10 hover:bg-primary/20",
              "text-primary hover:text-primary",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
              "transition-all duration-150 touch-manipulation",
              "ml-1",
              className
            )}
            aria-label={`평균 비용 정보: ${averageCost.amount === 0 ? '무료' : formatKoreanWon(averageCost.amount)}${averageCost.note ? `, ${averageCost.note}` : ''}`}
          >
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto max-w-[220px] p-3 z-50" 
          align="start"
          side="top"
          sideOffset={8}
          collisionPadding={16}
        >
          {content}
        </PopoverContent>
      </Popover>
    );
  }

  // Desktop: Use Tooltip for hover behavior
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button 
            className={cn(
              "inline-flex items-center justify-center",
              "w-5 h-5 rounded-full",
              "bg-primary/10 hover:bg-primary/20",
              "text-primary hover:text-primary",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
              "transition-all duration-150",
              "ml-1",
              className
            )}
            aria-label={`평균 비용 정보: ${averageCost.amount === 0 ? '무료' : formatKoreanWon(averageCost.amount)}${averageCost.note ? `, ${averageCost.note}` : ''}`}
          >
            <Info className="h-3 w-3" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          align="start"
          sideOffset={8}
          collisionPadding={16}
          className="z-50"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

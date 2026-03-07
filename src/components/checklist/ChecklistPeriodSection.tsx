import { useState, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChecklistItem } from './ChecklistItem';
import {
  PERIOD_LABELS,
  PERIOD_EMOJI,
  type ChecklistPeriod,
} from '@/lib/checklist-templates';
import { getProgressMessage } from '@/lib/checklist-nudges';
import type { ChecklistItem as ChecklistItemType } from '@/hooks/useChecklist';

interface ChecklistPeriodSectionProps {
  period: ChecklistPeriod;
  items: ChecklistItemType[];
  isActive: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onBudgetLink?: (categoryLink: string, subCategoryLink: string) => void;
}

// [FORWARDREF-FIX-20260307-170945] Radix Collapsible ref 경고 수정
export const ChecklistPeriodSection = forwardRef<HTMLDivElement, ChecklistPeriodSectionProps>(function ChecklistPeriodSection({
  period,
  items,
  isActive,
  onToggle,
  onDelete,
  onUpdateNotes,
  onBudgetLink,
}, ref) {
  const [isOpen, setIsOpen] = useState(isActive);
  const completed = items.filter((i) => i.is_completed).length;
  const percentage =
    items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
  const allDone = percentage === 100;
  const hasProgress = completed > 0 && !allDone;

  // Visual differentiation based on period status
  const sectionStyle = cn(
    'rounded-2xl border bg-card overflow-hidden transition-all duration-200',
    allDone && 'border-l-4 border-l-green-500 border-green-200 bg-green-50/30',
    isActive && !allDone && 'border-l-4 border-l-primary ring-1 ring-primary/20 shadow-toss-sm',
    hasProgress && !isActive && 'border-l-4 border-l-amber-500 border-border',
    !allDone && !isActive && !hasProgress && 'border-l-4 border-l-transparent border-border opacity-80'
  );

  // Progress bar color based on status
  const progressIndicatorClass = cn(
    allDone && 'bg-green-500',
    isActive && !allDone && 'bg-primary',
    hasProgress && !isActive && 'bg-amber-500',
    !allDone && !isActive && !hasProgress && 'bg-muted-foreground/30'
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={sectionStyle}>
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button
            className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
            aria-expanded={isOpen}
            aria-label={`${PERIOD_LABELS[period]} 체크리스트, ${items.length}개 항목 중 ${completed}개 완료`}
          >
            <span className="text-xl" aria-hidden="true">
              {PERIOD_EMOJI[period]}
            </span>

            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {PERIOD_LABELS[period]}
                </h3>
                {isActive && (
                  <span className="text-[11px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    현재
                  </span>
                )}
                {allDone && (
                  <span className="text-[11px] font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    완료
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Progress
                  value={percentage}
                  className="flex-1 h-1.5"
                  indicatorClassName={progressIndicatorClass}
                />
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {completed}/{items.length}
                </span>
              </div>
            </div>

            <ChevronDown
              className={cn(
                'w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </button>
        </CollapsibleTrigger>

        {/* Items — animated expand/collapse */}
        <CollapsibleContent className="collapsible-content">
          <div className="px-4 pb-4 space-y-2">
            {/* Progress message */}
            <p className="text-xs text-muted-foreground px-1 pb-1">
              {getProgressMessage(completed, items.length)}
            </p>

            {items
              .sort((a, b) => {
                // Incomplete first, then by sort_order
                if (a.is_completed !== b.is_completed)
                  return a.is_completed ? 1 : -1;
                return a.sort_order - b.sort_order;
              })
              .map((item) => (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onUpdateNotes={onUpdateNotes}
                  onBudgetLink={onBudgetLink}
                />
              ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
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

export function ChecklistPeriodSection({
  period,
  items,
  isActive,
  onToggle,
  onDelete,
  onUpdateNotes,
  onBudgetLink,
}: ChecklistPeriodSectionProps) {
  const [isOpen, setIsOpen] = useState(isActive);
  const completed = items.filter((i) => i.is_completed).length;
  const percentage =
    items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card overflow-hidden transition-all',
        isActive && 'ring-2 ring-primary/20 shadow-toss-sm'
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
      >
        <span className="text-xl">
          {PERIOD_EMOJI[period]}
        </span>

        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {PERIOD_LABELS[period]}
            </h3>
            {isActive && (
              <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                현재
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={percentage} className="flex-1 h-1.5" />
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {completed}/{items.length}
            </span>
          </div>
        </div>

        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {/* Items */}
      {isOpen && (
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
      )}
    </div>
  );
}

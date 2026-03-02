import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Trash2, ChevronDown, ChevronUp, LinkIcon } from 'lucide-react';
import { getUrgencyLevel } from '@/lib/checklist-nudges';
import { CHECKLIST_TEMPLATES } from '@/lib/checklist-templates';
import type { ChecklistItem as ChecklistItemType } from '@/hooks/useChecklist';

interface ChecklistItemProps {
  item: ChecklistItemType;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onBudgetLink?: (categoryLink: string, subCategoryLink: string) => void;
}

const URGENCY_STYLES = {
  overdue: 'border-l-4 border-l-destructive bg-destructive/5',
  urgent: 'border-l-4 border-l-orange-500 bg-orange-50/50',
  soon: 'border-l-4 border-l-yellow-500 bg-yellow-50/30',
  normal: 'border-l-4 border-l-transparent',
  done: 'border-l-4 border-l-primary/30 bg-primary/5',
};

const URGENCY_LABELS: Record<string, string> = {
  overdue: '기한 초과',
  urgent: '이번 주',
  soon: '이번 달',
};

export function ChecklistItem({
  item,
  onToggle,
  onDelete,
  onUpdateNotes,
  onBudgetLink,
}: ChecklistItemProps) {
  const [expanded, setExpanded] = useState(false);
  const urgency = getUrgencyLevel(item.due_date, item.is_completed);

  // Find nudge message from template
  const template = CHECKLIST_TEMPLATES.find(
    (t) => t.title === item.title && t.period === item.period
  );

  return (
    <div
      className={cn(
        'rounded-xl bg-card border border-border transition-all duration-200',
        URGENCY_STYLES[urgency],
        item.is_completed && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3 p-3.5">
        {/* Checkbox */}
        <Checkbox
          checked={item.is_completed}
          onCheckedChange={() => onToggle(item.id)}
          className={cn(
            'mt-0.5 h-5 w-5 rounded-full transition-all',
            item.is_completed && 'bg-primary border-primary'
          )}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span
              className={cn(
                'text-sm font-medium leading-tight',
                item.is_completed && 'line-through text-muted-foreground'
              )}
            >
              {item.title}
            </span>

            {/* Urgency badge */}
            {!item.is_completed && URGENCY_LABELS[urgency] && (
              <span
                className={cn(
                  'text-[11px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0',
                  urgency === 'overdue' && 'bg-destructive/10 text-destructive',
                  urgency === 'urgent' && 'bg-orange-100 text-orange-700',
                  urgency === 'soon' && 'bg-yellow-100 text-yellow-700'
                )}
              >
                {URGENCY_LABELS[urgency]}
              </span>
            )}
          </div>

          {/* Due date */}
          {item.due_date && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(item.due_date).toLocaleDateString('ko-KR', {
                month: 'long',
                day: 'numeric',
              })}{' '}
              까지
            </p>
          )}

          {/* Nudge message */}
          {!item.is_completed && template?.nudgeMessage && (
            <p className="text-xs text-primary/80 mt-1 italic">
              💡 {template.nudgeMessage}
            </p>
          )}
        </div>

        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="px-3.5 pb-3.5 pt-0 space-y-2.5 border-t border-border/50 mt-0">
          <div className="pt-2.5">
            {/* Notes */}
            <textarea
              value={item.notes || ''}
              onChange={(e) => onUpdateNotes(item.id, e.target.value)}
              placeholder="메모를 추가하세요..."
              className="w-full text-sm bg-muted/50 rounded-lg p-2.5 border-0 resize-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/60"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Budget link button */}
            {item.category_link && item.sub_category_link && onBudgetLink && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() =>
                  onBudgetLink(item.category_link!, item.sub_category_link!)
                }
              >
                <LinkIcon className="w-3 h-3 mr-1" />
                예산 연결
              </Button>
            )}

            {/* Delete (only custom items) */}
            {item.is_custom && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-destructive hover:text-destructive"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                삭제
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

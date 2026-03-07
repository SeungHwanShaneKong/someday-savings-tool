import { useState, useCallback, useRef, useEffect, forwardRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Trash2, ChevronDown, ChevronUp, LinkIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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

// [FORWARDREF-FIX-20260307-170945] Radix Collapsible ref 경고 수정
export const ChecklistItem = forwardRef<HTMLDivElement, ChecklistItemProps>(function ChecklistItem({
  item,
  onToggle,
  onDelete,
  onUpdateNotes,
  onBudgetLink,
}, ref) {
  const [expanded, setExpanded] = useState(false);
  const [checkPop, setCheckPop] = useState(false);
  const [localNotes, setLocalNotes] = useState(item.notes || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urgency = getUrgencyLevel(item.due_date, item.is_completed);

  // Sync local notes when item.notes changes externally
  useEffect(() => {
    setLocalNotes(item.notes || '');
  }, [item.notes]);

  // Debounced notes update
  const handleNotesChange = useCallback(
    (value: string) => {
      setLocalNotes(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onUpdateNotes(item.id, value);
      }, 300);
    },
    [item.id, onUpdateNotes]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Check-pop animation on toggle
  const handleToggle = useCallback(() => {
    if (!item.is_completed) {
      setCheckPop(true);
      setTimeout(() => setCheckPop(false), 300);
    }
    onToggle(item.id);
  }, [item.id, item.is_completed, onToggle]);

  // Find nudge message from template
  const template = CHECKLIST_TEMPLATES.find(
    (t) => t.title === item.title && t.period === item.period
  );

  return (
    <div
      className={cn(
        'rounded-xl bg-card border border-border transition-all duration-200 hover:shadow-toss',
        URGENCY_STYLES[urgency],
        item.is_completed && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3 p-3.5">
        {/* Checkbox with check-pop animation */}
        <div className={cn(checkPop && 'animate-check-pop')}>
          <Checkbox
            checked={item.is_completed}
            onCheckedChange={handleToggle}
            className={cn(
              'mt-0.5 h-5 w-5 rounded-full transition-all',
              item.is_completed && 'bg-primary border-primary'
            )}
          />
        </div>

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

            {/* Urgency badge — WCAG contrast fix */}
            {!item.is_completed && URGENCY_LABELS[urgency] && (
              <span
                className={cn(
                  'text-[11px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0',
                  urgency === 'overdue' && 'bg-destructive/10 text-destructive',
                  urgency === 'urgent' && 'bg-orange-100 text-orange-800',
                  urgency === 'soon' && 'bg-yellow-100 text-yellow-800'
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
          aria-label={expanded ? '접기' : '펼치기'}
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
            {/* Notes — debounced */}
            <textarea
              value={localNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
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

            {/* Delete with confirmation (only custom items) */}
            {item.is_custom && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    삭제
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>항목을 삭제하시겠어요?</AlertDialogTitle>
                    <AlertDialogDescription>
                      "{item.title}" 항목이 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(item.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      삭제
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

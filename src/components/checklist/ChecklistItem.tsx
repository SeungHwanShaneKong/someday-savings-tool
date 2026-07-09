// [CL-AI-HIERARCHY-20260308-163000]
// [CL-TREE-REDESIGN-20260403] leaf 노드 스타일 — border-l-4 제거, 트리 커넥터 호환
import { useState, useCallback, useRef, useEffect } from 'react';
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
  // [CL-CHECKUX-20260709-232512] Promise/boolean 반환 허용 — "저장됨 ✓" 인디케이터가
  //   저장 완료(및 실패)를 실제로 알 수 있도록 확장(기존 void 콜백도 그대로 호환).
  onUpdateNotes: (id: string, notes: string) => void | boolean | Promise<void | boolean>;
  onBudgetLink?: (categoryLink: string, subCategoryLink: string) => void;
}

// [CL-TREE-REDESIGN-20260403] border-l-4 제거 → 배경색만 사용 (트리 커넥터와 충돌 방지)
const URGENCY_STYLES = {
  overdue: 'bg-destructive/5 ring-1 ring-destructive/20',
  urgent: 'bg-orange-50/50 ring-1 ring-orange-200/50',
  soon: 'bg-yellow-50/30 ring-1 ring-yellow-200/50',
  normal: '',
  done: 'bg-primary/5',
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
  const [checkPop, setCheckPop] = useState(false);
  const [localNotes, setLocalNotes] = useState(item.notes || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // [CL-CHECKUX-20260709-232512] 메모 저장 인디케이터 — idle → (입력) saving → (저장 완료) saved → 1.5s → idle
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSeqRef = useRef(0); // 최신 입력만 반영(이전 저장의 늦은 resolve 무시)
  const urgency = getUrgencyLevel(item.due_date, item.is_completed);

  // Sync local notes when item.notes changes externally
  useEffect(() => {
    setLocalNotes(item.notes || '');
  }, [item.notes]);

  // Debounced notes update + 저장 상태 추적
  const handleNotesChange = useCallback(
    (value: string) => {
      setLocalNotes(value);
      setSaveState('saving');
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
        savedTimerRef.current = null;
      }
      debounceRef.current = setTimeout(() => {
        const seq = ++saveSeqRef.current;
        void (async () => {
          try {
            const ok = await Promise.resolve(onUpdateNotes(item.id, value));
            if (seq !== saveSeqRef.current) return; // 이후 입력이 있었다면 이 결과는 무시
            if (ok === false) {
              // 실패는 hook 이 destructive 토스트로 안내 — 인디케이터는 성공 오표시 금지
              setSaveState('idle');
              return;
            }
            setSaveState('saved');
            savedTimerRef.current = setTimeout(() => setSaveState('idle'), 1500);
          } catch {
            if (seq === saveSeqRef.current) setSaveState('idle');
          }
        })();
      }, 300);
    },
    [item.id, onUpdateNotes]
  );

  // Cleanup debounce + saved timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
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
        'rounded-xl sm:rounded-2xl bg-card border border-border transition-all duration-200 hover:shadow-toss',
        URGENCY_STYLES[urgency],
        item.is_completed && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3 p-3.5 sm:p-4">
        {/* Checkbox with check-pop animation */}
        {/* [CL-CHECKUX-20260709-232512] 44px 히트영역 — 시각 크기 h-5 w-5 불변, label(htmlFor→button 은
            labelable) 패딩 확장 + 음수 마진으로 레이아웃 보정(카드 패딩 안으로 히트영역만 확장) */}
        <label
          htmlFor={`chk-${item.id}`}
          data-testid="checklist-checkbox-hit"
          className={cn(
            'min-h-11 min-w-11 -mt-2.5 -mb-1.5 -ml-3 -mr-1.5 flex items-center justify-center cursor-pointer flex-shrink-0',
            checkPop && 'animate-check-pop'
          )}
        >
          <Checkbox
            id={`chk-${item.id}`}
            checked={item.is_completed}
            onCheckedChange={handleToggle}
            aria-label={`${item.title} ${item.is_completed ? '완료 해제' : '완료로 표시'}`}
            className={cn(
              'h-5 w-5 rounded-full transition-all',
              item.is_completed && 'bg-primary border-primary'
            )}
          />
        </label>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* [CL-CHECKUX-20260709-232512] 제목 클릭 = expand — chevron 만이 아니라 제목 전체가 토글 표면.
              due/pill 은 버튼 밖(인터랙티브 중첩 금지 — HTML 유효성/접근성) */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="w-full text-left rounded-md"
          >
            <span className="flex items-start justify-between gap-2">
              <span
                className={cn(
                  // [CL-READ-UX-20260706-211350] min-w-0 break-keep: 긴 제목이 음절 중간 안 깨고 단어 경계로 줄바꿈
                  'text-sm sm:text-base font-medium leading-tight min-w-0 break-keep',
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
            </span>
          </button>

          {/* Due date + 예산 연결 인라인 pill */}
          {(item.due_date || (item.category_link && item.sub_category_link && onBudgetLink)) && (
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {item.due_date && (
                <p className="text-xs text-muted-foreground">
                  {new Date(item.due_date).toLocaleDateString('ko-KR', {
                    month: 'long',
                    day: 'numeric',
                  })}{' '}
                  까지
                </p>
              )}
              {/* [CL-CHECKUX-20260709-232512] 예산연결 — expand 없이도 보이는 컴팩트 pill(패널 버튼도 유지) */}
              {item.category_link && item.sub_category_link && onBudgetLink && (
                <button
                  type="button"
                  onClick={() =>
                    onBudgetLink(item.category_link!, item.sub_category_link!)
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 hover:bg-primary/15 px-2 py-0.5 rounded-full transition-colors"
                >
                  <LinkIcon className="w-3 h-3" aria-hidden="true" />
                  예산 연결
                </button>
              )}
            </div>
          )}

          {/* Nudge message */}
          {!item.is_completed && template?.nudgeMessage && (
            <p className="text-xs text-primary/80 mt-1 italic">
              💡 {template.nudgeMessage}
            </p>
          )}
        </div>

        {/* Expand button */}
        {/* [CL-BTNAUDIT3-20260704 | 터치타깃44] 히트영역만 모바일 44px, 아이콘 w-4 유지 */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="min-h-11 min-w-11 md:min-h-0 md:min-w-0 inline-flex items-center justify-center p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={expanded ? '접기' : '펼치기'}
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-0 space-y-2.5 border-t border-border/50 mt-0">
          <div className="pt-2.5">
            {/* Notes — debounced */}
            <textarea
              value={localNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="메모를 추가하세요..."
              aria-label="메모"
              className="w-full text-sm bg-muted/50 rounded-lg p-2.5 border-0 resize-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/60"
              rows={2}
            />
            {/* [CL-CHECKUX-20260709-232512] 저장 인디케이터 — 자동저장이 실제로 됐는지 보이게 */}
            <div className="flex justify-end min-h-4" aria-live="polite">
              {saveState === 'saving' && (
                <span className="text-[11px] text-muted-foreground">저장 중…</span>
              )}
              {saveState === 'saved' && (
                <span className="text-[11px] text-primary">저장됨 ✓</span>
              )}
            </div>
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
}

// [CL-INSIGHT-CHECK-20260315-160000] dismissing 중간 상태 + collapsing 래퍼
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InsightCard } from './InsightCard';
import { generateBudgetInsights, pickRandomInsights } from '@/lib/budget-optimizer';
import type { ExtendedBudgetItem } from '@/components/BudgetTable';

interface InsightPanelProps {
  items: ExtendedBudgetItem[];
  className?: string;
}

export function InsightPanel({ items, className }: InsightPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());

  // Convert ExtendedBudgetItem to BudgetItem format
  const insights = useMemo(() => {
    const budgetItems = items
      .filter((item) => item.amount > 0)
      .map((item) => ({
        categoryId: item.category,
        subCategoryId: item.sub_category,
        amount: item.amount,
      }));

    // [CL-COEDIT-QA5-20260620] 한 번에 최대 5개만 노출(초과 시 랜덤 선택 → 다양성). items 변경 시에만 재선택.
    return pickRandomInsights(generateBudgetInsights(budgetItems), 5);
  }, [items]);

  const visibleInsights = insights.filter((i) => !dismissed.has(i.id));
  const activeCount = visibleInsights.filter((i) => !dismissing.has(i.id)).length;

  // [CL-QUALITY-TIMER-20260621] 다중 in-flight dismiss 타이머를 추적해 언마운트 시 일괄 정리(고아 setState 방지)
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  useEffect(() => () => { timersRef.current.forEach(clearTimeout); timersRef.current.clear(); }, []);

  const handleDismiss = useCallback((id: string) => {
    // Phase 1: 카드 퇴장 애니메이션 시작
    setDismissing((prev) => new Set([...prev, id]));

    // Phase 2: 애니메이션 완료 후 DOM에서 제거 (타이머 id 추적 → 언마운트 시 취소)
    const tid = setTimeout(() => {
      timersRef.current.delete(tid);
      setDismissed((prev) => new Set([...prev, id]));
      setDismissing((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 650);
    timersRef.current.add(tid);
  }, []);

  if (activeCount === 0 && visibleInsights.length === 0) return null;

  return (
    <div
      className={cn(
        'bg-card rounded-2xl border border-border shadow-toss-sm overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            AI 인사이트
          </span>
          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
            {activeCount}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Content */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-2">
          {visibleInsights.map((insight) => (
            <div
              key={insight.id}
              className={cn(
                'transition-all duration-300',
                dismissing.has(insight.id) && 'insight-card-collapsing'
              )}
            >
              <InsightCard
                insight={insight}
                isDismissing={dismissing.has(insight.id)}
                onDismiss={handleDismiss}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

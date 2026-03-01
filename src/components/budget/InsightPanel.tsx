import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InsightCard } from './InsightCard';
import { generateBudgetInsights, type BudgetInsight } from '@/lib/budget-optimizer';
import type { ExtendedBudgetItem } from '@/components/BudgetTable';

interface InsightPanelProps {
  items: ExtendedBudgetItem[];
  className?: string;
}

export function InsightPanel({ items, className }: InsightPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Convert ExtendedBudgetItem to BudgetItem format
  const insights = useMemo(() => {
    const budgetItems = items
      .filter((item) => item.amount > 0)
      .map((item) => ({
        categoryId: item.category,
        subCategoryId: item.sub_category,
        amount: item.amount,
      }));

    return generateBudgetInsights(budgetItems);
  }, [items]);

  const visibleInsights = insights.filter((i) => !dismissed.has(i.id));

  if (visibleInsights.length === 0) return null;

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
            {visibleInsights.length}
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
            <InsightCard
              key={insight.id}
              insight={insight}
              onDismiss={(id) =>
                setDismissed((prev) => new Set([...prev, id]))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

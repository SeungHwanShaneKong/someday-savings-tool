import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import type { BudgetInsight, InsightType } from '@/lib/budget-optimizer';

interface InsightCardProps {
  insight: BudgetInsight;
  onDismiss?: (id: string) => void;
}

const TYPE_STYLES: Record<InsightType, string> = {
  warning: 'border-l-orange-500 bg-orange-50/60',
  saving: 'border-l-emerald-500 bg-emerald-50/60',
  hidden_cost: 'border-l-red-500 bg-red-50/60',
  praise: 'border-l-blue-500 bg-blue-50/60',
  info: 'border-l-slate-400 bg-slate-50/60',
};

export function InsightCard({ insight, onDismiss }: InsightCardProps) {
  return (
    <div
      className={cn(
        'relative border-l-4 rounded-xl p-3.5 transition-all',
        TYPE_STYLES[insight.type]
      )}
    >
      {onDismiss && (
        <button
          onClick={() => onDismiss(insight.id)}
          className="absolute top-2 right-2 p-1 text-muted-foreground/60 hover:text-muted-foreground rounded-full"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="flex items-start gap-2.5 pr-6">
        <span className="text-lg flex-shrink-0">{insight.emoji}</span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground leading-tight">
            {insight.title}
          </h4>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {insight.description}
          </p>
        </div>
      </div>
    </div>
  );
}

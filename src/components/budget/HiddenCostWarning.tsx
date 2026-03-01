import { getHiddenCostsForItem } from '@/lib/hidden-costs';
import { formatKoreanWon } from '@/lib/budget-categories';
import { cn } from '@/lib/utils';

interface HiddenCostWarningProps {
  categoryId: string;
  subCategoryId: string;
  amount: number;
  className?: string;
}

/**
 * 인라인 숨겨진 비용 경고 — BudgetTable 행 아래에 표시
 */
export function HiddenCostWarning({
  categoryId,
  subCategoryId,
  amount,
  className,
}: HiddenCostWarningProps) {
  if (amount <= 0) return null;

  const hiddenCosts = getHiddenCostsForItem(categoryId, subCategoryId);
  if (hiddenCosts.length === 0) return null;

  return (
    <div className={cn('space-y-1', className)}>
      {hiddenCosts.map((cost) => (
        <div
          key={cost.id}
          className="flex items-start gap-1.5 px-2 py-1 text-[11px] text-orange-700 bg-orange-50/80 rounded-lg"
        >
          <span className="flex-shrink-0">{cost.emoji}</span>
          <span>
            {cost.title} (+{formatKoreanWon(cost.estimatedCost)})
          </span>
        </div>
      ))}
    </div>
  );
}

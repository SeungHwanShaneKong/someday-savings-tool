import { getHiddenCostsForItem } from '@/lib/hidden-costs';
import { formatKoreanWon } from '@/lib/budget-categories';
import { cn } from '@/lib/utils';

interface HiddenCostWarningProps {
  categoryId: string;
  subCategoryId: string;
  amount: number;
  className?: string;
  /** [CL-TOP20-P3-HIDDEN-20260703-030000] 상세 설명 병기(HiddenCostTrigger Popover 용). 기본 false=기존 칩 형태 */
  showDescription?: boolean;
}

/**
 * 인라인 숨겨진 비용 경고 — BudgetTable 행 아래에 표시
 * [CL-TOP20-P3-HIDDEN-20260703-030000] orange→amber 통일(파트너 변경 배지와 동일 계열) + 다크모드 대비 보강
 */
export function HiddenCostWarning({
  categoryId,
  subCategoryId,
  amount,
  className,
  showDescription = false,
}: HiddenCostWarningProps) {
  if (amount <= 0) return null;

  const hiddenCosts = getHiddenCostsForItem(categoryId, subCategoryId);
  if (hiddenCosts.length === 0) return null;

  return (
    <div className={cn('space-y-1', className)}>
      {hiddenCosts.map((cost) => (
        <div
          key={cost.id}
          className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-800 dark:text-amber-200"
        >
          <span className="flex-shrink-0" aria-hidden="true">
            {cost.emoji}
          </span>
          <span className="min-w-0">
            <span className="font-medium">
              {cost.title} (+{formatKoreanWon(cost.estimatedCost)})
            </span>
            {showDescription && (
              <span className="mt-0.5 block text-[10px] leading-relaxed text-muted-foreground">
                {cost.description}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

import { Checkbox } from '@/components/ui/checkbox';
import { formatKoreanWon, getSubCategoryById, getCategoryById } from '@/lib/budget-categories';
import { BudgetItem } from '@/hooks/useBudget';
import { cn } from '@/lib/utils';

interface ChecklistItemProps {
  item: BudgetItem;
  onToggle: () => void;
}

export function ChecklistItem({ item, onToggle }: ChecklistItemProps) {
  const category = getCategoryById(item.category);
  const subCategory = getSubCategoryById(item.category, item.sub_category);

  if (!category || !subCategory || item.amount === 0) return null;

  return (
    <div 
      className={cn(
        'flex items-center gap-4 p-4 bg-card rounded-xl shadow-toss transition-all duration-200',
        item.is_paid && 'opacity-60'
      )}
    >
      <Checkbox
        checked={item.is_paid}
        onCheckedChange={onToggle}
        className="h-6 w-6 rounded-full border-2 data-[state=checked]:bg-success data-[state=checked]:border-success"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">{category.icon}</span>
          <span className={cn(
            'text-body font-medium truncate',
            item.is_paid && 'line-through text-muted-foreground'
          )}>
            {subCategory.name}
          </span>
        </div>
        <span className="text-caption text-muted-foreground">{category.name}</span>
      </div>
      <span className={cn(
        'text-body-lg font-semibold',
        item.is_paid ? 'text-success' : 'text-foreground'
      )}>
        {formatKoreanWon(item.amount)}
      </span>
    </div>
  );
}

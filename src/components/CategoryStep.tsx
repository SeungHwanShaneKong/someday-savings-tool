import { Category } from '@/lib/budget-categories';
import { BudgetInput } from './BudgetInput';
import { BudgetItem } from '@/hooks/useBudget';
import { formatKoreanWon } from '@/lib/budget-categories';
import { cn } from '@/lib/utils';

interface CategoryStepProps {
  category: Category;
  items: BudgetItem[];
  onAmountChange: (subCategoryId: string, amount: number) => void;
  className?: string;
}

export function CategoryStep({ 
  category, 
  items, 
  onAmountChange,
  className 
}: CategoryStepProps) {
  const categoryTotal = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className={cn('page-transition', className)}>
      {/* Header */}
      <div className="text-center mb-8">
        <span className="text-5xl mb-4 block">{category.icon}</span>
        <h1 className="text-heading text-foreground mb-2">{category.name}</h1>
        <p className="text-body text-muted-foreground">{category.description}</p>
      </div>

      {/* Hint */}
      <div className="bg-primary/5 rounded-xl p-4 mb-8 hint-pulse">
        <p className="text-caption text-primary text-center">
          💡 {category.hint}
        </p>
      </div>

      {/* Input fields */}
      <div className="space-y-4">
        {category.subCategories.map((sub, index) => {
          const item = items.find(i => i.sub_category === sub.id);
          return (
            <BudgetInput
              key={sub.id}
              label={sub.name}
              value={item?.amount || 0}
              onChange={(amount) => onAmountChange(sub.id, amount)}
              placeholder={sub.placeholder}
              autoFocus={index === 0}
            />
          );
        })}
      </div>

      {/* Category subtotal */}
      {categoryTotal > 0 && (
        <div className="mt-8 p-4 bg-secondary rounded-xl">
          <div className="flex justify-between items-center">
            <span className="text-caption text-muted-foreground">{category.name} 소계</span>
            <span className="text-subheading text-foreground">{formatKoreanWon(categoryTotal)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

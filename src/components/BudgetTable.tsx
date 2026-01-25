import { useState } from 'react';
import { BUDGET_CATEGORIES, formatKoreanWon } from '@/lib/budget-categories';
import { BudgetItem } from '@/hooks/useBudget';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface BudgetTableProps {
  items: BudgetItem[];
  onAmountChange: (category: string, subCategory: string, amount: number) => void;
  onTogglePaid: (itemId: string) => void;
  onNotesChange: (itemId: string, notes: string) => void;
}

export function BudgetTable({ items, onAmountChange, onTogglePaid, onNotesChange }: BudgetTableProps) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');

  const getItem = (categoryId: string, subCategoryId: string) => {
    return items.find(item => item.category === categoryId && item.sub_category === subCategoryId);
  };

  const getCategoryTotal = (categoryId: string) => {
    return items
      .filter(item => item.category === categoryId)
      .reduce((sum, item) => sum + item.amount, 0);
  };

  const getOverallTotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const handleAmountClick = (categoryId: string, subCategoryId: string, currentAmount: number) => {
    const cellKey = `${categoryId}-${subCategoryId}`;
    setEditingCell(cellKey);
    setTempValue(currentAmount > 0 ? currentAmount.toString() : '');
  };

  const handleAmountBlur = (categoryId: string, subCategoryId: string) => {
    const amount = parseInt(tempValue.replace(/[^0-9]/g, '')) || 0;
    onAmountChange(categoryId, subCategoryId, amount);
    setEditingCell(null);
    setTempValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, categoryId: string, subCategoryId: string) => {
    if (e.key === 'Enter') {
      handleAmountBlur(categoryId, subCategoryId);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setTempValue('');
    }
  };

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-primary/10 border-b-2 border-primary/20">
            <TableHead className="font-bold text-foreground w-24">구분</TableHead>
            <TableHead className="font-bold text-foreground w-16 text-center">완료</TableHead>
            <TableHead className="font-bold text-foreground w-40">항목</TableHead>
            <TableHead className="font-bold text-foreground text-right w-36">비용(₩)</TableHead>
            <TableHead className="font-bold text-foreground w-48">메모</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {BUDGET_CATEGORIES.map((category) => (
            <>
              {category.subCategories.map((subCat, subIndex) => {
                const item = getItem(category.id, subCat.id);
                const cellKey = `${category.id}-${subCat.id}`;
                const isEditing = editingCell === cellKey;

                return (
                  <TableRow 
                    key={cellKey}
                    className={cn(
                      "hover:bg-muted/50 transition-colors",
                      subIndex === 0 && "border-t-2 border-primary/10"
                    )}
                  >
                    {subIndex === 0 && (
                      <TableCell 
                        rowSpan={category.subCategories.length}
                        className="font-semibold bg-secondary/50 align-top pt-4"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{category.icon}</span>
                          <span className="text-sm">{category.name}</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      <Checkbox
                        checked={item?.is_paid || false}
                        onCheckedChange={() => item && onTogglePaid(item.id)}
                        className="data-[state=checked]:bg-success data-[state=checked]:border-success"
                      />
                    </TableCell>
                    <TableCell className="text-sm">{subCat.name}</TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <Input
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleAmountBlur(category.id, subCat.id)}
                          onKeyDown={(e) => handleKeyDown(e, category.id, subCat.id)}
                          className="h-8 text-right text-sm"
                          autoFocus
                          placeholder="0"
                        />
                      ) : (
                        <button
                          onClick={() => handleAmountClick(category.id, subCat.id, item?.amount || 0)}
                          className={cn(
                            "w-full text-right px-2 py-1 rounded hover:bg-muted transition-colors text-sm",
                            item?.amount ? "text-foreground font-medium" : "text-muted-foreground"
                          )}
                        >
                          {item?.amount ? `₩${item.amount.toLocaleString()}` : '-'}
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item?.notes || ''}
                        onChange={(e) => item && onNotesChange(item.id, e.target.value)}
                        className="h-8 text-sm border-0 bg-transparent focus:bg-background"
                        placeholder="메모 입력..."
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Category subtotal row */}
              <TableRow className="bg-warning/10 border-b-2 border-warning/30">
                <TableCell colSpan={3} className="font-semibold text-right text-sm">
                  {category.name} 총 비용
                </TableCell>
                <TableCell className="text-right font-bold text-primary">
                  ₩{getCategoryTotal(category.id).toLocaleString()}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </>
          ))}
          {/* Overall total row */}
          <TableRow className="bg-primary/20 border-t-4 border-primary">
            <TableCell colSpan={3} className="font-bold text-right text-base">
              총계
            </TableCell>
            <TableCell className="text-right font-bold text-lg text-primary">
              ₩{getOverallTotal().toLocaleString()}
            </TableCell>
            <TableCell>
              <span className="text-sm text-muted-foreground">
                {formatKoreanWon(getOverallTotal())}
              </span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatKoreanWon } from '@/lib/budget-categories';
import { getAverageCost } from '@/lib/average-costs';
import { getSubCategoryById } from '@/lib/budget-categories';

interface BudgetLinkPromptProps {
  open: boolean;
  onClose: () => void;
  categoryLink: string;
  subCategoryLink: string;
  onSaveAmount: (
    categoryId: string,
    subCategoryId: string,
    amount: number
  ) => void;
}

export function BudgetLinkPrompt({
  open,
  onClose,
  categoryLink,
  subCategoryLink,
  onSaveAmount,
}: BudgetLinkPromptProps) {
  const [amount, setAmount] = useState('');

  const subCategory = getSubCategoryById(categoryLink, subCategoryLink);
  const averageCost = getAverageCost(categoryLink, subCategoryLink);

  const handleSave = () => {
    const numericAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(numericAmount) && numericAmount > 0) {
      onSaveAmount(categoryLink, subCategoryLink, numericAmount);
      setAmount('');
      onClose();
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="text-lg">
            💰 {subCategory?.name || '예산'} 금액 입력
          </SheetTitle>
          <SheetDescription>
            체크리스트 완료와 함께 예산에 금액을 반영할 수 있어요
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {averageCost && (
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">평균 비용 참고</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {formatKoreanWon(averageCost.amount)}
                {averageCost.note && (
                  <span className="font-normal text-muted-foreground ml-1">
                    ({averageCost.note})
                  </span>
                )}
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground">
              실제 금액 (원)
            </label>
            <Input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                if (raw) {
                  setAmount(Number(raw).toLocaleString());
                } else {
                  setAmount('');
                }
              }}
              placeholder="금액을 입력하세요"
              className="mt-1.5 h-12 text-lg"
            />
            {amount && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatKoreanWon(parseInt(amount.replace(/[^0-9]/g, ''), 10) || 0)}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 h-11">
              건너뛰기
            </Button>
            <Button onClick={handleSave} className="flex-1 h-11" disabled={!amount}>
              예산에 반영
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatKoreanWon } from '@/lib/budget-categories';
import { Users, Calculator, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MealCostCalculatorProps {
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  onSave: (unitPrice: number, quantity: number) => void;
  onClose?: () => void;
  className?: string;
  showInline?: boolean;
}

export function MealCostCalculator({
  unitPrice,
  quantity,
  totalAmount,
  onSave,
  onClose,
  className,
  showInline = false,
}: MealCostCalculatorProps) {
  const [tempUnitPrice, setTempUnitPrice] = useState<string>(unitPrice > 0 ? unitPrice.toString() : '');
  const [tempQuantity, setTempQuantity] = useState<string>(quantity > 0 ? quantity.toString() : '');

  useEffect(() => {
    setTempUnitPrice(unitPrice > 0 ? unitPrice.toString() : '');
    setTempQuantity(quantity > 0 ? quantity.toString() : '');
  }, [unitPrice, quantity]);

  const parseNumericInput = (value: string): string => {
    return value.replace(/[^0-9]/g, '');
  };

  const calculatedTotal = (parseInt(tempUnitPrice) || 0) * (parseInt(tempQuantity) || 0);

  const handleSave = () => {
    const parsedUnitPrice = parseInt(tempUnitPrice) || 0;
    const parsedQuantity = parseInt(tempQuantity) || 0;
    onSave(parsedUnitPrice, parsedQuantity);
    onClose?.();
  };

  // Inline mode: directly editable within the table row
  if (showInline) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {/* Two input fields side by side */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground block mb-0.5">하객 수</label>
            <div className="relative">
              <Input
                type="text"
                inputMode="numeric"
                value={tempQuantity}
                onChange={(e) => setTempQuantity(parseNumericInput(e.target.value))}
                placeholder="300"
                className="h-8 text-sm pr-6"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">명</span>
            </div>
          </div>
          <span className="text-muted-foreground mt-4">×</span>
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground block mb-0.5">1인당 식대</label>
            <div className="relative">
              <Input
                type="text"
                inputMode="numeric"
                value={tempUnitPrice ? parseInt(tempUnitPrice).toLocaleString() : ''}
                onChange={(e) => setTempUnitPrice(parseNumericInput(e.target.value))}
                placeholder="65,000"
                className="h-8 text-sm pr-6"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">원</span>
            </div>
          </div>
        </div>
        
        {/* Calculated total */}
        <div className="flex items-center justify-between bg-primary/5 rounded-lg px-3 py-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calculator className="h-3 w-3" />
            총 식대비
          </span>
          <span className="font-bold text-primary text-sm">
            {formatKoreanWon(calculatedTotal)}
          </span>
        </div>

        {/* Save button */}
        <Button size="sm" onClick={handleSave} className="w-full">
          적용
        </Button>
      </div>
    );
  }

  // Popover mode (original design)
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium flex items-center gap-1.5">
          <Users className="h-4 w-4 text-primary" />
          식대비 계산
        </div>
        {onClose && (
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            하객 수 (명)
          </label>
          <Input
            type="text"
            inputMode="numeric"
            value={tempQuantity}
            onChange={(e) => setTempQuantity(parseNumericInput(e.target.value))}
            placeholder="예상 하객 수를 입력하세요"
            className="h-9"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            1인당 식대 (원)
          </label>
          <Input
            type="text"
            inputMode="numeric"
            value={tempUnitPrice ? parseInt(tempUnitPrice).toLocaleString() : ''}
            onChange={(e) => setTempUnitPrice(parseNumericInput(e.target.value))}
            placeholder="1인당 식대를 입력하세요"
            className="h-9"
          />
        </div>
        
        {/* Real-time calculation preview */}
        <div className="flex items-center justify-between bg-secondary/80 rounded-lg px-3 py-2.5">
          <span className="text-xs text-muted-foreground">
            {tempQuantity || '0'}명 × {tempUnitPrice ? `₩${parseInt(tempUnitPrice).toLocaleString()}` : '₩0'}
          </span>
          <span className="font-bold text-primary">
            = {formatKoreanWon(calculatedTotal)}
          </span>
        </div>
      </div>
      
      <Button size="sm" className="w-full" onClick={handleSave}>
        적용
      </Button>
    </div>
  );
}

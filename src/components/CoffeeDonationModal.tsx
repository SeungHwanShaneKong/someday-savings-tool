import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Coffee, Heart, ExternalLink } from 'lucide-react';

const PRESET_AMOUNTS = [
  { value: 3000, label: '☕ 아메리카노', emoji: '☕' },
  { value: 5000, label: '🍰 케이크 세트', emoji: '🍰' },
  { value: 10000, label: '🍕 든든한 한 끼', emoji: '🍕' },
];

// TODO: Replace with actual KakaoPay link once provided
const KAKAOPAY_LINK = '';

interface CoffeeDonationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CoffeeDonationModal({ open, onOpenChange }: CoffeeDonationModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(3000);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const finalAmount = isCustom ? (parseInt(customAmount) || 0) : (selectedAmount || 0);

  const handleDonate = () => {
    if (finalAmount <= 0) return;
    
    if (KAKAOPAY_LINK) {
      window.open(KAKAOPAY_LINK, '_blank');
    } else {
      // Fallback: show instructions
      window.open(`https://qr.kakaopay.com/`, '_blank');
    }
    onOpenChange(false);
  };

  const handlePresetClick = (amount: number) => {
    setSelectedAmount(amount);
    setIsCustom(false);
    setCustomAmount('');
  };

  const handleCustomFocus = () => {
    setIsCustom(true);
    setSelectedAmount(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md mx-auto">
        <DialogHeader className="text-center">
          <div className="text-5xl mb-2 mx-auto">☕</div>
          <DialogTitle className="text-xl">배고픈 개발자에게 커피 쏘기</DialogTitle>
          <DialogDescription className="text-sm">
            웨딩셈이 도움이 되셨다면, 개발자에게 따뜻한 커피 한 잔을 선물해주세요 💙
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Preset amounts */}
          <div className="grid grid-cols-3 gap-2">
            {PRESET_AMOUNTS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePresetClick(preset.value)}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all',
                  'hover:border-primary/50 hover:bg-primary/5',
                  !isCustom && selectedAmount === preset.value
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border bg-card'
                )}
              >
                <span className="text-2xl">{preset.emoji}</span>
                <span className="text-xs font-medium text-foreground">
                  {preset.value.toLocaleString()}원
                </span>
                <span className="text-[10px] text-muted-foreground">{preset.label.split(' ').slice(1).join(' ')}</span>
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="relative">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="직접 입력 (원)"
              value={customAmount}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, '');
                setCustomAmount(v);
              }}
              onFocus={handleCustomFocus}
              className={cn(
                'h-12 text-center text-lg font-medium',
                isCustom && 'ring-2 ring-primary border-primary'
              )}
            />
            {isCustom && customAmount && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                원
              </span>
            )}
          </div>

          {/* Donate button */}
          <Button
            onClick={handleDonate}
            disabled={finalAmount <= 0}
            className="w-full h-12 text-base font-bold gap-2 bg-[#FEE500] hover:bg-[#FDD835] text-[#3C1E1E] shadow-md"
          >
            <span>카카오페이로 {finalAmount > 0 ? `${finalAmount.toLocaleString()}원` : ''} 보내기</span>
          </Button>

          <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
            카카오페이 송금 페이지로 이동합니다<br />
            여러분의 응원이 큰 힘이 됩니다 <Heart className="inline h-3 w-3 text-destructive" />
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Floating trigger button
export function CoffeeDonationFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-6 right-4 z-50',
        'flex items-center gap-2 px-4 py-3 rounded-full',
        'bg-[#FEE500] text-[#3C1E1E] font-semibold text-sm',
        'shadow-lg hover:shadow-xl hover:scale-105',
        'active:scale-95 transition-all duration-200',
        'sm:bottom-8 sm:right-8'
      )}
      aria-label="개발자에게 커피 쏘기"
    >
      <Coffee className="h-5 w-5" />
      <span className="hidden sm:inline">커피 한 잔</span>
    </button>
  );
}

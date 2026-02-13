import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Coffee, Heart, Copy, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const PRESET_AMOUNTS = [
  { value: 3000, label: '☕ 아메리카노', emoji: '☕' },
  { value: 5000, label: '🍰 케이크 세트', emoji: '🍰' },
  { value: 10000, label: '🍕 든든한 한 끼', emoji: '🍕' },
];

const BANK_NAME = '카카오뱅크';
const ACCOUNT_NUMBER = '3333206517167';
const ACCOUNT_HOLDER = '웨딩셈 개발자';

// Toss 송금 딥링크: supertoss://send?bank=카카오뱅크&accountNo=계좌&amount=금액
function buildTossLink(amount: number) {
  return `supertoss://send?bank=${encodeURIComponent(BANK_NAME)}&accountNo=${ACCOUNT_NUMBER}&amount=${amount}&msg=${encodeURIComponent('웨딩셈 커피 후원')}`;
}

// 카카오뱅크 앱 딥링크
function buildKakaoBankLink() {
  return `kakaobank://`;
}

interface CoffeeDonationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CoffeeDonationModal({ open, onOpenChange }: CoffeeDonationModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(3000);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'select' | 'transfer'>('select');

  const finalAmount = isCustom ? (parseInt(customAmount) || 0) : (selectedAmount || 0);

  const handleCopyAccount = async () => {
    try {
      await navigator.clipboard.writeText(ACCOUNT_NUMBER);
      setCopied(true);
      toast({
        title: '계좌번호가 복사되었어요!',
        description: `${BANK_NAME} ${ACCOUNT_NUMBER}`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = ACCOUNT_NUMBER;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      toast({
        title: '계좌번호가 복사되었어요!',
        description: `${BANK_NAME} ${ACCOUNT_NUMBER}`,
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNext = () => {
    if (finalAmount <= 0) return;
    setStep('transfer');
  };

  const handleTossTransfer = () => {
    window.location.href = buildTossLink(finalAmount);
    // Fallback: if Toss isn't installed, nothing happens visually
  };

  const handleKakaoBank = () => {
    window.location.href = buildKakaoBankLink();
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setStep('select');
      setCopied(false);
    }
    onOpenChange(open);
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md mx-auto">
        {step === 'select' ? (
          <>
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
                    <span className="text-[10px] text-muted-foreground">
                      {preset.label.split(' ').slice(1).join(' ')}
                    </span>
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

              {/* Next button */}
              <Button
                onClick={handleNext}
                disabled={finalAmount <= 0}
                className="w-full h-12 text-base font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
              >
                {finalAmount > 0 ? `${finalAmount.toLocaleString()}원 후원하기` : '금액을 선택해주세요'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="text-center">
              <div className="text-4xl mb-2 mx-auto">🎉</div>
              <DialogTitle className="text-lg">감사합니다!</DialogTitle>
              <DialogDescription className="text-sm">
                아래 계좌로 {finalAmount.toLocaleString()}원을 보내주세요
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Account info card */}
              <div className="bg-secondary rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">은행</span>
                  <span className="text-sm font-semibold text-foreground">{BANK_NAME}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">계좌번호</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground tracking-wide">{ACCOUNT_NUMBER}</span>
                    <button
                      onClick={handleCopyAccount}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                      aria-label="계좌번호 복사"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">금액</span>
                  <span className="text-sm font-bold text-primary">{finalAmount.toLocaleString()}원</span>
                </div>
              </div>

              {/* Copy account button - primary action */}
              <Button
                onClick={handleCopyAccount}
                className={cn(
                  'w-full h-12 text-base font-bold gap-2 shadow-md',
                  copied
                    ? 'bg-success hover:bg-success/90 text-success-foreground'
                    : 'bg-[#FEE500] hover:bg-[#FDD835] text-[#3C1E1E]'
                )}
              >
                {copied ? (
                  <>
                    <Check className="h-5 w-5" />
                    복사 완료!
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    계좌번호 복사하기
                  </>
                )}
              </Button>

              {/* Quick transfer buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={handleTossTransfer}
                  className="h-11 text-sm font-medium gap-2"
                >
                  <span className="text-lg">💙</span>
                  토스로 송금
                </Button>
                <Button
                  variant="outline"
                  onClick={handleKakaoBank}
                  className="h-11 text-sm font-medium gap-2"
                >
                  <span className="text-lg">🏦</span>
                  카카오뱅크 열기
                </Button>
              </div>

              <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
                계좌번호를 복사 후 뱅킹 앱에서 이체해주세요<br />
                여러분의 응원이 큰 힘이 됩니다 <Heart className="inline h-3 w-3 text-destructive" />
              </p>

              <Button
                variant="ghost"
                onClick={() => setStep('select')}
                className="w-full text-sm text-muted-foreground"
              >
                ← 금액 다시 선택
              </Button>
            </div>
          </>
        )}
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

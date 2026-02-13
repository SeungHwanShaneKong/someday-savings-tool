/**
 * CoffeeDonationModal — CRO-optimized donation flow
 * 
 * Design Philosophy:
 * - Sophisticated warm gradient palette (amber/rose tones)
 * - Gentle pulse animation on FAB (4s interval, GPU-accelerated)
 * - 1-click Toss deep link (mobile) / copy-to-clipboard (desktop)
 * - Minimal friction: preset → CTA in 2 taps
 * - Safe area aware positioning for notch devices
 */
import { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Coffee, Heart, Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

const PRESET_AMOUNTS = [
  { value: 3000, label: '아메리카노', emoji: '☕' },
  { value: 5000, label: '케이크 세트', emoji: '🍰' },
  { value: 10000, label: '든든한 한 끼', emoji: '🍕' },
];

const BANK_NAME = '카카오뱅크';
const ACCOUNT_NUMBER = '3333206517167';

function buildTossLink(amount: number) {
  return `supertoss://send?bank=${encodeURIComponent(BANK_NAME)}&accountNo=${ACCOUNT_NUMBER}&amount=${amount}&msg=${encodeURIComponent('웨딩셈 커피 후원')}`;
}

function buildKakaoBankLink() {
  return 'kakaobank://';
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
  const [isTransferring, setIsTransferring] = useState(false);
  const isMobile = useIsMobile();
  const transferTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const finalAmount = isCustom ? (parseInt(customAmount) || 0) : (selectedAmount || 0);

  const handleCopyAccount = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(ACCOUNT_NUMBER);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = ACCOUNT_NUMBER;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    toast({ title: '계좌번호 복사 완료!', description: `${BANK_NAME} ${ACCOUNT_NUMBER}` });
    setTimeout(() => setCopied(false), 2500);
  }, []);

  const handleTossTransfer = useCallback(() => {
    if (isTransferring || finalAmount <= 0) return;
    setIsTransferring(true);
    window.location.href = buildTossLink(finalAmount);

    transferTimeoutRef.current = setTimeout(() => {
      handleCopyAccount();
      toast({
        title: '토스 앱이 없어요',
        description: '계좌번호를 복사했어요. 다른 뱅킹 앱에서 이체해주세요!',
      });
      setIsTransferring(false);
    }, 2000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(transferTimeoutRef.current);
        setIsTransferring(false);
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
  }, [finalAmount, isTransferring, handleCopyAccount]);

  const handleKakaoBank = useCallback(() => {
    if (isTransferring) return;
    handleCopyAccount();
    setTimeout(() => {
      window.location.href = buildKakaoBankLink();
    }, 300);
  }, [isTransferring, handleCopyAccount]);

  const handleClose = (v: boolean) => {
    if (!v) {
      setCopied(false);
      setIsTransferring(false);
      clearTimeout(transferTimeoutRef.current);
    }
    onOpenChange(v);
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
      <DialogContent className="sm:max-w-md mx-auto p-0 overflow-hidden border-none">
        {/* Warm gradient header */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 px-6 pt-6 pb-4">
          <DialogHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Coffee className="h-8 w-8 text-white" />
            </div>
            <DialogTitle className="text-xl font-bold">
              개발자에게 따뜻한 커피 한 잔 ☕
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              웨딩셈이 도움이 되셨다면, 작은 응원을 보내주세요
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Preset amounts — card-style selection */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            {PRESET_AMOUNTS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePresetClick(preset.value)}
                className={cn(
                  'relative flex flex-col items-center gap-1.5 p-3.5 rounded-2xl border-2 transition-all duration-200',
                  'hover:shadow-md active:scale-[0.97]',
                  !isCustom && selectedAmount === preset.value
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20 shadow-sm'
                    : 'border-border hover:border-amber-300 dark:hover:border-amber-700'
                )}
              >
                {!isCustom && selectedAmount === preset.value && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
                <span className="text-2xl leading-none">{preset.emoji}</span>
                <span className="text-sm font-bold text-foreground">
                  {preset.value.toLocaleString()}원
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">{preset.label}</span>
              </button>
            ))}
          </div>

          {/* Custom amount input */}
          <div className="relative">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="직접 입력 (원)"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value.replace(/[^0-9]/g, ''))}
              onFocus={handleCustomFocus}
              className={cn(
                'h-12 text-center text-lg font-medium rounded-xl',
                isCustom && 'ring-2 ring-amber-500 border-amber-500'
              )}
            />
            {isCustom && customAmount && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
            )}
          </div>

          {/* Primary CTA */}
          {isMobile ? (
            <Button
              onClick={handleTossTransfer}
              disabled={finalAmount <= 0 || isTransferring}
              className={cn(
                'w-full h-14 text-base font-bold gap-2 rounded-xl',
                'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600',
                'text-white shadow-lg shadow-amber-500/25',
                'transition-all duration-200 active:scale-[0.98]',
                'disabled:opacity-50 disabled:shadow-none'
              )}
            >
              <ExternalLink className="h-5 w-5" />
              {isTransferring
                ? '송금 앱 여는 중...'
                : finalAmount > 0
                  ? `토스로 ${finalAmount.toLocaleString()}원 보내기`
                  : '금액을 선택해주세요'}
            </Button>
          ) : (
            <Button
              onClick={handleCopyAccount}
              disabled={finalAmount <= 0}
              className={cn(
                'w-full h-14 text-base font-bold gap-2 rounded-xl transition-all duration-200',
                copied
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25'
              )}
            >
              {copied ? (
                <><Check className="h-5 w-5" /> 복사 완료! 뱅킹 앱에서 이체해주세요</>
              ) : (
                <><Copy className="h-5 w-5" /> 계좌번호 복사 후 이체하기</>
              )}
            </Button>
          )}

          {/* Secondary actions */}
          <div className="grid grid-cols-2 gap-2">
            {isMobile ? (
              <>
                <Button variant="outline" onClick={handleKakaoBank} disabled={finalAmount <= 0} className="h-11 text-sm font-medium gap-1.5 rounded-xl">
                  <span className="text-base">🏦</span> 카카오뱅크
                </Button>
                <Button variant="outline" onClick={handleCopyAccount} disabled={finalAmount <= 0} className="h-11 text-sm font-medium gap-1.5 rounded-xl">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? '복사됨' : '계좌 복사'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleTossTransfer} disabled={finalAmount <= 0} className="h-11 text-sm font-medium gap-1.5 rounded-xl">
                  <span className="text-base">💙</span> 토스로 송금
                </Button>
                <Button variant="outline" onClick={handleKakaoBank} disabled={finalAmount <= 0} className="h-11 text-sm font-medium gap-1.5 rounded-xl">
                  <span className="text-base">🏦</span> 카카오뱅크
                </Button>
              </>
            )}
          </div>

          {/* Account info strip */}
          <div className="bg-muted/50 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">{BANK_NAME} {ACCOUNT_NUMBER}</span>
            <button onClick={handleCopyAccount} className="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? '복사됨' : '복사'}
            </button>
          </div>

          <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
            여러분의 응원이 큰 힘이 됩니다 <Heart className="inline h-3 w-3 text-rose-400" />
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * CoffeeDonationFab — Premium floating action button
 * 
 * CRO triggers:
 * - Warm amber-to-orange gradient with soft glow
 * - coffee-wiggle animation (defined in tailwind.config.ts, 4s cycle)
 * - Hover: elevated shadow + subtle scale
 * - Touch: instant feedback via active:scale
 * - Safe area inset for notch devices
 * - Full label on desktop, icon-only on mobile for space efficiency
 */
export function CoffeeDonationFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed z-50 group',
        // Safe area positioning
        'bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-3',
        'sm:bottom-8 sm:right-6',
        // Layout
        'flex items-center gap-2 pl-4 pr-5 py-3 sm:py-3.5 rounded-full',
        // Warm gradient background
        'bg-gradient-to-r from-amber-500 to-orange-500',
        'text-white font-semibold text-sm',
        // Elevated shadow with warm glow
        'shadow-[0_4px_20px_-4px_rgba(245,158,11,0.5)]',
        // Hover: intensify glow + lift
        'hover:shadow-[0_8px_30px_-4px_rgba(245,158,11,0.6)] hover:scale-105',
        // Active: tactile press
        'active:scale-95',
        // Smooth transitions
        'transition-all duration-200 ease-out',
        // Gentle wiggle animation for attention
        'animate-coffee-wiggle'
      )}
      aria-label="개발자에게 커피 후원하기"
    >
      <Coffee className="h-5 w-5 flex-shrink-0" />
      <span className="whitespace-nowrap">커피 한잔</span>
    </button>
  );
}

/**
 * CoffeeDonationModal - 최적화된 후원 흐름
 * 
 * 송금 최적화:
 * - 토스(Toss) 딥링크: 계좌/금액/메모 자동입력 → 1클릭 송금
 * - 카카오뱅크 딥링크: 앱 즉시 실행
 * - 계좌 복사 폴백: 딥링크 미지원 환경 대응
 * 
 * CRO 트리거:
 * - FAB에 gentle-bounce 애니메이션 (4초 간격, CPU 최적화)
 * - 호버 시 scale + glow 피드백
 * - 중복 클릭 방지 (debounce)
 */
import { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Coffee, Heart, Copy, Check, ExternalLink, Smartphone } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

const PRESET_AMOUNTS = [
  { value: 3000, label: '아메리카노', emoji: '☕' },
  { value: 5000, label: '케이크 세트', emoji: '🍰' },
  { value: 10000, label: '든든한 한 끼', emoji: '🍕' },
];

const BANK_NAME = '카카오뱅크';
const ACCOUNT_NUMBER = '3333206517167';

/** Toss 딥링크 — 계좌·금액·메모 자동입력, 1클릭 송금 */
function buildTossLink(amount: number) {
  return `supertoss://send?bank=${encodeURIComponent(BANK_NAME)}&accountNo=${ACCOUNT_NUMBER}&amount=${amount}&msg=${encodeURIComponent('웨딩셈 커피 후원')}`;
}

/** Toss 웹 폴백 (앱 미설치 시) */
function buildTossWebLink() {
  return `https://toss.me`;
}

/** 카카오뱅크 앱 실행 */
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

  /** 토스 딥링크 실행 + 앱 미설치 폴백 */
  const handleTossTransfer = useCallback(() => {
    if (isTransferring || finalAmount <= 0) return;
    setIsTransferring(true);

    // 딥링크 시도
    window.location.href = buildTossLink(finalAmount);

    // 2초 후에도 페이지에 있으면 앱 미설치로 판단 → 웹 폴백
    transferTimeoutRef.current = setTimeout(() => {
      // 계좌 자동 복사 후 안내
      handleCopyAccount();
      toast({
        title: '토스 앱이 없어요',
        description: '계좌번호를 복사했어요. 다른 뱅킹 앱에서 이체해주세요!',
      });
      setIsTransferring(false);
    }, 2000);

    // 페이지 포커스 복귀 시 타임아웃 해제 (앱이 열렸다는 신호)
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
      <DialogContent className="sm:max-w-md mx-auto">
        <DialogHeader className="text-center">
          <div className="text-5xl mb-2 mx-auto animate-bounce" style={{ animationDuration: '2s', animationIterationCount: '3' }}>☕</div>
          <DialogTitle className="text-xl">배고픈 개발자에게 커피 쏘기</DialogTitle>
          <DialogDescription className="text-sm">
            웨딩셈이 도움이 되셨다면, 따뜻한 커피 한 잔을 선물해주세요 💙
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
                  'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all duration-200',
                  'hover:border-primary/50 hover:bg-primary/5 active:scale-95',
                  !isCustom && selectedAmount === preset.value
                    ? 'border-primary bg-primary/10 shadow-sm scale-[1.02]'
                    : 'border-border bg-card'
                )}
              >
                <span className="text-2xl">{preset.emoji}</span>
                <span className="text-xs font-bold text-foreground">
                  {preset.value.toLocaleString()}원
                </span>
                <span className="text-[10px] text-muted-foreground">{preset.label}</span>
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
              onChange={(e) => setCustomAmount(e.target.value.replace(/[^0-9]/g, ''))}
              onFocus={handleCustomFocus}
              className={cn(
                'h-12 text-center text-lg font-medium',
                isCustom && 'ring-2 ring-primary border-primary'
              )}
            />
            {isCustom && customAmount && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
            )}
          </div>

          {/* Primary CTA: Toss 즉시 송금 (모바일) / 계좌 복사 (데스크톱) */}
          {isMobile ? (
            <Button
              onClick={handleTossTransfer}
              disabled={finalAmount <= 0 || isTransferring}
              className="w-full h-14 text-base font-bold gap-2 shadow-lg bg-[hsl(220,100%,50%)] hover:bg-[hsl(220,100%,45%)] text-white"
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
              onClick={() => { handleCopyAccount(); }}
              disabled={finalAmount <= 0}
              className={cn(
                'w-full h-14 text-base font-bold gap-2 shadow-lg transition-all',
                copied
                  ? 'bg-success hover:bg-success/90 text-success-foreground'
                  : 'bg-[hsl(48,100%,50%)] hover:bg-[hsl(48,100%,45%)] text-[hsl(20,40%,15%)]'
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
                <Button variant="outline" onClick={handleKakaoBank} disabled={finalAmount <= 0} className="h-11 text-sm font-medium gap-1.5">
                  <span className="text-base">🏦</span> 카카오뱅크
                </Button>
                <Button variant="outline" onClick={handleCopyAccount} disabled={finalAmount <= 0} className="h-11 text-sm font-medium gap-1.5">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? '복사됨' : '계좌 복사'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleTossTransfer} disabled={finalAmount <= 0} className="h-11 text-sm font-medium gap-1.5">
                  <span className="text-base">💙</span> 토스로 송금
                </Button>
                <Button variant="outline" onClick={handleKakaoBank} disabled={finalAmount <= 0} className="h-11 text-sm font-medium gap-1.5">
                  <span className="text-base">🏦</span> 카카오뱅크
                </Button>
              </>
            )}
          </div>

          {/* Account info (always visible, compact) */}
          <div className="bg-secondary/50 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{BANK_NAME} {ACCOUNT_NUMBER}</span>
            <button onClick={handleCopyAccount} className="text-primary font-medium hover:underline flex items-center gap-1">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? '복사됨' : '복사'}
            </button>
          </div>

          <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
            여러분의 응원이 큰 힘이 됩니다 <Heart className="inline h-3 w-3 text-destructive" />
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** FAB — gentle-wiggle 애니메이션으로 시선 유도, 호버 시 glow 피드백 */
export function CoffeeDonationFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed z-50',
        'bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-4',
        'sm:bottom-8 sm:right-8',
        'flex items-center gap-2 px-4 py-3 rounded-full',
        'bg-[hsl(48,100%,50%)] text-[hsl(20,40%,15%)] font-semibold text-sm',
        'shadow-lg',
        'hover:shadow-[0_0_20px_hsl(48,100%,50%/0.5)] hover:scale-110',
        'active:scale-95',
        'transition-all duration-200',
        'animate-coffee-wiggle'
      )}
      aria-label="개발자에게 커피 쏘기"
    >
      <Coffee className="h-5 w-5" />
      <span className="hidden sm:inline">커피 한 잔 ☕</span>
    </button>
  );
}

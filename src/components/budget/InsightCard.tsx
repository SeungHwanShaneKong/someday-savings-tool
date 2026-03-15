// [CL-INSIGHT-CHECK-20260315-160000] 인사이트 체크 버튼 + 파티클 업그레이드
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Check, CircleCheck } from 'lucide-react';
import type { BudgetInsight, InsightType } from '@/lib/budget-optimizer';

interface InsightCardProps {
  insight: BudgetInsight;
  onDismiss?: (id: string) => void;
  isDismissing?: boolean;
}

const TYPE_STYLES: Record<InsightType, string> = {
  warning: 'border-l-orange-500 bg-orange-50/60 dark:bg-orange-950/20',
  saving: 'border-l-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20',
  hidden_cost: 'border-l-red-500 bg-red-50/60 dark:bg-red-950/20',
  praise: 'border-l-blue-500 bg-blue-50/60 dark:bg-blue-950/20',
  info: 'border-l-slate-400 bg-slate-50/60 dark:bg-slate-950/20',
};

const PARTICLES = [
  { tx: '-14px', ty: '-14px', color: 'bg-emerald-400' },
  { tx: '14px',  ty: '-14px', color: 'bg-yellow-400' },
  { tx: '18px',  ty: '2px',   color: 'bg-blue-400' },
  { tx: '-18px', ty: '2px',   color: 'bg-pink-400' },
  { tx: '-8px',  ty: '16px',  color: 'bg-amber-400' },
  { tx: '8px',   ty: '16px',  color: 'bg-violet-400' },
];

export function InsightCard({ insight, onDismiss, isDismissing }: InsightCardProps) {
  const [isChecked, setIsChecked] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  const handleCheck = useCallback(() => {
    if (!onDismiss || isChecked) return;
    setIsChecked(true);
    setShowParticles(true);

    // 400ms 후 부모에 dismiss 알림 (버튼 애니메이션 완료 후)
    setTimeout(() => {
      onDismiss(insight.id);
    }, 400);
  }, [onDismiss, insight.id, isChecked]);

  return (
    <div
      className={cn(
        'relative border-l-4 rounded-xl p-3.5 transition-all',
        TYPE_STYLES[insight.type],
        isDismissing && 'insight-card-dismissing'
      )}
    >
      {/* 확인 체크 버튼 */}
      {onDismiss && (
        <div className="absolute top-2 right-2 z-10">
          <div className="relative">
            {/* 파티클 burst */}
            {showParticles &&
              PARTICLES.map((p, i) => (
                <span
                  key={i}
                  className={cn('insight-particle is-active', p.color)}
                  style={
                    {
                      '--tx': p.tx,
                      '--ty': p.ty,
                      animationDelay: `${i * 30}ms`,
                      top: '50%',
                      left: '50%',
                    } as React.CSSProperties
                  }
                />
              ))}

            {/* 체크 버튼 */}
            <button
              onClick={handleCheck}
              disabled={isChecked}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
                'border transition-all duration-200',
                isChecked
                  ? 'bg-emerald-500 border-emerald-500 text-white animate-insight-check-pop'
                  : [
                      'border-border text-muted-foreground/60',
                      'hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600 hover:scale-105',
                      'dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 dark:hover:border-emerald-600',
                      'active:scale-95',
                    ]
              )}
              aria-label="인사이트 확인 완료"
            >
              {isChecked ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>완료!</span>
                </>
              ) : (
                <>
                  <CircleCheck className="w-3 h-3" />
                  <span>확인</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 카드 콘텐츠 */}
      <div className="flex items-start gap-2.5 pr-14">
        <span className="text-lg flex-shrink-0">{insight.emoji}</span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground leading-tight">
            {insight.title}
          </h4>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {insight.description}
          </p>
        </div>
      </div>
    </div>
  );
}

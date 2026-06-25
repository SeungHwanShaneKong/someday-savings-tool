// [CL-ANIM-UPGRADE-20260621-150000] 앰비언트 저장 상태 — "저장 중…/저장됨 ✓/저장 실패"
// Google Docs 식 조용한 신뢰 신호. 매 항목 플래시(노이즈) 대신 단일 표시.
// aria-live=polite 로 스크린리더가 저장 결과를 알린다.
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface SaveStatusIndicatorProps {
  state: SaveState;
  className?: string;
}

export function SaveStatusIndicator({ state, className }: SaveStatusIndicatorProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn('inline-flex items-center gap-1 text-xs font-medium h-5 select-none', className)}
    >
      {state === 'saving' && (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          저장 중…
        </span>
      )}
      {state === 'saved' && (
        /* [CL-ANIM-SAVE-DOPAMINE2-20260625-000000] 저장됨 — 성공 칩(스프링) + 시머 스윕 + 체크배지 팝 + 3입자 스파클.
           '그 순간'에만 짧게 터지고 자가소멸(절제). reduced-motion 시 정적 칩만. 실패는 차분한 save-pop 유지. */
        <span className="relative inline-flex items-center gap-1.5 save-success-pill text-emerald-700 dark:text-emerald-300 font-semibold">
          <span aria-hidden className="save-shimmer" />
          <span
            aria-hidden
            className="save-check-badge inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white shrink-0"
          >
            <Check className="w-2.5 h-2.5" strokeWidth={3.5} aria-hidden />
          </span>
          저장됨
          <span aria-hidden className="save-spark save-spark-1" />
          <span aria-hidden className="save-spark save-spark-2" />
          <span aria-hidden className="save-spark save-spark-3" />
        </span>
      )}
      {state === 'error' && (
        <span className="inline-flex items-center gap-1 text-destructive animate-save-pop">
          <AlertCircle className="w-3.5 h-3.5" aria-hidden />
          저장 실패
        </span>
      )}
    </span>
  );
}

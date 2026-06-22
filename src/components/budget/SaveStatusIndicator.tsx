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
        /* [CL-ANIM-SAVE-DOPAMINE-20260622-233012] 저장됨 — 도파민 강화 팝(개선9). 실패는 차분한 save-pop 유지. */
        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 animate-save-dopamine">
          <Check className="w-3.5 h-3.5" aria-hidden />
          저장됨
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

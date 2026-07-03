// [CL-TOP20-P3-INPUT-20260703-030000] 스마트 금액 입력 — Top20 P3-#12
// 기존 인라인 금액 Input 을 대체하는 제어 컴포넌트.
//  ① "500만"·"1.2억"·"5000000" 인식(parseSmartWon — parseKoreanWon 확장)
//  ② 포커스(편집) 중 실시간 해석 힌트("= 500만원") — 입력 하단 우측 정렬(좁은 테이블 셀 폭 대응)
//  ③ blur/Enter 확정 → onCommit 1회(더블서밋 게이트), Escape → onCancel(커밋 없음)
//  ④ 평균 1탭: averageAmount 전달 시 "평균 292만" 버튼 — 탭 시 값만 채우고 커밋은 기존 확정 동작
//  IME 안전: 합성 중엔 원문 보존(살균 금지), 합성 중 blur 는 보류 → compositionEnd 에서 최종값 커밋
//  (BudgetTable 메모 입력의 [CL-COEDIT-QA200-FIX-20260620] 패턴과 동일 계약).
import { useId, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { formatKoreanWon } from '@/lib/budget-categories';
import { parseSmartWon, sanitizeWonText } from '@/lib/smart-won';
import { cn } from '@/lib/utils';

interface SmartWonInputProps {
  /** 편집 시작 시 초기 금액(0 이면 빈 입력으로 시작) */
  value: number;
  /** blur/Enter 확정 시 정확히 1회 호출 — 빈 입력·해석 불가는 0(기존 parseInt(...)||0 계약 보존) */
  onCommit: (amount: number) => void;
  /** Escape 취소(커밋 없음) */
  onCancel?: () => void;
  /** 내부 Input 에 적용(기존 인라인 입력의 크기/정렬 클래스 호환) */
  className?: string;
  /** 루트 컨테이너에 적용(모바일 flex-1 등 레이아웃용) */
  containerClassName?: string;
  'aria-label'?: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** 평균 1탭 버튼 금액 — 없거나 0(무료)이면 버튼 숨김 */
  averageAmount?: number | null;
}

export function SmartWonInput({
  value,
  onCommit,
  onCancel,
  className,
  containerClassName,
  'aria-label': ariaLabel,
  placeholder = '금액 입력',
  autoFocus = false,
  averageAmount,
}: SmartWonInputProps) {
  const [text, setText] = useState(() => (value > 0 ? String(value) : ''));
  const isComposingRef = useRef(false);
  const pendingBlurRef = useRef(false);
  // 커밋/취소 후 중복 발화 차단(Enter 커밋 → 언마운트 전 blur 등)
  const doneRef = useRef(false);
  const hintId = useId();

  const parsed = parseSmartWon(text);
  const hintWon = parsed !== null && parsed > 0 ? parsed : null;
  const avg = typeof averageAmount === 'number' && averageAmount > 0 ? averageAmount : null;

  const commit = (raw: string) => {
    if (doneRef.current) return;
    doneRef.current = true;
    onCommit(parseSmartWon(raw) ?? 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // IME 합성 중엔 조합 원문 보존(살균 시 한글 조합 파괴) — 확정 문자만 즉시 살균
    setText(isComposingRef.current ? raw : sanitizeWonText(raw));
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    const clean = sanitizeWonText(e.currentTarget.value);
    setText(clean);
    // 합성 중 발생했던 blur 를 최종 조합값으로 커밋(유실 0)
    if (pendingBlurRef.current) {
      pendingBlurRef.current = false;
      commit(clean);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (doneRef.current) return;
    if (isComposingRef.current) {
      pendingBlurRef.current = true;
      return;
    }
    commit(e.currentTarget.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commit(e.currentTarget.value);
    } else if (e.key === 'Escape') {
      doneRef.current = true;
      onCancel?.();
    }
  };

  const fillAverage = () => {
    if (avg === null) return;
    setText(String(avg)); // 값만 채움 — 커밋은 사용자의 blur/Enter 확정으로
  };

  return (
    <div className={cn('flex min-w-0 flex-col items-end gap-0.5', containerClassName)}>
      <Input
        type="text"
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        className={className}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-describedby={hintWon !== null ? hintId : undefined}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
      />
      {(hintWon !== null || avg !== null) && (
        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
          {hintWon !== null && (
            <span
              id={hintId}
              className="text-[10px] sm:text-xs font-medium text-primary tabular-nums"
            >
              = {formatKoreanWon(hintWon)}
            </span>
          )}
          {avg !== null && (
            <button
              type="button"
              // mousedown 기본동작 차단 → 입력 blur(조기 커밋) 없이 값 채움
              onMouseDown={(e) => e.preventDefault()}
              onClick={fillAverage}
              aria-label={`평균 금액 ${formatKoreanWon(avg)} 채우기`}
              className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] sm:text-xs font-medium text-primary transition-colors hover:bg-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
            >
              평균 {formatKoreanWon(avg).replace(/원$/, '')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

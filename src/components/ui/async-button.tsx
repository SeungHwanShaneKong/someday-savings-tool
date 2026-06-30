// [CL-BTNPERFECT-20260629] 비동기 버튼 — Button(CVA) 을 compose(포크 금지). 진행 중 disabled + 스피너 + aria-busy,
//   동기 연타 차단. 외부 pending(부모 구동) 또는 onClick 이 Promise 반환 시 내부 busy 자동 추적.
import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';

export interface AsyncButtonProps extends ButtonProps {
  /** 부모가 외부에서 진행상태를 구동(예: useAsyncAction 의 pending). */
  pending?: boolean;
  /** 진행 중 표시 텍스트(없으면 children 유지). */
  loadingText?: React.ReactNode;
  /** 'start'(기본)=텍스트 앞 스피너 · 'replace'=children 자리에 스피너만. */
  spinnerPosition?: 'start' | 'replace';
}

export const AsyncButton = React.forwardRef<HTMLButtonElement, AsyncButtonProps>(
  ({ pending, loadingText, spinnerPosition = 'start', onClick, disabled, children, ...props }, ref) => {
    const [internalBusy, setInternalBusy] = React.useState(false);
    const busyRef = React.useRef(false); // 동기 연타 차단(리렌더 이전)
    const mounted = React.useRef(true);
    React.useEffect(() => () => { mounted.current = false; }, []);

    const effectivePending = !!pending || internalBusy;

    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (busyRef.current || effectivePending) { e.preventDefault(); return; }
        const ret = onClick?.(e) as unknown;
        if (ret && typeof (ret as Promise<unknown>).then === 'function') {
          busyRef.current = true;
          setInternalBusy(true);
          void (ret as Promise<unknown>).finally(() => {
            busyRef.current = false;
            if (mounted.current) setInternalBusy(false);
          });
        }
      },
      [onClick, effectivePending],
    );

    const spinner = <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />;

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        disabled={disabled || effectivePending}
        aria-busy={effectivePending || undefined}
        {...props}
      >
        {effectivePending ? (
          spinnerPosition === 'replace' ? (
            spinner
          ) : (
            <>{spinner}{loadingText ?? children}</>
          )
        ) : (
          children
        )}
      </Button>
    );
  },
);
AsyncButton.displayName = 'AsyncButton';

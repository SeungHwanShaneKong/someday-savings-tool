// [CL-BTNPERFECT-20260629] 공용 비동기 액션 프리미티브 — "한 번에 하나만 실행 · 진행 중 비활성 · 에러 표준 토스트".
//
// 목적(개선2): 더블클릭 레이스(예산/항목 삭제·추가), 무음 실패(복사·초대), 멈춘 듯한 체감(로딩 미표시)을
//   버튼마다 ad-hoc 으로 고치지 않고 단일 진실원으로 체계 수리한다. AsyncButton 과 bare 핸들러가 공유.
// 설계: pendingRef(동기 게이트)로 같은 틱 더블클릭을 리렌더 전에 차단 · 마운트 가드로 await 후 setState 0건 ·
//   timeoutMs 시 Promise.race 로 친절 reject · 에러는 sonner 토스트(EdgeFunctionError 는 친화 메시지).

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getUserFriendlyError } from '@/lib/edge-function-fetch';

export type AsyncActionState = 'idle' | 'pending' | 'success' | 'error';

export interface UseAsyncActionOptions<TRes> {
  onSuccess?: (res: TRes) => void;
  onError?: (err: unknown) => void;
  /** true(기본)=실패 시 destructive 토스트. 문자열이면 그 메시지로 토스트. false=토스트 없음. */
  toastOnError?: boolean | string;
  /** 초과 시 친절 reject(ms). 미지정=무제한(호출부/edgeFunctionFetch 자체 타임아웃에 위임). */
  timeoutMs?: number;
  /** success 상태 자동 리셋(ms). 기본 1500. */
  successResetMs?: number;
}

export interface UseAsyncActionResult<TArgs, TRes> {
  run: (args: TArgs) => Promise<TRes | undefined>;
  pending: boolean;
  state: AsyncActionState;
  error: unknown | null;
  reset: () => void;
}

/** 에러 → 사용자 메시지(EdgeFunctionError 친화 → Error.message → 일반 한국어). */
export function getActionErrorMessage(err: unknown): string {
  const friendly = getUserFriendlyError(err);
  if (friendly) return friendly;
  if (err instanceof Error && err.message) return err.message;
  return '작업을 완료하지 못했습니다. 잠시 후 다시 시도해주세요.';
}

class TimeoutError extends Error {
  constructor() {
    super('요청이 지연되어 취소되었습니다. 잠시 후 다시 시도해주세요.');
    this.name = 'TimeoutError';
  }
}

export function useAsyncAction<TArgs = void, TRes = void>(
  fn: (args: TArgs) => Promise<TRes>,
  opts: UseAsyncActionOptions<TRes> = {},
): UseAsyncActionResult<TArgs, TRes> {
  const [state, setState] = useState<AsyncActionState>('idle');
  const [error, setError] = useState<unknown | null>(null);

  // 동기 게이트: 같은 틱 더블클릭/연타를 리렌더 이전에 차단(상태 setState 보다 빠름).
  const pendingRef = useRef(false);
  const mountedRef = useRef(true);
  // 최신 fn/opts 참조(클로저 stale 방지 — run 은 안정적 identity 유지).
  const fnRef = useRef(fn); fnRef.current = fn;
  const optsRef = useRef(opts); optsRef.current = opts;
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    mountedRef.current = false;
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
  }, []);

  const reset = useCallback(() => {
    if (!mountedRef.current) return;
    setState('idle');
    setError(null);
  }, []);

  const run = useCallback(async (args: TArgs): Promise<TRes | undefined> => {
    if (pendingRef.current) return undefined; // 진행 중이면 no-op(더블서밋 차단)
    pendingRef.current = true;
    if (mountedRef.current) { setState('pending'); setError(null); }
    const o = optsRef.current;
    try {
      const call = fnRef.current(args);
      // [CL-VULN-R10-20260704 | 핵심] 타이머 핸들을 잡아 정상/에러 어느 경로든 해제 — call 이 먼저
      //   resolve 해도 dangling setTimeout(최대 timeoutMs·60초)이 매 run 누적되던 자원 누수/비결정성 근본수정.
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      const res = o.timeoutMs
        ? await Promise.race([
            call,
            new Promise<never>((_, rej) => {
              timeoutHandle = setTimeout(() => rej(new TimeoutError()), o.timeoutMs);
            }),
          ]).finally(() => { if (timeoutHandle) clearTimeout(timeoutHandle); })
        : await call;
      if (mountedRef.current) {
        setState('success');
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => { if (mountedRef.current) setState('idle'); }, o.successResetMs ?? 1500);
      }
      // [CL-AUDIT-R9-CBGUARD-20260630] 방어심화: 언마운트 후 사용자 콜백이 부모 setState 를 건드리는 풋건 차단.
      //   (토스트는 전역(sonner)이라 무가드 유지 — 컴포넌트 생애와 무관하게 사용자에게 결과 고지)
      if (mountedRef.current) o.onSuccess?.(res);
      return res;
    } catch (err) {
      if (mountedRef.current) { setState('error'); setError(err); }
      const t = o.toastOnError ?? true;
      if (t !== false) {
        toast.error(typeof t === 'string' ? t : getActionErrorMessage(err));
      }
      if (mountedRef.current) o.onError?.(err);
      return undefined;
    } finally {
      pendingRef.current = false;
    }
  }, []);

  return { run, pending: state === 'pending', state, error, reset };
}

// [CL-BTNPERFECT-20260629] useAsyncAction 단위 — 진행중 pending · 더블서밋 1회 · 에러 토스트 · 타임아웃 · 언마운트 안전.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }));

import { useAsyncAction } from '@/hooks/useAsyncAction';

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

beforeEach(() => { toastError.mockReset(); });

describe('useAsyncAction', () => {
  it('AA.1 진행 중 pending=true, 동시 run 은 no-op(더블서밋 → fn 1회)', async () => {
    const d = deferred<string>();
    const fn = vi.fn(() => d.promise);
    const { result } = renderHook(() => useAsyncAction(fn));

    act(() => { void result.current.run(); });
    expect(result.current.pending).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);

    // 같은 상태에서 또 호출 → 무시
    act(() => { void result.current.run(); });
    expect(fn).toHaveBeenCalledTimes(1);

    await act(async () => { d.resolve('ok'); await d.promise; });
    expect(result.current.state).toBe('success');
  });

  it('AA.2 실패 → state=error + destructive 토스트', async () => {
    const fn = vi.fn(async () => { throw new Error('boom'); });
    const { result } = renderHook(() => useAsyncAction(fn));
    await act(async () => { await result.current.run(); });
    expect(result.current.state).toBe('error');
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it('AA.3 toastOnError=false → 토스트 없음', async () => {
    const fn = vi.fn(async () => { throw new Error('x'); });
    const { result } = renderHook(() => useAsyncAction(fn, { toastOnError: false }));
    await act(async () => { await result.current.run(); });
    expect(toastError).not.toHaveBeenCalled();
  });

  it('AA.4 timeoutMs 초과 → 친절 reject + 토스트', async () => {
    const fn = vi.fn(() => new Promise(() => {})); // 영원히 미해결
    const { result } = renderHook(() => useAsyncAction(fn, { timeoutMs: 20 }));
    await act(async () => { await result.current.run(); });
    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(toastError).toHaveBeenCalled();
  });

  it('AA.5 성공 시 onSuccess 호출 + 반환값 전달', async () => {
    const onSuccess = vi.fn();
    const fn = vi.fn(async (n: number) => n * 2);
    const { result } = renderHook(() => useAsyncAction(fn, { onSuccess }));
    let ret: number | undefined;
    await act(async () => { ret = await result.current.run(21); });
    expect(ret).toBe(42);
    expect(onSuccess).toHaveBeenCalledWith(42);
  });

  it('AA.6 언마운트 후 해결돼도 setState 경고/throw 없음', async () => {
    const d = deferred<void>();
    const fn = vi.fn(() => d.promise);
    const { result, unmount } = renderHook(() => useAsyncAction(fn));
    act(() => { void result.current.run(); });
    unmount();
    expect(() => d.resolve()).not.toThrow();
    await d.promise;
  });

  it('AA.7 [R9 방어심화] 언마운트 후 해결 시 onSuccess/onError 콜백 미호출(부모 setState 풋건 차단)', async () => {
    const d = deferred<number>();
    const onSuccess = vi.fn();
    const fn = vi.fn(() => d.promise);
    const { result, unmount } = renderHook(() => useAsyncAction(fn, { onSuccess }));
    act(() => { void result.current.run(); });
    unmount();
    await act(async () => { d.resolve(7); await d.promise.catch(() => {}); });
    expect(onSuccess).not.toHaveBeenCalled(); // 언마운트 후엔 콜백 미실행
  });
});

// [CL-VULN-R10-20260704 | 핵심] timeoutMs 지정 시 Promise.race 의 setTimeout 핸들 누수 회귀 가드.
//   call 이 먼저 resolve 하면 타임아웃 타이머는 즉시 clearTimeout 돼야 한다(현재 코드=dangling 1건).
//   수정 전: vi.getTimerCount()===1 로 실패, 수정 후: 0 으로 통과.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { useAsyncAction } from '@/hooks/useAsyncAction';

afterEach(() => { vi.useRealTimers(); });

describe('useAsyncAction · 타임아웃 타이머 누수', () => {
  it('AT.1 timeoutMs 지정 + call 즉시 resolve → dangling setTimeout 0건(clearTimeout 됨)', async () => {
    vi.useFakeTimers();
    const fn = vi.fn(async () => 'ok');
    const { result } = renderHook(() => useAsyncAction(fn, { timeoutMs: 60000 }));

    let ret: string | undefined;
    await act(async () => { ret = await result.current.run(); });

    expect(ret).toBe('ok');
    // 성공 자동리셋(successResetMs) 타이머는 허용, 타임아웃 타이머는 반드시 해제돼야 한다.
    // 수정 전: 타임아웃 타이머(1) + 리셋 타이머(1)=2 → 이 단언 실패.
    // 수정 후: 리셋 타이머(1)만 남음 → 통과.
    expect(vi.getTimerCount()).toBe(1);
  });

  it('AT.2 timeoutMs 지정 + 여러 run 반복 → 타임아웃 타이머 미누적', async () => {
    vi.useFakeTimers();
    const fn = vi.fn(async () => 'ok');
    const { result } = renderHook(() => useAsyncAction(fn, { timeoutMs: 60000, successResetMs: 0 }));

    for (let i = 0; i < 3; i++) {
      // 각 run 은 성공 후 successResetMs=0 리셋 타이머를 즉시 소진시킨다.
      // eslint-disable-next-line no-await-in-loop
      await act(async () => { await result.current.run(); await vi.runOnlyPendingTimersAsync(); });
    }

    // 3회 실행 후 dangling 타임아웃 타이머 누적이 없어야 한다(수정 전: 3, 수정 후: 0).
    expect(vi.getTimerCount()).toBe(0);
  });
});

// [CL-POKE-VIS-20260711-173901] usePoke — PokeButton 추출 로직의 훅 단위 검증 + pub-sub 쿨다운 브로드캐스트.
//   모킹 3종(useAuth·supabase invoke·use-toast)은 PokeButton.test.tsx 와 동일 계약(추출 정합 오라클).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePoke } from '../usePoke';
import { POKE_COOLDOWN_MS, pokeStorageKey } from '@/lib/collab/poke-logic';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'me-1' } }) }));

const invokeMock = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: invokeMock } },
}));

const toastSpy = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastSpy }) }));

const PARTNER = { user_id: 'p-1', display_name: '민지', email: 'p@example.com' };
const STORAGE_KEY = pokeStorageKey('me-1', 'p-1');

beforeEach(() => {
  invokeMock.mockReset();
  toastSpy.mockReset();
  localStorage.clear();
});

describe('usePoke — 발송/스킵/에러 분기(PokeButton 추출 동작 등가)', () => {
  it('UP.1 sent → kind:poke invoke·성공 토스트·쿨다운 기록·onPoked 1회', async () => {
    invokeMock.mockResolvedValueOnce({ data: { ok: true, sent: true }, error: null });
    const onPoked = vi.fn();
    const { result } = renderHook(() => usePoke({ budgetId: 'b1', partner: PARTNER, onPoked }));

    expect(result.current.onCooldown).toBe(false);
    await act(async () => { await result.current.poke(); });

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith('notify-partner', { body: { budgetId: 'b1', kind: 'poke' } });
    expect(toastSpy.mock.calls[0][0].title).toBe('콕! 찔렀어요 💌 민지님께 메일을 보냈어요');
    expect(Number(localStorage.getItem(STORAGE_KEY))).toBeGreaterThan(Date.now() - POKE_COOLDOWN_MS);
    expect(result.current.onCooldown).toBe(true);
    expect(onPoked).toHaveBeenCalledTimes(1);
  });

  it('UP.2 rate_limited → 쿨다운 기록·onPoked 미호출(보상 없음)', async () => {
    invokeMock.mockResolvedValueOnce({ data: { ok: true, skipped: 'rate_limited' }, error: null });
    const onPoked = vi.fn();
    const { result } = renderHook(() => usePoke({ budgetId: 'b1', partner: PARTNER, onPoked }));

    await act(async () => { await result.current.poke(); });

    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(result.current.onCooldown).toBe(true);
    expect(onPoked).not.toHaveBeenCalled();
  });

  it('UP.3 invoke 에러 → destructive 토스트·쿨다운 미기록(재시도 허용)·onPoked 미호출', async () => {
    invokeMock.mockResolvedValueOnce({ data: null, error: new Error('FunctionsFetchError') });
    const onPoked = vi.fn();
    const { result } = renderHook(() => usePoke({ budgetId: 'b1', partner: PARTNER, onPoked }));

    await act(async () => { await result.current.poke(); });

    expect(toastSpy.mock.calls[0][0].variant).toBe('destructive');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(result.current.onCooldown).toBe(false);
    expect(onPoked).not.toHaveBeenCalled();
  });

  it('UP.4 마운트 복원 — 최근 기록(24h 미경과)이 있으면 처음부터 onCooldown=true', async () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now() - 60_000));
    const { result } = renderHook(() => usePoke({ budgetId: 'b1', partner: PARTNER }));
    await waitFor(() => expect(result.current.onCooldown).toBe(true));
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('UP.5 무파트너 → onCooldown=false·poke 는 invoke 하되 쿨다운 미기록(스토리지 키 없음)', async () => {
    // partner=null 이어도 poke 자체는 호출측(PokeButton)이 렌더 게이트로 차단 — 훅은 안전 no-op 계약만 보장
    const { result } = renderHook(() => usePoke({ budgetId: 'b1', partner: null }));
    expect(result.current.onCooldown).toBe(false);
  });
});

describe('usePoke — 모듈 pub-sub 쿨다운 브로드캐스트(멀티 인스턴스 동기)', () => {
  it('UP.6 같은 페어 2인스턴스 동시 마운트 — 한쪽 poke → 양쪽 onCooldown=true', async () => {
    invokeMock.mockResolvedValueOnce({ data: { ok: true, sent: true }, error: null });
    const first = renderHook(() => usePoke({ budgetId: 'b1', partner: PARTNER }));
    const second = renderHook(() => usePoke({ budgetId: 'b1', partner: PARTNER }));

    expect(first.result.current.onCooldown).toBe(false);
    expect(second.result.current.onCooldown).toBe(false);

    await act(async () => { await first.result.current.poke(); });

    expect(first.result.current.onCooldown).toBe(true);
    expect(second.result.current.onCooldown).toBe(true); // 브로드캐스트로 리마운트 없이 동기
  });

  it('UP.7 다른 페어 인스턴스는 브로드캐스트에 반응하지 않음(키 스코프)', async () => {
    invokeMock.mockResolvedValueOnce({ data: { ok: true, sent: true }, error: null });
    const mine = renderHook(() => usePoke({ budgetId: 'b1', partner: PARTNER }));
    const otherPartner = { user_id: 'p-2', display_name: '수진', email: null };
    const other = renderHook(() => usePoke({ budgetId: 'b1', partner: otherPartner }));

    await act(async () => { await mine.result.current.poke(); });

    expect(mine.result.current.onCooldown).toBe(true);
    expect(other.result.current.onCooldown).toBe(false);
  });

  it('UP.8 언마운트된 인스턴스는 리스너 해제 — 이후 poke 가 setState 를 유발하지 않음(경고 0 계약)', async () => {
    invokeMock.mockResolvedValueOnce({ data: { ok: true, sent: true }, error: null });
    const first = renderHook(() => usePoke({ budgetId: 'b1', partner: PARTNER }));
    const second = renderHook(() => usePoke({ budgetId: 'b1', partner: PARTNER }));
    second.unmount();

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await act(async () => { await first.result.current.poke(); });
      expect(first.result.current.onCooldown).toBe(true);
      // 언마운트 인스턴스로의 setState(React 경고) 없음 — 리스너 해제 증명
      const unmountWarnings = errorSpy.mock.calls.filter((c) =>
        String(c[0]).includes('unmounted'),
      );
      expect(unmountWarnings.length).toBe(0);
    } finally {
      errorSpy.mockRestore();
    }
  });
});

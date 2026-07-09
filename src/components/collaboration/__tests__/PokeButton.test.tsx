// [CL-POKE-20260709-231909] PokeButton — 렌더 게이트·발송/스킵/에러 분기·낙관 쿨다운(localStorage)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, screen } from '@/test/test-utils';
import { PokeButton } from '../PokeButton';
import { POKE_COOLDOWN_MS, pokeStorageKey } from '@/lib/collab/poke-logic';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'me-1' } }) }));

// per-file supabase override — functions.invoke 만 제어(기존 CollaboratorManager.test 패턴)
const invokeMock = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: invokeMock } },
}));

// 토스트는 렌더 트리에 Toaster 가 없으므로 훅 스파이로 페이로드를 직접 단언
const toastSpy = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastSpy }) }));

const PARTNER = { user_id: 'p-1', display_name: '민지', email: 'p@example.com' };
const STORAGE_KEY = pokeStorageKey('me-1', 'p-1');

beforeEach(() => {
  invokeMock.mockReset();
  toastSpy.mockReset();
  localStorage.clear();
});

describe('PokeButton', () => {
  it('PK.1 무파트너 → 아무것도 렌더하지 않음(null)', () => {
    const { container } = renderWithProviders(<PokeButton budgetId="b1" partner={null} />);
    expect(container.querySelector('button')).toBeNull();
    expect(screen.queryByText('콕 찌르기')).toBeNull();
  });

  it('PK.2 sent → kind:poke 로 invoke·성공 토스트·localStorage 기록·비활성·onPoked 1회', async () => {
    invokeMock.mockResolvedValueOnce({ data: { ok: true, sent: true }, error: null });
    const onPoked = vi.fn();
    renderWithProviders(<PokeButton budgetId="b1" partner={PARTNER} onPoked={onPoked} />);

    const btn = screen.getByRole('button', { name: '파트너 민지님에게 콕 찌르기' });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);

    await waitFor(() => expect(toastSpy).toHaveBeenCalledTimes(1));
    // Edge 계약: budgetId 옆에 kind:'poke'
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith('notify-partner', { body: { budgetId: 'b1', kind: 'poke' } });
    // 성공 토스트(이름 개인화)
    expect(toastSpy.mock.calls[0][0].title).toBe('콕! 찔렀어요 💌 민지님께 메일을 보냈어요');
    // 낙관 쿨다운: localStorage 기록 + 버튼 비활성 + 서브텍스트
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(Number(localStorage.getItem(STORAGE_KEY))).toBeGreaterThan(Date.now() - POKE_COOLDOWN_MS);
    await waitFor(() => expect(btn).toBeDisabled());
    expect(screen.getByText('내일 다시 찌를 수 있어요 ⏰')).toBeInTheDocument();
    // 보상은 실발송 1회만
    expect(onPoked).toHaveBeenCalledTimes(1);
  });

  it('PK.3 rate_limited → 안내 토스트·쿨다운 기록·비활성·onPoked 미호출', async () => {
    invokeMock.mockResolvedValueOnce({ data: { ok: true, skipped: 'rate_limited' }, error: null });
    const onPoked = vi.fn();
    renderWithProviders(<PokeButton budgetId="b1" partner={PARTNER} onPoked={onPoked} />);

    const btn = screen.getByRole('button', { name: /콕 찌르기/ });
    fireEvent.click(btn);

    await waitFor(() => expect(toastSpy).toHaveBeenCalledTimes(1));
    expect(toastSpy.mock.calls[0][0].title).toBe('오늘은 이미 콕 찔렀어요 — 내일 다시!');
    expect(toastSpy.mock.calls[0][0].variant).toBeUndefined(); // 안내(비파괴) 톤
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();  // 서버가 슬롯 소진 확정 → 쿨다운 동기화
    await waitFor(() => expect(btn).toBeDisabled());
    expect(onPoked).not.toHaveBeenCalled();
  });

  it('PK.4 invoke 에러 → destructive 토스트·쿨다운 미기록·버튼 재활성(재시도 허용)·onPoked 미호출', async () => {
    invokeMock.mockResolvedValueOnce({ data: null, error: new Error('FunctionsFetchError') });
    const onPoked = vi.fn();
    renderWithProviders(<PokeButton budgetId="b1" partner={PARTNER} onPoked={onPoked} />);

    const btn = screen.getByRole('button', { name: /콕 찌르기/ });
    fireEvent.click(btn);

    await waitFor(() => expect(toastSpy).toHaveBeenCalledTimes(1));
    expect(toastSpy.mock.calls[0][0].variant).toBe('destructive');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();      // 일시 에러 → 쿨다운 미기록
    await waitFor(() => expect(btn).not.toBeDisabled());       // AsyncButton busy 해제 후 재시도 가능
    expect(screen.queryByText('내일 다시 찌를 수 있어요 ⏰')).toBeNull();
    expect(onPoked).not.toHaveBeenCalled();
  });

  it('PK.5 마운트 복원 — 최근 기록(24h 미경과)이 있으면 처음부터 비활성', async () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now() - 60_000)); // 1분 전 찌름
    renderWithProviders(<PokeButton budgetId="b1" partner={PARTNER} />);

    const btn = screen.getByRole('button', { name: /콕 찌르기/ });
    await waitFor(() => expect(btn).toBeDisabled());
    expect(screen.getByText('내일 다시 찌를 수 있어요 ⏰')).toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('PK.6 만료 기록(24h 경과)은 복원하지 않음 — 즉시 찌르기 가능', () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now() - POKE_COOLDOWN_MS - 1000));
    renderWithProviders(<PokeButton budgetId="b1" partner={PARTNER} />);
    expect(screen.getByRole('button', { name: /콕 찌르기/ })).not.toBeDisabled();
  });
});

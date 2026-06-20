// [CL-COEDIT-E2E-20260620-130000] AcceptInvite — 초대 수락 라운드트립(미로그인→구글→수락 분기)
// renderWithProviders(MemoryRouter) + useAuth/supabase.rpc 제어 모킹. 순수 분기는 invite-resume(17테스트)에서 별도 검증.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, currentPath } from '@/test/test-utils';
import { WORKSPACE_MODE_KEY } from '@/lib/collab/workspace';
import AcceptInvite from '../AcceptInvite';

// vi.mock 팩토리는 호이스팅되므로 제어 상태는 vi.hoisted 로 안전 주입
const h = vi.hoisted(() => ({
  auth: { user: null as null | { id: string }, loading: false, signInWithGoogle: vi.fn() },
  rpc: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => h.auth }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: h.rpc } }));

const VALID = 'tok_abcdef0123456789'; // 20자 [A-Za-z0-9_-] → 유효
const ROUTE = (t: string) => ({ route: `/invite/${t}`, routePath: '/invite/:token' });

beforeEach(() => {
  h.auth.user = null;
  h.auth.loading = false;
  h.auth.signInWithGoogle = vi.fn();
  h.rpc.mockReset();
  try { localStorage.clear(); } catch { /* noop */ }
});

describe('AcceptInvite (초대 수락 라운드트립)', () => {
  it('AI.1 토큰 형식 불량 → 에러 UI(유효하지 않은 초대)', async () => {
    renderWithProviders(<AcceptInvite />, ROUTE('x')); // 1자 < 16 → invalid
    expect(await screen.findByText('초대를 열 수 없어요')).toBeInTheDocument();
    expect(screen.getByText('유효하지 않은 초대 링크예요.')).toBeInTheDocument();
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it('AI.2 미로그인 → 토큰 stash 후 구글 로그인 호출(RPC 미호출)', async () => {
    h.auth.user = null;
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    await waitFor(() => expect(h.auth.signInWithGoogle).toHaveBeenCalledTimes(1));
    expect(h.rpc).not.toHaveBeenCalled();
    // 이동 중 — 'checking' 로더 유지
    expect(screen.getByText('초대를 확인하는 중...')).toBeInTheDocument();
  });

  it('AI.3 로그인 + accepted → /budget 이동 + 우리 모드 저장 + 토큰으로 RPC 호출', async () => {
    h.auth.user = { id: 'partner-1' };
    h.rpc.mockResolvedValue({ data: { status: 'accepted', budget_id: 'b-shared' }, error: null });
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    await waitFor(() => expect(currentPath()).toBe('/budget'));
    expect(h.rpc).toHaveBeenCalledWith('accept_budget_invitation', { p_token: VALID });
    expect(localStorage.getItem(WORKSPACE_MODE_KEY)).toBe('shared');
  });

  it('AI.4 로그인 + already_member → /budget 이동(멱등 성공)', async () => {
    h.auth.user = { id: 'partner-1' };
    h.rpc.mockResolvedValue({ data: { status: 'already_member', budget_id: 'b-shared' }, error: null });
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    await waitFor(() => expect(currentPath()).toBe('/budget'));
    expect(localStorage.getItem(WORKSPACE_MODE_KEY)).toBe('shared');
  });

  it('AI.5 로그인 + owner_cannot_accept → /budget 이동(본인 예산)', async () => {
    h.auth.user = { id: 'owner-1' };
    h.rpc.mockResolvedValue({ data: { status: 'owner_cannot_accept' }, error: null });
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    await waitFor(() => expect(currentPath()).toBe('/budget'));
    // owner 경로는 우리 모드 강제 저장 안 함
    expect(localStorage.getItem(WORKSPACE_MODE_KEY)).toBeNull();
  });

  it('AI.6 로그인 + expired → 에러 UI(만료)', async () => {
    h.auth.user = { id: 'partner-1' };
    h.rpc.mockResolvedValue({ data: { status: 'expired' }, error: null });
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    expect(await screen.findByText('초대를 열 수 없어요')).toBeInTheDocument();
    expect(screen.getByText(/만료된 초대 링크예요/)).toBeInTheDocument();
  });

  it('AI.7 로그인 + invalid_token → 에러 UI(이미 사용/무효)', async () => {
    h.auth.user = { id: 'partner-1' };
    h.rpc.mockResolvedValue({ data: { status: 'invalid_token' }, error: null });
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    expect(await screen.findByText('초대를 열 수 없어요')).toBeInTheDocument();
    expect(screen.getByText(/이미 사용되었거나 유효하지 않은/)).toBeInTheDocument();
  });

  it('AI.8 로그인 + RPC 에러 → 에러 UI(메시지 노출)', async () => {
    h.auth.user = { id: 'partner-1' };
    h.rpc.mockResolvedValue({ data: null, error: new Error('네트워크 오류') });
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    expect(await screen.findByText('초대를 열 수 없어요')).toBeInTheDocument();
    expect(screen.getByText('네트워크 오류')).toBeInTheDocument();
  });

  it('AI.9 인증 로딩 중 → 분기 보류(RPC/로그인 미호출)', async () => {
    h.auth.loading = true;
    h.auth.user = null;
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    // 로딩 게이트 — 어떤 분기도 실행되지 않음
    expect(h.rpc).not.toHaveBeenCalled();
    expect(h.auth.signInWithGoogle).not.toHaveBeenCalled();
    expect(screen.getByText('초대를 확인하는 중...')).toBeInTheDocument();
  });
});

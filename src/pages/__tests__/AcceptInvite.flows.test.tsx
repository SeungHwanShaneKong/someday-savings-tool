// [CL-COEDIT-QA200-20260620] AcceptInvite — 신규 엣지 플로우(기존 AI.1~9 비중복: null budget_id 안전 내비/RPC 형식 정규화/replace 내비/토큰 누락/throw catch/declined/네트워크 토스트/오너 모드 미저장)
//
// 기존 AcceptInvite.test.tsx(AI.1~9)와 중복 금지 — 본 파일은 컨트랙트(normalizeAcceptResult + AcceptInvite switch)의
// 미커버 분기/엣지만 검증한다. 분기 매핑은 invite-resume 컨트랙트에서 도출(impl 미러링 아님).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen, waitFor, within, fireEvent } from '@/test/test-utils';
import { WORKSPACE_MODE_KEY } from '@/lib/collab/workspace';
import { INVITE_TOKEN_KEY, INVITE_TS_KEY } from '@/lib/collab/invite-resume';

// vi.mock 팩토리는 호이스팅 → 제어 상태는 vi.hoisted 로 안전 주입
const h = vi.hoisted(() => ({
  auth: { user: null as null | { id: string }, loading: false, signInWithGoogle: vi.fn() },
  rpc: vi.fn(),
  toast: vi.fn(),
  navigate: vi.fn(),
  params: { token: undefined as string | undefined },
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => h.auth }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: h.rpc } }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: h.toast }) }));

// react-router-dom: useNavigate/useParams 만 스파이로 대체, 나머지(MemoryRouter/Routes/useLocation)는 실제 유지.
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => h.navigate,
    useParams: () => h.params,
  };
});

import AcceptInvite from '../AcceptInvite';

const VALID = 'tok_abcdef0123456789'; // 18자 [A-Za-z0-9_-] → 유효 형식
const ROUTE = (t: string) => ({ route: `/invite/${t}`, routePath: '/invite/:token' });

beforeEach(() => {
  h.auth.user = null;
  h.auth.loading = false;
  h.auth.signInWithGoogle = vi.fn();
  h.rpc.mockReset();
  h.toast.mockReset();
  h.navigate.mockReset();
  h.params.token = VALID; // 기본은 유효 토큰(개별 테스트가 override)
  try { localStorage.clear(); } catch { /* noop */ }
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AcceptInvite — 신규 엣지 플로우 [CL-COEDIT-QA200-20260620]', () => {
  // ── INV.B/E: budget_id=null 수락도 /budget 으로 안전 내비(컴포넌트는 budgetId 로 라우팅하지 않음) ──
  it('QF.1 accepted + budget_id 누락 → 여전히 /budget 으로 안전 내비 + shared 저장', async () => {
    h.auth.user = { id: 'partner-1' };
    h.rpc.mockResolvedValue({ data: { status: 'accepted' }, error: null }); // budget_id 없음
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith('/budget', { replace: true }));
    expect(localStorage.getItem(WORKSPACE_MODE_KEY)).toBe('shared');
    // 토큰 정규화는 status 그대로 사용 — RPC 는 정확한 토큰으로 1회만 호출
    expect(h.rpc).toHaveBeenCalledTimes(1);
    expect(h.rpc).toHaveBeenCalledWith('accept_budget_invitation', { p_token: VALID });
  });

  // ── 내비게이션은 항상 replace:true(뒤로가기 시 /invite 재진입 방지) ──
  it('QF.2 성공 내비는 replace:true 옵션을 사용한다(히스토리 오염 방지)', async () => {
    h.auth.user = { id: 'partner-1' };
    h.rpc.mockResolvedValue({ data: { status: 'accepted', budget_id: 'b-1' }, error: null });
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    await waitFor(() => expect(h.navigate).toHaveBeenCalledTimes(1));
    const [, opts] = h.navigate.mock.calls[0];
    expect(opts).toEqual({ replace: true });
  });

  // ── RPC 형식 정규화: { ok:true } (status 필드 없음) → accepted 로 정규화 ──
  it('QF.3 RPC 가 { ok:true, budget_id } 형식 반환 → accepted 정규화 → /budget + shared', async () => {
    h.auth.user = { id: 'partner-1' };
    h.rpc.mockResolvedValue({ data: { ok: true, budget_id: 'b-ok' }, error: null });
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith('/budget', { replace: true }));
    expect(localStorage.getItem(WORKSPACE_MODE_KEY)).toBe('shared');
  });

  // ── RPC 형식 정규화: { ok:false, error:'expired' } → 만료 에러 UI ──
  it('QF.4 RPC 가 { ok:false, error:"expired" } 형식 반환 → 만료 에러 UI(내비 없음)', async () => {
    h.auth.user = { id: 'partner-1' };
    h.rpc.mockResolvedValue({ data: { ok: false, error: 'token_expired' }, error: null });
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    expect(await screen.findByText('초대를 열 수 없어요')).toBeInTheDocument();
    expect(screen.getByText(/만료된 초대 링크예요/)).toBeInTheDocument();
    expect(h.navigate).not.toHaveBeenCalled();
    expect(localStorage.getItem(WORKSPACE_MODE_KEY)).toBeNull();
  });

  // ── RPC 형식 정규화: 배열 반환(table-returning RPC 오용) → 알 수 없는 응답 에러 ──
  it('QF.5 RPC 가 배열을 반환 → "알 수 없는 응답" 에러 UI(크래시 없음)', async () => {
    h.auth.user = { id: 'partner-1' };
    h.rpc.mockResolvedValue({ data: [{ status: 'accepted' }], error: null }); // 배열: d.status 미접근
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    expect(await screen.findByText('초대를 열 수 없어요')).toBeInTheDocument();
    expect(screen.getByText('알 수 없는 응답이에요')).toBeInTheDocument();
    expect(h.navigate).not.toHaveBeenCalled();
  });

  // ── declined 등 미지정 status → 알 수 없는 응답(기본 분기, budgetId 없음) ──
  it('QF.6 RPC 가 { status:"declined" }(미지정) → "알 수 없는 응답" 에러 UI', async () => {
    h.auth.user = { id: 'partner-1' };
    h.rpc.mockResolvedValue({ data: { status: 'declined' }, error: null });
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    expect(await screen.findByText('초대를 열 수 없어요')).toBeInTheDocument();
    expect(screen.getByText('알 수 없는 응답이에요')).toBeInTheDocument();
  });

  // ── 미지정 status + budget_id 존재 → accepted 로 폴백(컨트랙트: budgetId 있으면 성공) ──
  it('QF.7 RPC 가 미지정 status 라도 budget_id 존재 → accepted 폴백 → /budget + shared', async () => {
    h.auth.user = { id: 'partner-1' };
    h.rpc.mockResolvedValue({ data: { status: 'mystery', budget_id: 'b-fallback' }, error: null });
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith('/budget', { replace: true }));
    expect(localStorage.getItem(WORKSPACE_MODE_KEY)).toBe('shared');
  });

  // ── already_accepted 별칭 → already_member 처리(멱등 재진입) → /budget + shared ──
  it('QF.8 already_accepted 별칭 status → already_member 처리(재진입 멱등) → /budget + shared', async () => {
    h.auth.user = { id: 'partner-1' };
    h.rpc.mockResolvedValue({ data: { status: 'already_accepted', budget_id: 'b-shared' }, error: null });
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith('/budget', { replace: true }));
    expect(localStorage.getItem(WORKSPACE_MODE_KEY)).toBe('shared');
  });

  // ── owner 분기: ok:false + error:'owner...' 형식도 owner 로 정규화, shared 미저장(본인 예산) ──
  it('QF.9 owner 분기(error:"owner_cannot_accept")는 shared 모드를 저장하지 않는다', async () => {
    h.auth.user = { id: 'owner-1' };
    h.rpc.mockResolvedValue({ data: { ok: false, error: 'owner_cannot_accept' }, error: null });
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith('/budget', { replace: true }));
    // 오너는 우리 모드 강제 저장 금지(개인 예산 절대 비동기화 원칙)
    expect(localStorage.getItem(WORKSPACE_MODE_KEY)).toBeNull();
  });

  // ── expired vs invalid 메시지 구분: invalid 는 "이미 사용/무효" 메시지여야 한다(만료 아님) ──
  it('QF.10 invalid_token 은 "이미 사용/무효" 메시지(만료 메시지와 구분된다)', async () => {
    h.auth.user = { id: 'partner-1' };
    h.rpc.mockResolvedValue({ data: { status: 'invalid_token' }, error: null });
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    expect(await screen.findByText('초대를 열 수 없어요')).toBeInTheDocument();
    expect(screen.getByText(/이미 사용되었거나 유효하지 않은/)).toBeInTheDocument();
    // 만료 문구는 나타나지 않아야 함(메시지 구분 검증)
    expect(screen.queryByText(/만료된 초대 링크예요/)).not.toBeInTheDocument();
  });

  // ── 토큰 param 누락(/invite/ — useParams().token=undefined) → invalid 에러 UI, RPC/로그인 미호출 ──
  it('QF.11 토큰 param 자체가 undefined → 유효하지 않은 초대 에러(RPC·로그인 미호출)', async () => {
    h.auth.user = { id: 'partner-1' }; // 로그인돼 있어도 토큰 없으면 invalid 가 우선
    h.params.token = undefined; // useParams 가 토큰 미해상(예: /invite/ 빈 세그먼트)
    // 라우트는 매칭되도록 유효 세그먼트로 마운트하되, 토큰 해상은 mocked useParams=undefined 가 결정
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    expect(await screen.findByText('초대를 열 수 없어요')).toBeInTheDocument();
    expect(screen.getByText('유효하지 않은 초대 링크예요.')).toBeInTheDocument();
    expect(h.rpc).not.toHaveBeenCalled();
    expect(h.auth.signInWithGoogle).not.toHaveBeenCalled();
  });

  // ── 에러 화면의 "내 예산으로 가기" 버튼도 replace:true 로 /budget 내비 ──
  it('QF.12 에러 화면의 "내 예산으로 가기" 버튼 → /budget replace:true 내비', async () => {
    h.auth.user = { id: 'partner-1' };
    h.rpc.mockResolvedValue({ data: { status: 'expired' }, error: null });
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    const heading = await screen.findByText('초대를 열 수 없어요');
    const card = heading.closest('div')?.parentElement as HTMLElement;
    const btn = within(card).getByRole('button', { name: /내 예산으로 가기/ });
    h.navigate.mockClear(); // 진입 단계 내비(없음)와 분리
    fireEvent.click(btn);
    expect(h.navigate).toHaveBeenCalledWith('/budget', { replace: true });
  });

  // ── 인증 로딩 중에는 토큰이 유효해도 RPC 미호출(로딩 게이트) — AI.9 와 달리 로그인 user 가 있는 케이스 ──
  it('QF.13 로그인 user 가 있어도 loading=true 면 RPC 보류(로딩 게이트가 user 보다 우선)', async () => {
    h.auth.user = { id: 'partner-1' };
    h.auth.loading = true;
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    // 로딩 확정 전에는 어떤 분기(수락 RPC)도 실행 금지
    expect(h.rpc).not.toHaveBeenCalled();
    expect(h.navigate).not.toHaveBeenCalled();
    expect(screen.getByText('초대를 확인하는 중...')).toBeInTheDocument();
  });

  // ── 미로그인 stash: 토큰과 timestamp 가 sessionStorage 에 결정론적으로 보존된다(fake timer) ──
  it('QF.14 미로그인 → 토큰+timestamp 를 sessionStorage 에 stash(결정론적 시각)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-20T00:00:00Z'));
    h.auth.user = null;
    try { sessionStorage.clear(); } catch { /* noop */ }
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    // signInWithGoogle 동기 호출(effect 내부) — 실타이머 없이 즉시 단언
    expect(h.auth.signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(INVITE_TOKEN_KEY)).toBe(VALID);
    expect(sessionStorage.getItem(INVITE_TS_KEY)).toBe(String(Date.parse('2026-06-20T00:00:00Z')));
    expect(h.rpc).not.toHaveBeenCalled();
  });

  // ── 네트워크 error(rpc 가 {data,error} 로 에러 반환) → 에러 토스트는 띄우지 않고 에러 UI 로(컨트랙트: 성공만 toast) ──
  it('QF.15 RPC error 결과 → 에러 UI(성공 토스트는 호출되지 않음)', async () => {
    h.auth.user = { id: 'partner-1' };
    h.rpc.mockResolvedValue({ data: null, error: new Error('네트워크 연결 실패') });
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    expect(await screen.findByText('초대를 열 수 없어요')).toBeInTheDocument();
    expect(screen.getByText('네트워크 연결 실패')).toBeInTheDocument();
    // 성공 경로 토스트는 절대 호출 금지
    expect(h.toast).not.toHaveBeenCalled();
    expect(h.navigate).not.toHaveBeenCalled();
  });

  // ── 성공 시 참여 안내 toast 가 정확히 1회, 올바른 카피로 호출된다 ──
  it('QF.16 accepted → 참여 안내 toast 1회(올바른 카피)', async () => {
    h.auth.user = { id: 'partner-1' };
    h.rpc.mockResolvedValue({ data: { status: 'accepted', budget_id: 'b-1' }, error: null });
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    await waitFor(() => expect(h.toast).toHaveBeenCalledTimes(1));
    const arg = h.toast.mock.calls[0][0] as { title?: string };
    expect(arg.title).toContain('공동 예산에 참여했어요');
  });

  // ── [CL-COEDIT-QA200-FIX-20260620] FIXED: 수락 IIFE 를 try/catch 로 감싸 rpc reject 도 에러 UI 로 전환. ──
  it('QF.17 rpc 가 reject(throw) 시 에러 UI 로 전환된다', async () => {
    // BUG[CL-COEDIT-QA200-20260620]: AcceptInvite 의 async IIFE 가 `await supabase.rpc(...)` 를
    // try/catch 로 감싸지 않아, rpc 가 reject 하면 unhandled rejection + phase='accepting' 영구 고착.
    // 올바른 동작은 reject 도 normalize/catch 하여 에러 UI 노출.
    h.auth.user = { id: 'partner-1' };
    h.rpc.mockRejectedValue(new Error('RPC 통신 예외') as Error);
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    expect(await screen.findByText('초대를 열 수 없어요')).toBeInTheDocument();
  });
});

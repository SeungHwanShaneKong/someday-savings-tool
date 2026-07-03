// [CL-TOP20-P4-COLLAB-20260703-040000] AcceptInvite — 수락 축하 화면(phase='celebration') 계약 검증.
//  기존 AI.1~9/QF.1~17/FI.1~5 와 비중복: 축하 화면 노출→자동 이동, 버튼 즉시 이동+내비 1회 가드,
//  reduced-motion 정적 분기(자동 이동 없음·파티클 없음), owner 미경유.
//  useNavigate 스파이(flows 패턴) → 호출 횟수/인자 정밀 단언.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen, waitFor, fireEvent } from '@/test/test-utils';
import { WORKSPACE_MODE_KEY } from '@/lib/collab/workspace';
import { ACCEPT_CELEBRATION_MS } from '@/components/collaboration/AcceptCelebration';

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
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => h.navigate, useParams: () => h.params };
});

import AcceptInvite from '../AcceptInvite';

const VALID = 'tok_abcdef0123456789';
const ROUTE = (t: string) => ({ route: `/invite/${t}`, routePath: '/invite/:token' });
const CELEBRATION_COPY = /두 분이 함께 준비하게 됐어요/;
const CTA = /우리 예산 보러 가기/;

// setup.ts 의 기본 matchMedia(matches:false)를 테스트별로 덮어쓰고 원복
const originalMatchMedia = window.matchMedia;
const setReducedMotion = (on: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: on && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
};

beforeEach(() => {
  h.auth.user = { id: 'partner-1' };
  h.auth.loading = false;
  h.auth.signInWithGoogle = vi.fn();
  h.rpc.mockReset();
  h.toast.mockReset();
  h.navigate.mockReset();
  h.params.token = VALID;
  try { localStorage.clear(); } catch { /* noop */ }
});

afterEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: originalMatchMedia,
  });
});

describe('AcceptInvite — 수락 축하 화면 [CL-TOP20-P4-COLLAB-20260703-040000]', () => {
  it('CB.1 accepted → 축하 화면(카피·버튼) 노출 후 자동 /budget 이동(replace) + 토스트/shared 계약 불변', async () => {
    h.rpc.mockResolvedValue({ data: { status: 'accepted', budget_id: 'b-1' }, error: null });
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));

    // phase 전이: accepting → celebration (축하 화면이 먼저, 내비는 아직)
    expect(await screen.findByText(CELEBRATION_COPY)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: CTA })).toBeInTheDocument();
    expect(h.navigate).not.toHaveBeenCalled();
    // 기존 계약 보존: 성공 토스트 1회 + shared 모드 저장
    expect(h.toast).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(WORKSPACE_MODE_KEY)).toBe('shared');

    // 자동 이동(비 reduced-motion): ACCEPT_CELEBRATION_MS 후 replace 내비 정확히 1회
    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith('/budget', { replace: true }));
    expect(h.navigate).toHaveBeenCalledTimes(1);
  });

  it('CB.2 already_member(멱등 재수락)도 축하 화면 경유 후 자동 이동', async () => {
    h.rpc.mockResolvedValue({ data: { status: 'already_member', budget_id: 'b-1' }, error: null });
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    expect(await screen.findByText(CELEBRATION_COPY)).toBeInTheDocument();
    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith('/budget', { replace: true }));
  });

  it('CB.3 버튼 클릭 → 즉시 이동 + 이후 자동 타이머가 겹쳐도 내비 총 1회(중복 가드)', async () => {
    h.rpc.mockResolvedValue({ data: { status: 'accepted', budget_id: 'b-1' }, error: null });
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));

    const btn = await screen.findByRole('button', { name: CTA });
    fireEvent.click(btn);
    expect(h.navigate).toHaveBeenCalledTimes(1);
    expect(h.navigate).toHaveBeenCalledWith('/budget', { replace: true });

    // 자동 이동 타이머 창이 지나도 중복 내비 없음(navigatedRef 1회 가드)
    await new Promise((r) => setTimeout(r, ACCEPT_CELEBRATION_MS + 200));
    expect(h.navigate).toHaveBeenCalledTimes(1);
  });

  it('CB.4 reduced-motion → 정적 카드(파티클 0)+즉시 버튼, 자동 이동 없음 → 버튼으로만 이동', async () => {
    setReducedMotion(true);
    h.rpc.mockResolvedValue({ data: { status: 'accepted', budget_id: 'b-1' }, error: null });
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));

    expect(await screen.findByText(CELEBRATION_COPY)).toBeInTheDocument();
    // 정적 폴백: 파티클/자동이동 안내 문구 없음
    expect(document.querySelector('.celebration-particle')).toBeNull();
    expect(screen.queryByText(/잠시 후 자동으로 이동해요/)).toBeNull();

    // 자동 이동 창을 넘겨도 내비 없음(사용자 제어 우선)
    await new Promise((r) => setTimeout(r, ACCEPT_CELEBRATION_MS + 200));
    expect(h.navigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: CTA }));
    expect(h.navigate).toHaveBeenCalledTimes(1);
    expect(h.navigate).toHaveBeenCalledWith('/budget', { replace: true });
  });

  it('CB.5 owner(본인 예산)는 축하 화면 미경유 — 즉시 /budget(기존 동작 회귀 0)', async () => {
    h.rpc.mockResolvedValue({ data: { status: 'owner_cannot_accept' }, error: null });
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith('/budget', { replace: true }));
    expect(screen.queryByText(CELEBRATION_COPY)).toBeNull();
  });
});

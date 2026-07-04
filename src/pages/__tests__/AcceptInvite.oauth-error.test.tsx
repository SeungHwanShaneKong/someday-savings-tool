// [CL-VULN-R10-20260704 | 핵심] AcceptInvite — login-required 분기 OAuth 개시 실패 처리(회귀 방지).
//
// 결함: useAuth.signInWithGoogle 은 throw 가 아니라 {error} 를 resolve 한다. 기존 `void signInWithGoogle()`
//       은 반환 error 를 버려, OAuth 개시가 실패(리다이렉트 미발생)하면 phase='checking' 에 영구 고착
//       (ranRef=true 라 재실행도 안 됨) → 사용자에겐 '초대를 확인하는 중...' 무한 스피너.
// 계약: 일반 브라우저 + 미로그인 + 유효 토큰에서 signInWithGoogle 이 {error} 로 실패하면
//       phase='error' 로 전환하고 에러 UI(제목 + 안내 문구)를 노출해야 한다(무한 로딩 금지).
// 격리: kakao-browser·useAuth·supabase 를 hoisted 홀더로 모킹(AcceptInvite.inapp.test.tsx 패턴 재사용).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import AcceptInvite from '../AcceptInvite';

const h = vi.hoisted(() => ({
  auth: { user: null as null | { id: string }, loading: false, signInWithGoogle: vi.fn() },
  rpc: vi.fn(),
  browser: { isInAppBrowser: false, detectedApp: null as string | null, isIOS: false, isAndroid: false },
  openExternal: vi.fn((_url?: string, _onFallback?: () => void) => {}),
  copy: vi.fn(async (_t?: string) => true),
  guide: { steps: ['오른쪽 위 ⋮ 메뉴를 누르세요', '다른 브라우저로 열기를 선택하세요'] },
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => h.auth }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: h.rpc } }));
vi.mock('@/lib/kakao-browser', () => ({
  getBrowserInfo: () => h.browser,
  openInExternalBrowserWithFallback: (url: string, onFallback: () => void) => h.openExternal(url, onFallback),
  getAppSpecificGuide: () => h.guide,
  copyToClipboard: (t: string) => h.copy(t),
}));

const VALID = 'tok_abcdef0123456789';
const ROUTE = (t: string) => ({ route: `/invite/${t}`, routePath: '/invite/:token' });

beforeEach(() => {
  h.auth.user = null;
  h.auth.loading = false;
  h.auth.signInWithGoogle = vi.fn();
  h.rpc.mockReset();
  // 일반(비인앱) 브라우저 — 인앱 분기는 건드리지 않고 login-required OAuth 경로만 검증
  h.browser = { isInAppBrowser: false, detectedApp: null, isIOS: false, isAndroid: false };
  h.openExternal = vi.fn((_url?: string, _onFallback?: () => void) => {});
  h.copy = vi.fn(async (_t?: string) => true);
  try { sessionStorage.clear(); } catch { /* noop */ }
});

describe('AcceptInvite — login-required OAuth 개시 실패 처리(R10)', () => {
  it('OE.1 미로그인 + 유효 토큰 + signInWithGoogle 이 {error} resolve → 에러 UI 전환(무한 로딩 아님)', async () => {
    // signInWithGoogle 이 throw 가 아니라 {error} 로 실패(예: Supabase OAuth 개시 실패)
    h.auth.signInWithGoogle = vi.fn(async () => ({ error: new Error('init fail') }));

    renderWithProviders(<AcceptInvite />, ROUTE(VALID));

    // signInWithGoogle 은 호출되지만 error 를 반환 → 리다이렉트가 발생하지 않음
    await waitFor(() => expect(h.auth.signInWithGoogle).toHaveBeenCalledTimes(1));
    // 인앱 브라우저 분기는 타지 않음(일반 브라우저)
    expect(h.openExternal).not.toHaveBeenCalled();

    // 핵심 단언: phase='error' 로 전환되어 에러 UI 노출(기존 코드에선 'checking' 무한 고착 → 실패)
    expect(await screen.findByText('초대를 열 수 없어요')).toBeInTheDocument();
    expect(screen.getByText('로그인을 시작하지 못했어요. 잠시 후 다시 시도해주세요.')).toBeInTheDocument();

    // 무한 로딩 스피너 문구가 사라졌음을 확인(고착되지 않았다는 반대 증거)
    expect(screen.queryByText('초대를 확인하는 중...')).not.toBeInTheDocument();
  });

  it('OE.2 signInWithGoogle 이 {error:null} 로 성공(정상 리다이렉트 개시) → 에러 UI 미노출(로딩 유지)', async () => {
    // 정상 경로: OAuth 개시 성공 → 페이지는 리다이렉트를 기다리며 'checking' 스피너 유지, 에러 UI 없음
    h.auth.signInWithGoogle = vi.fn(async () => ({ error: null }));

    renderWithProviders(<AcceptInvite />, ROUTE(VALID));

    await waitFor(() => expect(h.auth.signInWithGoogle).toHaveBeenCalledTimes(1));
    // 성공 경로에선 에러 UI 로 전환되면 안 됨(정상 리다이렉트 경로 보존 회귀 가드)
    await waitFor(() => expect(screen.getByText('초대를 확인하는 중...')).toBeInTheDocument());
    expect(screen.queryByText('초대를 열 수 없어요')).not.toBeInTheDocument();
    expect(h.openExternal).not.toHaveBeenCalled();
  });
});

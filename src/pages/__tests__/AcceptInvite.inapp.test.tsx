// [CL-COEDIT-INAPP-INVITE-20260620] AcceptInvite — 인앱브라우저(카톡 등) Google OAuth 403 회피(F3).
//
// 계약: login-required 시 (1) 인앱브라우저면 signInWithGoogle 호출 금지 + openInExternalBrowserWithFallback(외부 탈출)
//       (2) 일반 브라우저면 signInWithGoogle 정상 (3) 자동 탈출 실패(onFallback) 시 브릿지 UI(외부열기/복사/안내) 노출.
// 격리: kakao-browser·useAuth·supabase 를 hoisted 홀더로 모킹. 순수 분기는 invite-resume 가 별도 검증.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/react';
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
  h.browser = { isInAppBrowser: false, detectedApp: null, isIOS: false, isAndroid: false };
  h.openExternal = vi.fn((_url?: string, _onFallback?: () => void) => {});
  h.copy = vi.fn(async (_t?: string) => true);
  try { sessionStorage.clear(); } catch { /* noop */ }
});

describe('AcceptInvite — 인앱브라우저 OAuth 차단 회피(F3)', () => {
  it('FI.1 인앱브라우저 + 미로그인 → signInWithGoogle 미호출, 외부 브라우저 탈출 호출', async () => {
    h.browser.isInAppBrowser = true;
    h.browser.detectedApp = '카카오톡';
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));

    await waitFor(() => expect(h.openExternal).toHaveBeenCalledTimes(1));
    // 핵심: 인앱에선 Google OAuth(403 disallowed_useragent) 직접 호출 금지
    expect(h.auth.signInWithGoogle).not.toHaveBeenCalled();
    // 외부 탈출은 현재 페이지(동일 초대 URL — 토큰 보존)로. window.location.href 는 다른 스위트가
    // 전역 오버라이드할 수 있으므로(테스트 격리) 동일 전역값과 비교해 오염-무관하게 검증.
    expect(h.openExternal.mock.calls[0][0]).toBe(window.location.href);
  });

  it('FI.2 일반 브라우저 + 미로그인 → signInWithGoogle 정상, 외부 탈출 미호출', async () => {
    h.browser.isInAppBrowser = false;
    renderWithProviders(<AcceptInvite />, ROUTE(VALID));

    await waitFor(() => expect(h.auth.signInWithGoogle).toHaveBeenCalledTimes(1));
    expect(h.openExternal).not.toHaveBeenCalled();
  });

  it('FI.3 인앱 + 자동 탈출 실패(onFallback) → 브릿지 UI(외부열기·복사·앱안내) 노출', async () => {
    h.browser = { isInAppBrowser: true, detectedApp: '카카오톡', isIOS: true, isAndroid: false };
    // 자동 탈출이 실패하면 onFallback 을 호출해 브릿지 UI 로 전환
    h.openExternal = vi.fn((_url?: string, onFallback?: () => void) => onFallback?.());

    renderWithProviders(<AcceptInvite />, ROUTE(VALID));

    expect(await screen.findByText('외부 브라우저에서 열어주세요')).toBeInTheDocument();
    expect(screen.getByText(/외부 브라우저로 열기/)).toBeInTheDocument();
    expect(screen.getByText(/초대 링크 복사/)).toBeInTheDocument();
    // 앱별 안내 스텝 노출
    expect(screen.getByText(/다른 브라우저로 열기를 선택/)).toBeInTheDocument();
  });

  it('FI.4 브릿지 "초대 링크 복사" 클릭 → copyToClipboard 호출', async () => {
    h.browser = { isInAppBrowser: true, detectedApp: '카카오톡', isIOS: true, isAndroid: false };
    h.openExternal = vi.fn((_url?: string, onFallback?: () => void) => onFallback?.());

    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    const copyBtn = await screen.findByText(/초대 링크 복사/);
    fireEvent.click(copyBtn);
    await waitFor(() => expect(h.copy).toHaveBeenCalledTimes(1));
  });

  it('FI.5 로그인 상태(인앱이어도) → 외부 탈출/로그인 없이 수락 RPC 진행', async () => {
    h.browser.isInAppBrowser = true;
    h.auth.user = { id: 'partner-1' };
    h.rpc.mockResolvedValue({ data: { status: 'accepted', budget_id: 'b1' }, error: null });

    renderWithProviders(<AcceptInvite />, ROUTE(VALID));
    await waitFor(() => expect(h.rpc).toHaveBeenCalledWith('accept_budget_invitation', { p_token: VALID }));
    expect(h.openExternal).not.toHaveBeenCalled();
    expect(h.auth.signInWithGoogle).not.toHaveBeenCalled();
  });
});

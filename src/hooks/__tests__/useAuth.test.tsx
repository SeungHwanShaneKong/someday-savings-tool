// [CL-COEDIT-QA200-20260620] useAuth/AuthProvider 단위 검증 — OAuth 인자·세션 라이프사이클 계약 고정
//
// 왜: useAuth 는 앱 전역 인증 진실원. 계약(LOG.A/B/C/G/H)을 유닛으로 못박아 회귀 차단.
//   - signInWithGoogle → signInWithOAuth({provider:'google', options:{redirectTo: origin+'/auth'}}) 인자 정확
//     ([CL-OAUTH-LOVABLE-BROKER-20260613] Supabase 네이티브 OAuth 교체분의 핵심 회귀 가드)
//   - onAuthStateChange 콜백: SIGNED_IN→user set / SIGNED_OUT→null / TOKEN_REFRESHED / INITIAL_SESSION
//   - mount: 리스너 등록 FIRST → getSession() 복원, loading true→false
//   - unmount: subscription.unsubscribe()
// 격리: supabase 클라이언트는 setup.ts 전역 mock(auth no-op). 여기선 auth.* 를 테이블별이 아니라
//   메서드별로 vi.mocked 오버라이드하고, onAuthStateChange 콜백을 캡처해 직접 호출한다.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

// --- 픽스처: 최소 User/Session (Supabase 타입 만족용 캐스트) ---------------------
function makeUser(id = 'user-1', email = 'a@b.com'): User {
  return {
    id,
    email,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-06-20T00:00:00Z',
  } as User;
}
function makeSession(user: User = makeUser()): Session {
  return {
    access_token: 'access-tok',
    refresh_token: 'refresh-tok',
    expires_in: 3600,
    token_type: 'bearer',
    user,
  } as Session;
}

// onAuthStateChange 콜백 캡처용 홀더 + per-test 구독 스파이.
type AuthCb = (event: AuthChangeEvent, session: Session | null) => void;
let capturedCb: AuthCb | null = null;
let unsubscribeSpy: ReturnType<typeof vi.fn>;

// renderHook 래퍼: useAuth 는 AuthProvider 밖에서 throw → 항상 Provider 로 감싼다.
function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

beforeEach(() => {
  capturedCb = null;
  unsubscribeSpy = vi.fn();

  // onAuthStateChange: 콜백을 캡처하고, per-test 새 subscription 반환(unsubscribe 격리)
  vi.mocked(supabase.auth.onAuthStateChange).mockImplementation(
    ((cb: AuthCb) => {
      capturedCb = cb;
      return { data: { subscription: { id: 'sub-1', callback: cb, unsubscribe: unsubscribeSpy } } };
    }) as unknown as typeof supabase.auth.onAuthStateChange,
  );

  // getSession: 기본은 세션 없음(복원할 게 없음). 개별 테스트가 mockResolvedValueOnce 로 덮어씀.
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: null },
    error: null,
  } as Awaited<ReturnType<typeof supabase.auth.getSession>>);

  vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
    data: { provider: 'google', url: 'https://accounts.google.com/x' },
    error: null,
  } as Awaited<ReturnType<typeof supabase.auth.signInWithOAuth>>);

  vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
    data: { user: null, session: null },
    error: null,
  } as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>);

  vi.mocked(supabase.auth.signUp).mockResolvedValue({
    data: { user: null, session: null },
    error: null,
  } as Awaited<ReturnType<typeof supabase.auth.signUp>>);

  vi.mocked(supabase.auth.signOut).mockResolvedValue({
    error: null,
  } as Awaited<ReturnType<typeof supabase.auth.signOut>>);
});

afterEach(() => {
  vi.clearAllMocks();
});

// 마운트 직후 getSession() 의 비동기 .then 이 loading=false 로 정착할 때까지 대기.
async function renderSettled() {
  const view = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

describe('useAuth — Provider 가드 / 초기 라이프사이클 (LOG.G/H)', () => {
  it('A1. AuthProvider 밖에서 호출하면 throw (계약 가드)', () => {
    // wrapper 없이 렌더 → useContext === undefined → throw
    expect(() => renderHook(() => useAuth())).toThrow(/within an AuthProvider/);
  });

  it('A2. 마운트 시 onAuthStateChange 가 getSession 보다 FIRST 로 등록된다', async () => {
    const order: string[] = [];
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation(
      ((cb: AuthCb) => {
        order.push('onAuthStateChange');
        capturedCb = cb;
        return { data: { subscription: { id: 's', callback: cb, unsubscribe: unsubscribeSpy } } };
      }) as unknown as typeof supabase.auth.onAuthStateChange,
    );
    vi.mocked(supabase.auth.getSession).mockImplementation((async () => {
      order.push('getSession');
      return { data: { session: null }, error: null };
    }) as typeof supabase.auth.getSession);

    const { result } = renderHook(() => useAuth(), { wrapper });
    // 리스너 먼저 → 세션 조회 (실시간 이벤트 유실 방지 순서 계약)
    expect(order).toEqual(['onAuthStateChange', 'getSession']);
    // getSession 비동기 정착까지 흘려보내 act 경고 제거
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('A3. 초기 loading 은 true 였다가 getSession 정착 후 false 로 내려간다 (LOG.H)', async () => {
    let resolveSession: (v: { data: { session: Session | null }; error: null }) => void = () => {};
    vi.mocked(supabase.auth.getSession).mockImplementation(
      (() => new Promise((res) => { resolveSession = res; })) as typeof supabase.auth.getSession,
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    // getSession 미정착 + 콜백 미발화 → 아직 loading
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveSession({ data: { session: null }, error: null });
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('A4. getSession 이 기존 세션을 돌려주면 user/session 복원 (LOG.G)', async () => {
    const user = makeUser('restored-user');
    const session = makeSession(user);
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session },
      error: null,
    } as Awaited<ReturnType<typeof supabase.auth.getSession>>);

    const { result } = await renderSettled();
    expect(result.current.user?.id).toBe('restored-user');
    expect(result.current.session?.access_token).toBe('access-tok');
  });

  it('A5. 세션 없이 마운트되면 user/session 은 null, loading=false', async () => {
    const { result } = await renderSettled();
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('A6. 언마운트 시 subscription.unsubscribe() 호출 (누수 방지)', async () => {
    const { unmount } = await renderSettled();
    expect(unsubscribeSpy).not.toHaveBeenCalled();
    unmount();
    expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
  });
});

describe('useAuth — onAuthStateChange 콜백 라우팅 (LOG.B/C)', () => {
  it('B1. SIGNED_IN 이벤트 → user/session 세팅 + loading=false', async () => {
    const { result } = await renderSettled();
    const session = makeSession(makeUser('signed-in-user'));

    act(() => {
      capturedCb?.('SIGNED_IN', session);
    });

    expect(result.current.user?.id).toBe('signed-in-user');
    expect(result.current.session).toBe(session);
    expect(result.current.loading).toBe(false);
  });

  it('B2. SIGNED_OUT 이벤트(session=null) → user/session 모두 null 로 clear', async () => {
    // 먼저 로그인 상태로 만들고
    const { result } = await renderSettled();
    act(() => { capturedCb?.('SIGNED_IN', makeSession(makeUser('u'))); });
    expect(result.current.user).not.toBeNull();

    // SIGNED_OUT → null
    act(() => { capturedCb?.('SIGNED_OUT', null); });
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('B3. TOKEN_REFRESHED → 새 세션으로 교체(user 동일, access_token 갱신)', async () => {
    const { result } = await renderSettled();
    const user = makeUser('persist-user');
    act(() => { capturedCb?.('SIGNED_IN', makeSession(user)); });

    const refreshed = { ...makeSession(user), access_token: 'access-tok-2' } as Session;
    act(() => { capturedCb?.('TOKEN_REFRESHED', refreshed); });

    expect(result.current.user?.id).toBe('persist-user');
    expect(result.current.session?.access_token).toBe('access-tok-2');
  });

  it('B4. INITIAL_SESSION(session 보유) → user 세팅 + loading 해제', async () => {
    // getSession 은 지연시켜 콜백이 먼저 발화하도록 한다.
    let resolveSession: (v: { data: { session: Session | null }; error: null }) => void = () => {};
    vi.mocked(supabase.auth.getSession).mockImplementation(
      (() => new Promise((res) => { resolveSession = res; })) as typeof supabase.auth.getSession,
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.loading).toBe(true);

    act(() => { capturedCb?.('INITIAL_SESSION', makeSession(makeUser('initial-user'))); });
    expect(result.current.user?.id).toBe('initial-user');
    expect(result.current.loading).toBe(false);

    // getSession 정착도 깨끗하게 흘려보냄(unhandled 방지)
    await act(async () => { resolveSession({ data: { session: null }, error: null }); });
  });

  it('B5. 콜백이 session=undefined 류여도 user 는 null 로 안전 폴백', async () => {
    const { result } = await renderSettled();
    act(() => { capturedCb?.('SIGNED_IN', null); });
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });
});

describe('useAuth — signInWithGoogle (LOG.A: OAuth 인자/에러 전파)', () => {
  it('C1. signInWithOAuth 를 정확한 인자로 호출: provider=google, redirectTo=`${origin}/auth`', async () => {
    const { result } = await renderSettled();
    await act(async () => { await result.current.signInWithGoogle(); });

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledTimes(1);
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    // redirectTo 가 절대 origin 기반 + '/auth' 경로인지 구조적으로도 확인
    const arg = vi.mocked(supabase.auth.signInWithOAuth).mock.calls[0][0];
    expect(arg.options?.redirectTo).toMatch(/^https?:\/\/[^/]+\/auth$/);
  });

  it('C2. signInWithOAuth 가 error 반환 → 그대로 { error } 전파', async () => {
    const oauthErr = { name: 'AuthError', message: 'oauth blocked' } as Error;
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: 'google', url: null },
      error: oauthErr,
    } as Awaited<ReturnType<typeof supabase.auth.signInWithOAuth>>);

    const { result } = await renderSettled();
    let ret: { error: Error | null } = { error: null };
    await act(async () => { ret = await result.current.signInWithGoogle(); });

    expect(ret.error).toBe(oauthErr);
  });

  it('C3. 성공 시 error 는 null (?? null 정규화)', async () => {
    const { result } = await renderSettled();
    let ret: { error: Error | null } = { error: new Error('x') };
    await act(async () => { ret = await result.current.signInWithGoogle(); });
    expect(ret.error).toBeNull();
  });

  it('C4. signInWithGoogle 은 user/session 을 직접 변경하지 않는다(리다이렉트 후 콜백 책임)', async () => {
    const { result } = await renderSettled();
    await act(async () => { await result.current.signInWithGoogle(); });
    // OAuth 는 외부 리다이렉트 → 로컬 상태는 콜백/getSession 경유로만 바뀐다
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });
});

describe('useAuth — signIn / signUp 위임 계약', () => {
  it('D1. signIn → signInWithPassword({email,password}) 위임 + error 전파', async () => {
    const { result } = await renderSettled();
    await act(async () => { await result.current.signIn('me@x.com', 'pw123'); });
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'me@x.com',
      password: 'pw123',
    });
  });

  it('D2. signIn 의 error 를 { error } 로 그대로 전파', async () => {
    const err = { name: 'AuthError', message: 'bad creds' } as Error;
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: err,
    } as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>);

    const { result } = await renderSettled();
    let ret: { error: Error | null } = { error: null };
    await act(async () => { ret = await result.current.signIn('me@x.com', 'wrong'); });
    expect(ret.error).toBe(err);
  });

  it('D3. signUp → signUp 에 emailRedirectTo=`${origin}/` + display_name 메타 전달', async () => {
    const { result } = await renderSettled();
    await act(async () => { await result.current.signUp('new@x.com', 'pw', '신랑'); });

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'new@x.com',
      password: 'pw',
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: '신랑' },
      },
    });
  });

  it('D4. signUp displayName 미지정 시 data.display_name 은 undefined 로 전달', async () => {
    const { result } = await renderSettled();
    await act(async () => { await result.current.signUp('new@x.com', 'pw'); });
    const arg = vi.mocked(supabase.auth.signUp).mock.calls[0][0] as {
      options?: { data?: { display_name?: string } };
    };
    expect(arg.options?.data).toHaveProperty('display_name', undefined);
  });
});

describe('useAuth — signOut (LOG: API 호출 + SIGNED_OUT 경유 clear)', () => {
  it('E1. signOut → supabase.auth.signOut() 1회 호출', async () => {
    const { result } = await renderSettled();
    await act(async () => { await result.current.signOut(); });
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('E2. signOut 호출만으로는 로컬 상태가 즉시 clear 되지 않는다(콜백 경유 설계)', async () => {
    // 로그인 상태 구성
    const { result } = await renderSettled();
    act(() => { capturedCb?.('SIGNED_IN', makeSession(makeUser('to-logout'))); });
    expect(result.current.user).not.toBeNull();

    // signOut() 만 호출 — Supabase 가 SIGNED_OUT 이벤트를 아직 발화하지 않은 시점
    await act(async () => { await result.current.signOut(); });
    // 설계상 상태 clear 는 onAuthStateChange(SIGNED_OUT) 가 담당 → 아직 유지
    expect(result.current.user).not.toBeNull();

    // 이벤트가 도착하면 비로소 clear
    act(() => { capturedCb?.('SIGNED_OUT', null); });
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });
});

describe('useAuth — 참조 안정성 / 멱등 (LOG: 리렌더 연쇄 차단)', () => {
  it('F1. 동일 user 상태에서 콜백 함수 참조가 안정적이다(useCallback 메모)', async () => {
    const { result, rerender } = await renderSettled();
    const first = {
      signIn: result.current.signIn,
      signInWithGoogle: result.current.signInWithGoogle,
      signOut: result.current.signOut,
      signUp: result.current.signUp,
    };
    rerender();
    expect(result.current.signIn).toBe(first.signIn);
    expect(result.current.signInWithGoogle).toBe(first.signInWithGoogle);
    expect(result.current.signOut).toBe(first.signOut);
    expect(result.current.signUp).toBe(first.signUp);
  });

  it('F2. 동일 세션으로 콜백이 반복 발화해도 user 객체 동일성이 유지된다(불필요 리렌더 억제)', async () => {
    const { result } = await renderSettled();
    const session = makeSession(makeUser('same-user'));
    act(() => { capturedCb?.('SIGNED_IN', session); });
    const userRef1 = result.current.user;
    act(() => { capturedCb?.('TOKEN_REFRESHED', session); });
    // 동일 session 객체 → 동일 user 참조 (session.user 동일)
    expect(result.current.user).toBe(userRef1);
  });
});

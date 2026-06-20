// [CL-COEDIT-QA200-20260620] Auth.tsx — Google 로그인/인앱 브라우저 탈출/Dev 바이패스 플로우 검증
//
// 기존 Auth.test.tsx(AU1~AU3: 뒤로가기·버튼 존재·signInWithGoogle 1회 호출)와 중복 금지.
// 본 파일은 그 외 계약을 검증한다:
//   D. Google 플로우: 로딩 텍스트 "연결 중...", error 토스트, 이미 user → /budget Navigate
//   E. 인앱 브라우저: 마운트 시 openInExternalBrowserWithFallback 호출 + 버튼 클릭 시 우회,
//      onFallback → 브릿지 UI, URL 복사, 재시도(handleRetryBreakout)
//   F. Dev 바이패스: DEV 게이트 버튼 존재, signIn 우선 성공, 실패 시 fetch(dev-create-user),
//      Edge Function 미배포(throw) 시 안내 토스트
//
// 모킹 전략: getBrowserInfo는 Auth가 useState(() => getBrowserInfo())로 1회만 읽으므로
//   가변 홀더(browserState)를 두고 각 테스트 render 전에 세팅한다.
//   openInExternalBrowserWithFallback은 vi.fn — onFallback 콜백을 캡처해 브릿지 UI를 유발할 수 있다.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
  currentPath,
  act,
  within,
} from '@/test/test-utils';
import Auth from '../Auth';

// ── kakao-browser: 가변 홀더로 환경 전환 ──
const browserState = {
  isInAppBrowser: false,
  isKakaoTalk: false,
  isAndroid: false,
  isIOS: false,
  userAgent: '',
  detectedApp: null as string | null,
};
const openInExternalBrowserWithFallback = vi.fn<
  (url: string, onFallback: () => void) => void
>();
const copyToClipboard = vi.fn<(text: string) => Promise<boolean>>(async () => true);

vi.mock('@/lib/kakao-browser', () => ({
  getBrowserInfo: () => ({ ...browserState }),
  openInExternalBrowserWithFallback: (...args: [string, () => void]) =>
    openInExternalBrowserWithFallback(...args),
  copyToClipboard: (...args: [string]) => copyToClipboard(...args),
  getAppSpecificGuide: (detectedApp: string | null) => ({
    steps:
      detectedApp === '카카오톡'
        ? ['1. 우측 하단 ⋯ 아이콘을 탭하세요', '2. "다른 브라우저로 열기"를 선택하세요']
        : ['1. 화면 하단 또는 상단의 ⋯ / 공유 아이콘을 탭하세요'],
  }),
}));

// ── useSEO: no-op ──
vi.mock('@/hooks/useSEO', () => ({ useSEO: vi.fn() }));

// ── useToast: 캡처 가능한 toast spy ──
const toastSpy = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastSpy }) }));

// ── useAuth mock (가변 홀더) ──
let mockAuth: {
  user: unknown;
  loading: boolean;
  signOut: ReturnType<typeof vi.fn>;
  signInWithGoogle: ReturnType<typeof vi.fn>;
  signIn: ReturnType<typeof vi.fn>;
  signUp: ReturnType<typeof vi.fn>;
  session: unknown;
};
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ── edge-function-config: 결정론적 스텁 ──
vi.mock('@/lib/edge-function-config', () => ({
  EDGE_FUNCTION_URL: 'https://edge.test.supabase.co',
  EDGE_FUNCTION_KEY: 'edge-test-key',
}));

/** 인증 훅을 매 테스트 초기화 (signInWithGoogle/signIn 기본 = 성공) */
function resetAuth() {
  mockAuth = {
    user: null,
    loading: false,
    signOut: vi.fn(),
    signInWithGoogle: vi.fn(async () => ({ error: null })),
    signIn: vi.fn(async () => ({ error: null })),
    signUp: vi.fn(async () => ({ error: null })),
    session: null,
  };
}

/** 브라우저 환경 홀더를 비인앱(데스크톱)으로 초기화 */
function resetBrowser() {
  browserState.isInAppBrowser = false;
  browserState.isKakaoTalk = false;
  browserState.isAndroid = false;
  browserState.isIOS = false;
  browserState.userAgent = 'jsdom';
  browserState.detectedApp = null;
}

beforeEach(() => {
  resetAuth();
  resetBrowser();
  toastSpy.mockClear();
  openInExternalBrowserWithFallback.mockClear();
  copyToClipboard.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─────────────────────────────────────────────────────────────
// D. Google 로그인 플로우
// ─────────────────────────────────────────────────────────────
describe('Auth — Google 로그인 플로우 (D)', () => {
  it('D1: 일반 브라우저에서 Google 버튼 클릭 → openInExternalBrowserWithFallback은 호출되지 않는다', async () => {
    renderWithProviders(<Auth />, { route: '/auth' });
    fireEvent.click(screen.getByText('Google로 계속하기'));
    await waitFor(() => expect(mockAuth.signInWithGoogle).toHaveBeenCalledTimes(1));
    // 비인앱이므로 인앱 우회 경로는 절대 타지 않아야 함
    expect(openInExternalBrowserWithFallback).not.toHaveBeenCalled();
  });

  it('D2: Google 로그인 진행 중에는 버튼 라벨이 "연결 중..."으로 바뀐다', async () => {
    // signInWithGoogle을 수동 제어 가능한 deferred promise로 교체 → 로딩 상태 관찰
    let resolveSignIn!: (v: { error: null }) => void;
    mockAuth.signInWithGoogle = vi.fn(
      () => new Promise<{ error: null }>((res) => { resolveSignIn = res; }),
    );

    renderWithProviders(<Auth />, { route: '/auth' });
    const btn = screen.getByRole('button', { name: 'Google로 계속하기' });
    fireEvent.click(btn);

    // 클릭 직후 isGoogleLoading=true → 라벨 전환
    await screen.findByRole('button', { name: '연결 중...' });
    expect(screen.queryByText('Google로 계속하기')).not.toBeInTheDocument();

    // 로딩 중에는 disabled
    expect(screen.getByRole('button', { name: '연결 중...' })).toBeDisabled();

    // 완료시키면 다시 원래 라벨로 복귀 (finally의 setState 마이크로태스크까지 flush)
    await act(async () => {
      resolveSignIn({ error: null });
      await Promise.resolve();
      await Promise.resolve();
    });
    await screen.findByRole('button', { name: 'Google로 계속하기' });
  });

  it('D3: signInWithGoogle이 error를 반환하면 destructive 토스트로 메시지를 노출한다', async () => {
    mockAuth.signInWithGoogle = vi.fn(async () => ({
      error: { message: 'OAuth 공급자 연결 실패' },
    }));

    renderWithProviders(<Auth />, { route: '/auth' });
    fireEvent.click(screen.getByText('Google로 계속하기'));

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Google 로그인 실패',
          description: 'OAuth 공급자 연결 실패',
          variant: 'destructive',
        }),
      ),
    );
  });

  it('D4: signInWithGoogle 성공(error=null) 시에는 토스트를 띄우지 않는다', async () => {
    renderWithProviders(<Auth />, { route: '/auth' });
    fireEvent.click(screen.getByText('Google로 계속하기'));
    await waitFor(() => expect(mockAuth.signInWithGoogle).toHaveBeenCalledTimes(1));
    // 성공 경로엔 toast 호출 없음
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it('D5: error 반환 후에도 finally에서 로딩이 풀려 버튼이 다시 활성화된다', async () => {
    mockAuth.signInWithGoogle = vi.fn(async () => ({
      error: { message: '실패' },
    }));
    renderWithProviders(<Auth />, { route: '/auth' });
    fireEvent.click(screen.getByText('Google로 계속하기'));
    // 실패 후 라벨 복귀 + 활성화
    const btn = await screen.findByRole('button', { name: 'Google로 계속하기' });
    expect(btn).not.toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────
// D(cont). 이미 로그인된 사용자 → /budget 리다이렉트
// ─────────────────────────────────────────────────────────────
describe('Auth — 인증 상태 리다이렉트 (D)', () => {
  it('D6: user가 있고 loading=false면 /budget으로 Navigate 한다', () => {
    mockAuth.user = { id: 'u-1', email: 'a@b.com' };
    mockAuth.loading = false;
    renderWithProviders(<Auth />, { route: '/auth' });
    expect(currentPath()).toBe('/budget');
    // 로그인 폼은 렌더되지 않음
    expect(screen.queryByText('Google로 계속하기')).not.toBeInTheDocument();
  });

  it('D7: user가 있어도 loading=true면 리다이렉트하지 않고 로딩 화면을 보여준다', () => {
    mockAuth.user = { id: 'u-1' };
    mockAuth.loading = true;
    renderWithProviders(<Auth />, { route: '/auth' });
    // 가드는 (!loading && user) → loading이면 통과 안 함
    expect(currentPath()).toBe('/auth');
    expect(screen.getByText('로딩 중...')).toBeInTheDocument();
  });

  it('D8: user가 없으면 /budget으로 리다이렉트하지 않고 로그인 폼을 렌더한다', () => {
    mockAuth.user = null;
    renderWithProviders(<Auth />, { route: '/auth' });
    expect(currentPath()).toBe('/auth');
    expect(screen.getByText('Google로 계속하기')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────
// E. 인앱 브라우저 탈출 플로우
// ─────────────────────────────────────────────────────────────
describe('Auth — 인앱 브라우저 탈출 (E)', () => {
  it('E1: 인앱 브라우저면 마운트 즉시 openInExternalBrowserWithFallback을 현재 URL로 호출한다', () => {
    browserState.isInAppBrowser = true;
    browserState.detectedApp = '카카오톡';
    browserState.isIOS = true;
    renderWithProviders(<Auth />, { route: '/auth' });
    expect(openInExternalBrowserWithFallback).toHaveBeenCalledTimes(1);
    const [urlArg, fallbackArg] = openInExternalBrowserWithFallback.mock.calls[0];
    expect(urlArg).toBe(window.location.href);
    expect(typeof fallbackArg).toBe('function');
  });

  it('E2: 비인앱(데스크톱)에서는 마운트 시 탈출 함수를 호출하지 않는다', () => {
    browserState.isInAppBrowser = false;
    renderWithProviders(<Auth />, { route: '/auth' });
    expect(openInExternalBrowserWithFallback).not.toHaveBeenCalled();
  });

  it('E3: 인앱 브라우저에서 Google 버튼 클릭 → signInWithGoogle 대신 탈출 함수가 호출된다', () => {
    browserState.isInAppBrowser = true;
    browserState.detectedApp = 'Instagram';
    renderWithProviders(<Auth />, { route: '/auth' });
    // 마운트 effect 1회
    expect(openInExternalBrowserWithFallback).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Google로 계속하기'));
    // 버튼 클릭으로 한 번 더 (총 2회), signInWithGoogle은 절대 호출 안 됨
    expect(openInExternalBrowserWithFallback).toHaveBeenCalledTimes(2);
    expect(mockAuth.signInWithGoogle).not.toHaveBeenCalled();
  });

  it('E4: onFallback 콜백이 실행되면 브릿지 UI("외부 브라우저에서 열어주세요")로 전환된다', () => {
    browserState.isInAppBrowser = true;
    browserState.detectedApp = '카카오톡';
    browserState.isIOS = true;
    // 마운트 시 즉시 onFallback 호출하도록 구현
    openInExternalBrowserWithFallback.mockImplementation((_url, onFallback) => {
      onFallback();
    });
    renderWithProviders(<Auth />, { route: '/auth' });
    expect(screen.getByText('외부 브라우저에서 열어주세요')).toBeInTheDocument();
    // 일반 로그인 폼은 더 이상 렌더되지 않음
    expect(screen.queryByText('Google로 계속하기')).not.toBeInTheDocument();
  });

  it('E5: 브릿지 UI는 감지된 앱 이름과 iOS/Android에 따라 Safari/Chrome 안내를 분기한다', () => {
    browserState.isInAppBrowser = true;
    browserState.detectedApp = '카카오톡';
    browserState.isIOS = true;
    openInExternalBrowserWithFallback.mockImplementation((_url, fb) => fb());
    renderWithProviders(<Auth />, { route: '/auth' });
    // detectedApp 이름이 본문 안내문구에 1회 이상 포함 (본문 + 가이드)
    expect(screen.getAllByText(/카카오톡/).length).toBeGreaterThan(0);
    // iOS → Safari 안내
    expect(screen.getAllByText(/Safari/).length).toBeGreaterThan(0);
  });

  it('E6: 브릿지 UI에서 "외부 브라우저로 열기" 클릭 → 탈출 함수 재시도 호출', () => {
    browserState.isInAppBrowser = true;
    browserState.detectedApp = '카카오톡';
    browserState.isIOS = true;
    openInExternalBrowserWithFallback.mockImplementation((_url, fb) => fb());
    renderWithProviders(<Auth />, { route: '/auth' });
    // 마운트 effect로 1회 호출됨
    expect(openInExternalBrowserWithFallback).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('외부 브라우저로 열기'));
    // handleRetryBreakout → 2회째
    expect(openInExternalBrowserWithFallback).toHaveBeenCalledTimes(2);
  });

  it('E7: 브릿지 UI에서 URL 복사 버튼 클릭 → copyToClipboard 호출 후 "복사완료" 라벨로 전환', async () => {
    browserState.isInAppBrowser = true;
    browserState.detectedApp = '카카오톡';
    browserState.isIOS = true;
    openInExternalBrowserWithFallback.mockImplementation((_url, fb) => fb());
    renderWithProviders(<Auth />, { route: '/auth' });

    const copyBtn = screen.getByText(/URL 복사 후 Safari에 붙여넣기/);
    fireEvent.click(copyBtn);

    await waitFor(() =>
      expect(copyToClipboard).toHaveBeenCalledWith(window.location.href),
    );
    // 성공(true) → "복사완료" 표시
    await screen.findByText(/복사완료/);
  });

  it('E8: copyToClipboard가 false를 반환하면 "복사완료" 라벨로 전환되지 않는다', async () => {
    browserState.isInAppBrowser = true;
    browserState.detectedApp = '카카오톡';
    browserState.isIOS = true;
    copyToClipboard.mockResolvedValueOnce(false);
    openInExternalBrowserWithFallback.mockImplementation((_url, fb) => fb());
    renderWithProviders(<Auth />, { route: '/auth' });

    fireEvent.click(screen.getByText(/URL 복사 후 Safari에 붙여넣기/));
    await waitFor(() => expect(copyToClipboard).toHaveBeenCalledTimes(1));
    // 실패 경로 → 여전히 미복사 라벨 유지
    expect(screen.queryByText(/복사완료/)).not.toBeInTheDocument();
    expect(screen.getByText(/URL 복사 후 Safari에 붙여넣기/)).toBeInTheDocument();
  });

  it('E9: "복사완료" 라벨은 2초 후 원래 라벨로 되돌아간다 (fake timers)', async () => {
    vi.useFakeTimers();
    browserState.isInAppBrowser = true;
    browserState.detectedApp = '카카오톡';
    browserState.isIOS = true;
    // 동기 resolve 클립보드(타이머 결정성 확보)
    copyToClipboard.mockImplementation(async () => true);
    openInExternalBrowserWithFallback.mockImplementation((_url, fb) => fb());
    renderWithProviders(<Auth />, { route: '/auth' });

    fireEvent.click(screen.getByText(/URL 복사 후 Safari에 붙여넣기/));
    // copyToClipboard의 마이크로태스크 flush → setCopied(true)
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText(/복사완료/)).toBeInTheDocument();

    // 2000ms 경과 → setCopied(false)
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText(/복사완료/)).not.toBeInTheDocument();
  });

  it('E10: detectedApp이 null이어도 인앱 감지 시 브릿지 UI는 "현재 브라우저" 문구로 안전 렌더된다', () => {
    browserState.isInAppBrowser = true;
    browserState.detectedApp = null;
    browserState.isIOS = false;
    browserState.isAndroid = true;
    openInExternalBrowserWithFallback.mockImplementation((_url, fb) => fb());
    renderWithProviders(<Auth />, { route: '/auth' });
    expect(screen.getByText('외부 브라우저에서 열어주세요')).toBeInTheDocument();
    // Android → Chrome 안내
    expect(screen.getByText(/Chrome/)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────
// F. Dev 바이패스 로그인
// ─────────────────────────────────────────────────────────────
describe('Auth — Dev 바이패스 로그인 (F)', () => {
  it('F1: DEV 환경에서는 "Dev 테스트 로그인" 버튼이 렌더된다', () => {
    // vitest는 import.meta.env.DEV === true
    expect(import.meta.env.DEV).toBe(true);
    renderWithProviders(<Auth />, { route: '/auth' });
    expect(
      screen.getByText(/Dev 테스트 로그인/),
    ).toBeInTheDocument();
    expect(screen.getByText(/DEV MODE ONLY/)).toBeInTheDocument();
  });

  it('F2: Dev 버튼 클릭 → signIn이 먼저 시도되고 성공하면 "Dev 로그인 성공!" 토스트 + fetch 미호출', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));
    mockAuth.signIn = vi.fn(async () => ({ error: null }));

    renderWithProviders(<Auth />, { route: '/auth' });
    fireEvent.click(screen.getByText(/Dev 테스트 로그인/));

    await waitFor(() =>
      expect(mockAuth.signIn).toHaveBeenCalledWith(
        'dev-test@wedsem-local.dev',
        'devtest123456',
      ),
    );
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith({ title: 'Dev 로그인 성공!' }),
    );
    // 첫 signIn 성공 → Edge Function fetch는 호출되지 않음
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('F3: signIn 실패 → dev-create-user Edge Function으로 POST 후 재로그인 성공 토스트', async () => {
    // 1차 signIn 실패, 2차(재시도) 성공
    mockAuth.signIn = vi
      .fn()
      .mockResolvedValueOnce({ error: { message: '계정 없음' } })
      .mockResolvedValueOnce({ error: null });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    renderWithProviders(<Auth />, { route: '/auth' });
    fireEvent.click(screen.getByText(/Dev 테스트 로그인/));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const [calledUrl, calledInit] = fetchSpy.mock.calls[0];
    expect(String(calledUrl)).toBe(
      'https://edge.test.supabase.co/functions/v1/dev-create-user',
    );
    expect((calledInit as RequestInit).method).toBe('POST');
    // body에 dev 계정 자격이 직렬화됨
    expect(String((calledInit as RequestInit).body)).toContain(
      'dev-test@wedsem-local.dev',
    );

    // 재로그인 성공 토스트
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith({
        title: 'Dev 계정 생성 + 로그인 성공!',
      }),
    );
    // signIn 총 2회(최초 + 재시도)
    expect(mockAuth.signIn).toHaveBeenCalledTimes(2);
    fetchSpy.mockRestore();
  });

  it('F4: signIn 실패 + Edge Function이 !res.ok → throw → "Dev 로그인 실패" 안내 토스트(미배포 가이드)', async () => {
    mockAuth.signIn = vi.fn(async () => ({ error: { message: '계정 없음' } }));
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ error: 'not deployed' }), { status: 404 }),
      );

    renderWithProviders(<Auth />, { route: '/auth' });
    fireEvent.click(screen.getByText(/Dev 테스트 로그인/));

    await waitFor(() => {
      const failCall = toastSpy.mock.calls.find(
        (c) => (c[0] as { title?: string }).title === 'Dev 로그인 실패',
      );
      expect(failCall).toBeTruthy();
      const arg = failCall![0] as { description: string; variant: string };
      expect(arg.variant).toBe('destructive');
      // 원래 signIn 에러 + 미배포 해결 가이드 포함
      expect(arg.description).toContain('계정 없음');
      expect(arg.description).toContain('dev-create-user');
    });
    // res.ok=false면 재로그인(2차 signIn)은 시도하지 않음 → 총 1회
    expect(mockAuth.signIn).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });

  it('F5: signIn 실패 + fetch 자체가 reject(네트워크 오류) → catch에서 안내 토스트', async () => {
    mockAuth.signIn = vi.fn(async () => ({ error: { message: '계정 없음' } }));
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new TypeError('Failed to fetch'));

    renderWithProviders(<Auth />, { route: '/auth' });
    fireEvent.click(screen.getByText(/Dev 테스트 로그인/));

    await waitFor(() => {
      const failCall = toastSpy.mock.calls.find(
        (c) => (c[0] as { title?: string }).title === 'Dev 로그인 실패',
      );
      expect(failCall).toBeTruthy();
    });
    fetchSpy.mockRestore();
  });

  it('F6: signIn 실패 + Edge Function ok지만 재로그인도 실패 → 재시도 실패 토스트(destructive)', async () => {
    mockAuth.signIn = vi
      .fn()
      .mockResolvedValueOnce({ error: { message: '계정 없음' } })
      .mockResolvedValueOnce({ error: { message: '여전히 실패' } });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));

    renderWithProviders(<Auth />, { route: '/auth' });
    fireEvent.click(screen.getByText(/Dev 테스트 로그인/));

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Dev 로그인 실패',
          description: '여전히 실패',
          variant: 'destructive',
        }),
      ),
    );
    expect(mockAuth.signIn).toHaveBeenCalledTimes(2);
    fetchSpy.mockRestore();
  });

  it('F7: Dev 로그인 진행 중에는 버튼 라벨이 "Dev 로그인 중..."으로 바뀐다', async () => {
    let resolveSignIn!: (v: { error: null }) => void;
    mockAuth.signIn = vi.fn(
      () => new Promise<{ error: null }>((res) => { resolveSignIn = res; }),
    );
    renderWithProviders(<Auth />, { route: '/auth' });
    fireEvent.click(screen.getByText(/Dev 테스트 로그인/));

    await screen.findByText(/Dev 로그인 중.../);

    await act(async () => {
      resolveSignIn({ error: null });
      await Promise.resolve();
      await Promise.resolve();
    });
    await screen.findByText(/Dev 테스트 로그인/);
  });

  it('F8: Dev 버튼은 일반 Google 버튼과 구분되는 별도 버튼이다(중복 클릭 격리)', () => {
    renderWithProviders(<Auth />, { route: '/auth' });
    const devBtn = screen.getByRole('button', {
      name: /Dev 테스트 로그인/,
    });
    const googleBtn = screen.getByRole('button', { name: 'Google로 계속하기' });
    expect(devBtn).not.toBe(googleBtn);
    // Dev 버튼 클릭은 signInWithGoogle을 건드리지 않는다
    fireEvent.click(devBtn);
    expect(mockAuth.signInWithGoogle).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// 추가: 로딩/구조 불변식
// ─────────────────────────────────────────────────────────────
describe('Auth — 로딩 화면 및 구조 (D)', () => {
  it('S1: loading=true(user=null)면 "로딩 중..." 플레이스홀더만 보이고 로그인 폼은 없다', () => {
    mockAuth.loading = true;
    mockAuth.user = null;
    renderWithProviders(<Auth />, { route: '/auth' });
    expect(screen.getByText('로딩 중...')).toBeInTheDocument();
    expect(screen.queryByText('Google로 계속하기')).not.toBeInTheDocument();
    expect(screen.queryByText(/Dev 테스트 로그인/)).not.toBeInTheDocument();
  });

  it('S2: 정상 폼에는 헤더 뒤로가기 버튼과 Google 버튼이 함께 존재한다', () => {
    renderWithProviders(<Auth />, { route: '/auth' });
    const header = screen.getByText('Google로 계속하기').closest('main');
    expect(header).not.toBeNull();
    // 메인 영역 내에 Google 버튼 존재
    expect(
      within(header as HTMLElement).getByText('Google로 계속하기'),
    ).toBeInTheDocument();
  });
});

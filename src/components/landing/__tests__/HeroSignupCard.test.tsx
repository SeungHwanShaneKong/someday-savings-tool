// [CL-LOGIN-GATE-20260709-233447 | by:frontend-engineer]
// HeroSignupCard — 비로그인 히어로 가입 카드 단위 검증.
// 계약: ① Google 직접 로그인(비인앱) ② 인앱 브라우저 탈출 우회 ③ 실패 토스트
//       ④ 로딩/더블서밋 게이트 ⑤ 신뢰 칩 + /privacy 링크 ⑥ 보조 경로(/auth) ⑦ 퍼널 method 파라미터.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
  currentPath,
  act,
} from '@/test/test-utils';
import { HeroSignupCard } from '../HeroSignupCard';

/* ─── useAuth mock (가변 홀더 — 리포 컨벤션) ─── */
let mockAuth: {
  user: unknown;
  loading: boolean;
  signInWithGoogle: ReturnType<typeof vi.fn>;
};
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }: { children?: React.ReactNode }) => children,
}));

/* ─── use-toast: 캡처 spy ─── */
const toastSpy = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastSpy }) }));

const onInAppEscape = vi.fn();

beforeEach(() => {
  mockAuth = {
    user: null,
    loading: false,
    signInWithGoogle: vi.fn(async () => ({ error: null })),
  };
  toastSpy.mockClear();
  onInAppEscape.mockClear();
});

afterEach(() => {
  delete (window as { gtag?: unknown }).gtag;
  sessionStorage.clear();
});

function renderCard(overrides: Partial<{ isInAppBrowser: boolean }> = {}) {
  return renderWithProviders(
    <HeroSignupCard
      isInAppBrowser={overrides.isInAppBrowser ?? false}
      onInAppEscape={onInAppEscape}
    />,
  );
}

describe('HeroSignupCard — 렌더 계약', () => {
  it('H1: Google CTA·예산 스냅샷(총액/예시 배지)·신뢰 칩·개인정보 링크가 렌더된다', () => {
    renderCard();
    expect(
      screen.getByRole('button', { name: 'Google로 10초 만에 시작' }),
    ).toBeInTheDocument();
    // 정적 스냅샷 목업(논인터랙티브)
    expect(screen.getByText('3,440만 원')).toBeInTheDocument();
    expect(screen.getByText('예시')).toBeInTheDocument();
    expect(screen.getByText('예식장')).toBeInTheDocument();
    expect(screen.getByText('스드메')).toBeInTheDocument();
    // 신뢰 칩 3종(이모지 복합 노드 → 부분 매칭)
    expect(screen.getByText(/이메일 주소만 사용해요/)).toBeInTheDocument();
    expect(screen.getByText(/비밀번호 없이 10초/)).toBeInTheDocument();
    expect(screen.getByText(/평생 무료·카드 등록 없음/)).toBeInTheDocument();
    // 개인정보 안내 링크
    expect(screen.getByRole('link', { name: '개인정보처리방침' })).toHaveAttribute(
      'href',
      '/privacy',
    );
  });
});

describe('HeroSignupCard — Google 직접 로그인', () => {
  it('H2: 비인앱에서 클릭 → signInWithGoogle 1회, 인앱 탈출 미호출', async () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Google로 10초 만에 시작' }));
    await waitFor(() => expect(mockAuth.signInWithGoogle).toHaveBeenCalledTimes(1));
    expect(onInAppEscape).not.toHaveBeenCalled();
  });

  it('H3: 인앱 브라우저에서는 signInWithGoogle 대신 onInAppEscape 로 우회한다', () => {
    renderCard({ isInAppBrowser: true });
    fireEvent.click(screen.getByRole('button', { name: 'Google로 10초 만에 시작' }));
    expect(onInAppEscape).toHaveBeenCalledTimes(1);
    expect(mockAuth.signInWithGoogle).not.toHaveBeenCalled();
  });

  it('H4: signInWithGoogle error → destructive 토스트로 메시지 노출', async () => {
    mockAuth.signInWithGoogle = vi.fn(async () => ({
      error: { message: 'OAuth 연결 실패' },
    }));
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Google로 10초 만에 시작' }));
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Google 로그인 실패',
          description: 'OAuth 연결 실패',
          variant: 'destructive',
        }),
      ),
    );
  });

  it('H5: 진행 중에는 "연결 중..." + disabled + aria-busy, 완료 시 원복(더블서밋 게이트)', async () => {
    let resolveSignIn!: (v: { error: null }) => void;
    mockAuth.signInWithGoogle = vi.fn(
      () => new Promise<{ error: null }>((res) => { resolveSignIn = res; }),
    );
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Google로 10초 만에 시작' }));

    const loadingBtn = await screen.findByRole('button', { name: '연결 중...' });
    expect(loadingBtn).toBeDisabled();
    expect(loadingBtn).toHaveAttribute('aria-busy', 'true');

    await act(async () => {
      resolveSignIn({ error: null });
      await Promise.resolve();
      await Promise.resolve();
    });
    await screen.findByRole('button', { name: 'Google로 10초 만에 시작' });
    expect(mockAuth.signInWithGoogle).toHaveBeenCalledTimes(1);
  });
});

describe('HeroSignupCard — 보조 경로·퍼널', () => {
  it('H6: "다른 방법으로 시작" 클릭 → /auth 이동', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: '다른 방법으로 시작' }));
    expect(currentPath()).toBe('/auth');
  });

  it('H7: 퍼널 — Google 직행은 method=google_direct, 보조 경로는 method=auth_page 로 계측된다', async () => {
    const gtag = vi.fn();
    (window as { gtag?: unknown }).gtag = gtag;

    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Google로 10초 만에 시작' }));
    await waitFor(() =>
      expect(gtag).toHaveBeenCalledWith(
        'event',
        'landing_hero_cta_click',
        expect.objectContaining({ method: 'google_direct' }),
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: '다른 방법으로 시작' }));
    expect(gtag).toHaveBeenCalledWith(
      'event',
      'landing_hero_cta_click',
      expect.objectContaining({ method: 'auth_page' }),
    );
  });
});

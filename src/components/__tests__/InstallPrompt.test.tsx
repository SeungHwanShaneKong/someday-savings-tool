// [CL-TOP20-P5-PWA-20260703-050000] InstallPrompt 배너 테스트
// 시나리오: ①설치 배너·설치 클릭 ②닫기→30일 억제 기록 ③억제 기간 경계 ④iOS 안내 ⑤데스크톱/standalone 미노출
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/test-utils';
import { InstallPrompt } from '../InstallPrompt';
import {
  usePWAInstall,
  PWA_INSTALL_DISMISS_KEY,
  type InstallPromptOutcome,
} from '@/hooks/usePWAInstall';
import { useIsMobile } from '@/hooks/use-mobile';

vi.mock('@/hooks/usePWAInstall', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/usePWAInstall')>('@/hooks/usePWAInstall');
  return { ...actual, usePWAInstall: vi.fn() };
});
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: vi.fn() }));

const mockedUsePWAInstall = vi.mocked(usePWAInstall);
const mockedUseIsMobile = vi.mocked(useIsMobile);

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function setup(
  overrides: Partial<ReturnType<typeof usePWAInstall>> = {},
  { mobile = true }: { mobile?: boolean } = {},
) {
  const promptInstall = vi.fn(async (): Promise<InstallPromptOutcome> => 'accepted');
  mockedUseIsMobile.mockReturnValue(mobile);
  mockedUsePWAInstall.mockReturnValue({
    isInstallable: true,
    isIOS: false,
    isStandalone: false,
    promptInstall,
    ...overrides,
  });
  return { promptInstall };
}

describe('InstallPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('설치 가능(모바일): 배너 렌더 + "설치" 클릭 → promptInstall 1회 호출 후 배너 제거', async () => {
    const { promptInstall } = setup();
    renderWithProviders(<InstallPrompt />);

    expect(screen.getByText('홈 화면에 추가하고 빠르게 열기')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '설치' }));

    expect(promptInstall).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.queryByText('홈 화면에 추가하고 빠르게 열기')).not.toBeInTheDocument(),
    );
  });

  it('닫기 클릭: localStorage 에 억제 시각 기록 + 배너 즉시 제거', () => {
    setup();
    renderWithProviders(<InstallPrompt />);

    fireEvent.click(screen.getByRole('button', { name: '설치 안내 닫기' }));

    const stored = Number(window.localStorage.getItem(PWA_INSTALL_DISMISS_KEY));
    expect(stored).toBeGreaterThan(0);
    expect(Date.now() - stored).toBeLessThan(5_000);
    expect(screen.queryByText('홈 화면에 추가하고 빠르게 열기')).not.toBeInTheDocument();
  });

  it('억제 경계: 30일 이내 기록 → 미노출 / 30일 경과 기록 → 재노출', () => {
    setup();
    // 30일에서 1분 모자란 시점에 닫음 → 아직 억제
    window.localStorage.setItem(
      PWA_INSTALL_DISMISS_KEY,
      String(Date.now() - (THIRTY_DAYS_MS - 60_000)),
    );
    const first = renderWithProviders(<InstallPrompt />);
    expect(screen.queryByText('홈 화면에 추가하고 빠르게 열기')).not.toBeInTheDocument();
    first.unmount();

    // 30일 + 1분 경과 → 억제 해제
    window.localStorage.setItem(
      PWA_INSTALL_DISMISS_KEY,
      String(Date.now() - (THIRTY_DAYS_MS + 60_000)),
    );
    renderWithProviders(<InstallPrompt />);
    expect(screen.getByText('홈 화면에 추가하고 빠르게 열기')).toBeInTheDocument();
  });

  it('iOS: 공유→홈 화면에 추가 수동 안내 렌더, "설치" 버튼은 없음', () => {
    setup({ isInstallable: false, isIOS: true });
    renderWithProviders(<InstallPrompt />);

    expect(screen.getByText(/홈 화면에 추가/, { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText(/공유/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '설치' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '설치 안내 닫기' })).toBeInTheDocument();
  });

  // [CL-TOP20-R50-TEST-20260703-094000] iOS 수동 안내 분기의 닫기 계약 — 설치 분기와 동일한
  // 30일 억제가 iOS 분기에서도 작동해야 한다(시각 케이스는 UA 모킹 e2e 대신 결정론적 컴포넌트 테스트로 커버).
  it('iOS 안내에서 닫기 → 동일 30일 억제 기록 + 배너 제거', () => {
    setup({ isInstallable: false, isIOS: true });
    renderWithProviders(<InstallPrompt />);

    expect(screen.getByRole('complementary', { name: '웨딩셈 앱 설치 안내' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '설치 안내 닫기' }));

    const stored = Number(window.localStorage.getItem(PWA_INSTALL_DISMISS_KEY));
    expect(stored).toBeGreaterThan(0);
    expect(Date.now() - stored).toBeLessThan(5_000);
    expect(
      screen.queryByRole('complementary', { name: '웨딩셈 앱 설치 안내' }),
    ).not.toBeInTheDocument();
  });

  it('미노출 조건: 데스크톱(isMobile=false) / standalone / 미지원(이벤트 없음·iOS 아님) → null', () => {
    setup({}, { mobile: false });
    const desktop = renderWithProviders(<InstallPrompt />);
    expect(screen.queryByRole('complementary', { name: '웨딩셈 앱 설치 안내' })).not.toBeInTheDocument();
    desktop.unmount();

    setup({ isStandalone: true });
    const standalone = renderWithProviders(<InstallPrompt />);
    expect(screen.queryByRole('complementary', { name: '웨딩셈 앱 설치 안내' })).not.toBeInTheDocument();
    standalone.unmount();

    setup({ isInstallable: false, isIOS: false });
    renderWithProviders(<InstallPrompt />);
    expect(screen.queryByRole('complementary', { name: '웨딩셈 앱 설치 안내' })).not.toBeInTheDocument();
  });
});

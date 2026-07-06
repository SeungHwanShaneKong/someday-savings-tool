// [CL-PWA-A2HS-20260706-202840] 코어 버튼 — 원터치 호출 / 안내 폴백 / standalone 숨김 / 표면별 접근명.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor, cleanup } from '@/test/test-utils';

const promptInstall = vi.fn();
let mockState: { isInstallable: boolean; isIOS: boolean; isStandalone: boolean };

vi.mock('@/hooks/usePWAInstall', () => ({
  usePWAInstall: () => ({ ...mockState, promptInstall }),
}));

import { InstallAppButton } from '../InstallAppButton';

const WIN_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function setUA(ua: string) {
  Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true });
}

beforeEach(() => {
  mockState = { isInstallable: false, isIOS: false, isStandalone: false };
  promptInstall.mockReset();
});
afterEach(() => {
  cleanup();
  delete (window.navigator as { userAgent?: string }).userAgent;
});

describe('InstallAppButton', () => {
  it('installable: 클릭 → promptInstall 1회 호출(안내 모달 안 뜸)', async () => {
    mockState.isInstallable = true;
    promptInstall.mockResolvedValue('accepted');
    setUA(WIN_CHROME);
    renderWithProviders(<InstallAppButton placement="header" />);

    fireEvent.click(screen.getByRole('button', { name: '홈 화면에 웨딩셈 추가' }));
    await waitFor(() => expect(promptInstall).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('iOS(원터치 불가): 클릭 → 안내 모달 노출, promptInstall 미호출', async () => {
    mockState.isIOS = true;
    setUA(IPHONE);
    renderWithProviders(<InstallAppButton placement="hero" />);

    fireEvent.click(screen.getByRole('button', { name: '홈 화면에 웨딩셈 추가' }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(promptInstall).not.toHaveBeenCalled();
  });

  it('standalone(설치본): 아무 것도 렌더하지 않음(전 표면 자동 숨김)', () => {
    mockState.isStandalone = true;
    mockState.isInstallable = true;
    setUA(WIN_CHROME);
    renderWithProviders(<InstallAppButton placement="fab" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('footer 표면: 텍스트 링크형 렌더', () => {
    mockState.isInstallable = true;
    setUA(WIN_CHROME);
    renderWithProviders(<InstallAppButton placement="footer" />);
    expect(screen.getByRole('button', { name: /홈 화면에 앱 추가/ })).toBeInTheDocument();
  });

  it('연타 재진입 차단: 두 번 클릭해도 promptInstall 1회', async () => {
    mockState.isInstallable = true;
    let resolveOutcome: (v: string) => void = () => {};
    promptInstall.mockImplementation(() => new Promise((r) => { resolveOutcome = r; }));
    setUA(WIN_CHROME);
    renderWithProviders(<InstallAppButton placement="header" />);

    const btn = screen.getByRole('button', { name: '홈 화면에 웨딩셈 추가' });
    fireEvent.click(btn);
    fireEvent.click(btn); // 진행 중 재클릭 → 무시
    resolveOutcome('accepted');
    await waitFor(() => expect(promptInstall).toHaveBeenCalledTimes(1));
  });
});

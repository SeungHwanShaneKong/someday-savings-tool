// [CL-PWA-A2HS-20260706-202900] 전역 플로팅 버튼 — 숨김 경로·배너 시간배타·standalone·/budget 스택 오프셋.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen, cleanup } from '@/test/test-utils';

let mockMobile = false;
let mockSuppressed = false;
let mockState: { isInstallable: boolean; isIOS: boolean; isStandalone: boolean };

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => mockMobile }));
vi.mock('@/hooks/usePWAInstall', () => ({
  usePWAInstall: () => ({ ...mockState, promptInstall: vi.fn() }),
  useInstallPromptSuppressed: () => mockSuppressed,
}));

import { InstallFab } from '../InstallFab';

const WIN_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

beforeEach(() => {
  mockMobile = false;
  mockSuppressed = false;
  mockState = { isInstallable: true, isIOS: false, isStandalone: false };
  Object.defineProperty(window.navigator, 'userAgent', { value: WIN_CHROME, configurable: true });
});
afterEach(() => {
  cleanup();
  delete (window.navigator as { userAgent?: string }).userAgent;
});

const fabName = { name: '홈 화면에 웨딩셈 추가' };

describe('InstallFab', () => {
  it('숨김 경로 / 와 /auth 에서는 렌더 안 함', () => {
    renderWithProviders(<InstallFab />, { route: '/' });
    expect(screen.queryByRole('button', fabName)).toBeNull();
    cleanup();
    renderWithProviders(<InstallFab />, { route: '/auth' });
    expect(screen.queryByRole('button', fabName)).toBeNull();
  });

  it('standalone(설치본): 렌더 안 함', () => {
    mockState.isStandalone = true;
    renderWithProviders(<InstallFab />, { route: '/checklist' });
    expect(screen.queryByRole('button', fabName)).toBeNull();
  });

  it('데스크톱 일반 페이지: 렌더(배너 없음)', () => {
    mockMobile = false;
    renderWithProviders(<InstallFab />, { route: '/checklist' });
    expect(screen.getByRole('button', fabName)).toBeInTheDocument();
  });

  it('모바일 & 배너 미억제 & 원터치 가능: 배너가 화면 소유 → FAB 숨김', () => {
    mockMobile = true;
    mockSuppressed = false;
    mockState.isInstallable = true;
    renderWithProviders(<InstallFab />, { route: '/checklist' });
    expect(screen.queryByRole('button', fabName)).toBeNull();
  });

  it('모바일 & 배너 억제됨(닫은 뒤): FAB 상주', () => {
    mockMobile = true;
    mockSuppressed = true;
    renderWithProviders(<InstallFab />, { route: '/checklist' });
    expect(screen.getByRole('button', fabName)).toBeInTheDocument();
  });

  it('/budget: CoffeeFab 위로 수직 스택 오프셋 클래스 적용', () => {
    renderWithProviders(<InstallFab />, { route: '/budget' });
    const btn = screen.getByRole('button', fabName);
    expect(btn.className).toContain('5.25rem');
  });
});

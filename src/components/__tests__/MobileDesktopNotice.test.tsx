/** [CL-QA100-BTN-20260531] 컴포넌트 상호작용 검증 — MobileDesktopNotice */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, act } from '@/test/test-utils';
import { MobileDesktopNotice } from '../MobileDesktopNotice';
// [CL-MODAL-COORD-20260703-140000] 컴포넌트가 KST 날짜 키(toKSTDateString)로 조회하므로 테스트도 동일 함수로
//   키를 생성해야 한다. 기존 UTC(toISOString)는 KST 자정~오전9시 창에서 날짜가 갈려 매일 플래키였다(선재 결함).
import { toKSTDateString } from '@/lib/gamification/streak-calc';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, session: null, isLoading: false }),
}));

// Stub localStorage because the test runner env may not support .clear()
const localStorageStub: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (k: string) => localStorageStub[k] ?? null,
  setItem: (k: string, v: string) => { localStorageStub[k] = v; },
  removeItem: (k: string) => { delete localStorageStub[k]; },
  clear: () => { Object.keys(localStorageStub).forEach(k => delete localStorageStub[k]); },
});

describe('MobileDesktopNotice', () => {
  beforeEach(() => {
    // Clear stub state
    Object.keys(localStorageStub).forEach(k => delete localStorageStub[k]);
  });

  it('MN.1: 모바일 viewport + user 있음 → 800ms 후 다이얼로그 표시', async () => {
    vi.useFakeTimers();
    // mock width < 1024
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true, configurable: true });

    renderWithProviders(<MobileDesktopNotice />);

    // before timer fires — dialog should not be visible
    expect(screen.queryByRole('dialog')).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(900);
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('MN.2: 데스크톱 viewport (>=1024) → 다이얼로그 미표시', async () => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true, configurable: true });

    renderWithProviders(<MobileDesktopNotice />);

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByRole('dialog')).toBeNull();
    vi.useRealTimers();
  });

  it('MN.3: localStorage 키 세팅 시 → 다이얼로그 미표시 (중복 노출 방지)', async () => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true, configurable: true });

    const today = toKSTDateString();
    localStorage.setItem(`desktop_notice_user-1_${today}`, '1');

    renderWithProviders(<MobileDesktopNotice />);

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByRole('dialog')).toBeNull();
    vi.useRealTimers();
  });

  it('MN.4: 이미 오늘 본 경우 → 다이얼로그 미표시 (key 사전 세팅)', async () => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true, configurable: true });

    // Seed today's key explicitly (KST — 컴포넌트와 동일 기준)
    const today = toKSTDateString();
    localStorageStub[`desktop_notice_user-1_${today}`] = '1';

    renderWithProviders(<MobileDesktopNotice />);

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByRole('dialog')).toBeNull();
    vi.useRealTimers();
  });

  it('MN.5: 확인 버튼 클릭 → 다이얼로그 닫힘', async () => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true, configurable: true });

    renderWithProviders(<MobileDesktopNotice />);

    await act(async () => {
      vi.advanceTimersByTime(900);
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '확인' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    vi.useRealTimers();
  });
});

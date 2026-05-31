/** [CL-QA100-BTN-20260531] 컴포넌트 상호작용 검증 — UpdateNotice */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, act } from '@/test/test-utils';
import { UpdateNotice } from '../UpdateNotice';

const STORAGE_KEY = 'update_notice_v1.1.0';

// Stub localStorage
const localStorageStub: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (k: string) => localStorageStub[k] ?? null,
  setItem: (k: string, v: string) => { localStorageStub[k] = v; },
  removeItem: (k: string) => { delete localStorageStub[k]; },
  clear: () => { Object.keys(localStorageStub).forEach(k => delete localStorageStub[k]); },
});

describe('UpdateNotice', () => {
  beforeEach(() => {
    Object.keys(localStorageStub).forEach(k => delete localStorageStub[k]);
  });

  it('UN.1: localStorage 키 없음 → 500ms 후 다이얼로그 표시', async () => {
    vi.useFakeTimers();

    renderWithProviders(<UpdateNotice />);

    expect(screen.queryByText('새로운 기능이 추가되었어요')).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(screen.getByText('새로운 기능이 추가되었어요')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('UN.2: localStorage 키 있음 → 다이얼로그 미표시', async () => {
    vi.useFakeTimers();
    localStorage.setItem(STORAGE_KEY, '1');

    renderWithProviders(<UpdateNotice />);

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText('새로운 기능이 추가되었어요')).toBeNull();
    vi.useRealTimers();
  });

  it('UN.3: 확인 버튼 클릭 → 다이얼로그 닫힘', async () => {
    vi.useFakeTimers();

    renderWithProviders(<UpdateNotice />);

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(screen.getByText('새로운 기능이 추가되었어요')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '확인' }));

    expect(screen.queryByText('새로운 기능이 추가되었어요')).toBeNull();
    vi.useRealTimers();
  });

  it('UN.4: 표시 후 localStorage 키가 세팅됨', async () => {
    vi.useFakeTimers();

    renderWithProviders(<UpdateNotice />);

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(localStorageStub[STORAGE_KEY]).toBe('1');
    vi.useRealTimers();
  });

  it('UN.5: v1.1.0 버전 표시 및 업데이트 항목 포함', async () => {
    vi.useFakeTimers();

    renderWithProviders(<UpdateNotice />);

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(screen.getByText(/v1\.1\.0/)).toBeInTheDocument();
    expect(screen.getByText(/허니문 월드컵/)).toBeInTheDocument();
    vi.useRealTimers();
  });
});

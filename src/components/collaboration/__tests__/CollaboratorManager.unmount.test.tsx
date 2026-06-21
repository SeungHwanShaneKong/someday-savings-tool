// [CL-QUALITY-TIMER-20260621] CollaboratorManager '복사됨' 2s 타이머 누수 회귀 가드.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CollaboratorManager } from '@/components/collaboration/CollaboratorManager';

const h = vi.hoisted(() => ({
  collaborators: [] as unknown[],
  inviteUrl: 'https://moderninsightspot.com/invite/tok' as string | null,
  busy: false,
  createInvite: vi.fn(async () => 'https://moderninsightspot.com/invite/tok'),
  removeCollaborator: vi.fn(async () => {}),
  refresh: vi.fn(async () => {}),
}));
vi.mock('@/hooks/useCollaboration', () => ({ useCollaboration: () => h }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

describe('CollaboratorManager 복사 타이머 cleanup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => {}) } });
  });
  afterEach(() => { vi.runOnlyPendingTimers(); vi.useRealTimers(); });

  it('TMR.3 복사 후 언마운트 시 2s 배지 타이머 정리', async () => {
    const { unmount } = render(<CollaboratorManager budgetId="b1" isOwner />);
    await act(async () => {
      fireEvent.click(screen.getByText('복사'));
      await Promise.resolve(); // handleCopy async 마이크로태스크 flush
    });
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

// [CL-QUALITY-TIMER-20260621] InsightCard 400ms 타이머 누수 회귀 가드 — 언마운트 후 부모 setState 방지.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { InsightCard } from '@/components/budget/InsightCard';
import type { BudgetInsight } from '@/lib/budget-optimizer';

const insight: BudgetInsight = { id: 'x', title: 't', description: 'd', type: 'info', emoji: '💡' };

describe('InsightCard 타이머 cleanup', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.runOnlyPendingTimers(); vi.useRealTimers(); });

  it('TMR.1 언마운트 후 onDismiss 미호출(고아 타이머 정리)', () => {
    const onDismiss = vi.fn();
    const { unmount } = render(<InsightCard insight={insight} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByLabelText('인사이트 확인 완료'));
    unmount();
    act(() => { vi.advanceTimersByTime(500); });
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

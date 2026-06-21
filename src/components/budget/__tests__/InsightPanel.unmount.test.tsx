// [CL-QUALITY-TIMER-20260621] InsightPanel 650ms dismiss 타이머 누수 회귀 가드.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { InsightPanel } from '@/components/budget/InsightPanel';
import type { ExtendedBudgetItem } from '@/components/BudgetTable';

vi.mock('@/lib/budget-optimizer', () => ({
  generateBudgetInsights: () => [{ id: 'ins-1', title: 't', description: 'd', type: 'info', emoji: '💡' }],
  pickRandomInsights: (arr: unknown[]) => arr,
}));

const items = [
  { id: 'i1', budget_id: 'b1', category: 'c', sub_category: 's', amount: 100, is_paid: false, notes: null, unit_price: null, quantity: null, custom_name: null, is_custom: false },
] as unknown as ExtendedBudgetItem[];

describe('InsightPanel 타이머 cleanup', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.runOnlyPendingTimers(); vi.useRealTimers(); });

  it('TMR.2 언마운트 시 보류 650ms dismiss 타이머 정리', () => {
    const { unmount } = render(<InsightPanel items={items} />);
    fireEvent.click(screen.getByLabelText('인사이트 확인 완료'));
    act(() => { vi.advanceTimersByTime(400); }); // InsightCard 400ms → onDismiss → panel 650ms 스케줄
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

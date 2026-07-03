// [CL-TOP20-P3-CHECK-20260703-030000] 오버듀 배너 — 세션 1회 노출 + 스크롤 액션
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OverdueAlertBanner } from '../OverdueAlertBanner';

beforeEach(() => {
  sessionStorage.clear();
});

function renderBanner(onScrollToPeriod = vi.fn()) {
  const utils = render(
    <OverdueAlertBanner
      overdueCount={3}
      targetPeriodLabel="12~10개월 전"
      onScrollToPeriod={onScrollToPeriod}
    />,
  );
  return { ...utils, onScrollToPeriod };
}

describe('OverdueAlertBanner', () => {
  it('O1 첫 진입 → role=alert 로 카운트/대상 기간 안내 노출', () => {
    renderBanner();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('기한이 지난 할 일이 3개 있어요');
    expect(alert).toHaveTextContent('12~10개월 전 시기부터 차근차근 따라잡아 볼까요?');
  });

  it('O2 "밀린 일정 보러 가기" 클릭 → 스크롤 콜백 호출', () => {
    const { onScrollToPeriod } = renderBanner();
    fireEvent.click(screen.getByRole('button', { name: /밀린 일정 보러 가기/ }));
    expect(onScrollToPeriod).toHaveBeenCalledTimes(1);
  });

  it('O3 세션 1회 — 한 번 노출된 뒤 재마운트하면 미노출', () => {
    const first = renderBanner();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    first.unmount();

    renderBanner();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('O4 닫기 버튼 → 즉시 사라짐', () => {
    renderBanner();
    fireEvent.click(screen.getByRole('button', { name: '기한 초과 알림 닫기' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('O5 overdueCount=0 방어 → 렌더하지 않음', () => {
    render(
      <OverdueAlertBanner
        overdueCount={0}
        targetPeriodLabel="12~10개월 전"
        onScrollToPeriod={vi.fn()}
      />,
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

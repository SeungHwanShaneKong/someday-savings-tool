/** [CL-QA100-BTN-20260531] 컴포넌트 상호작용 검증 — AIExternalNavigationOverlay */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AIExternalNavigationOverlay } from '../AIExternalNavigationOverlay';

describe('AIExternalNavigationOverlay', () => {
  it('OV.1: open=true → 타이틀 텍스트 렌더', () => {
    render(<AIExternalNavigationOverlay open={true} title="AI 허니문 큐레이션 열기" />);
    expect(screen.getByText('AI 허니문 큐레이션 열기')).toBeInTheDocument();
  });

  it('OV.2: open=true → role=status 오버레이 렌더', () => {
    render(<AIExternalNavigationOverlay open={true} title="테스트 타이틀" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('OV.3: open=true → 첫 단계 메시지 "AI 모델 깨우는 중" 표시', () => {
    render(<AIExternalNavigationOverlay open={true} title="테스트" />);
    expect(screen.getByText('AI 모델 깨우는 중')).toBeInTheDocument();
  });

  it('OV.4: open=false → 아무것도 렌더하지 않음', () => {
    const { container } = render(<AIExternalNavigationOverlay open={false} title="숨김 타이틀" />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('숨김 타이틀')).toBeNull();
  });

  it('OV.5: open=true → aria-busy=true', () => {
    render(<AIExternalNavigationOverlay open={true} title="테스트" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('OV.6: open=true → aria-live=polite', () => {
    render(<AIExternalNavigationOverlay open={true} title="테스트" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('OV.7: 1100ms 후 "AI 모델 연결 중" 메시지로 전환', async () => {
    vi.useFakeTimers();
    render(<AIExternalNavigationOverlay open={true} title="페이즈 테스트" />);

    expect(screen.getByText('AI 모델 깨우는 중')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.getByText('AI 모델 연결 중')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('OV.8: 2200ms 후 "곧 연결 완료" 메시지로 전환', async () => {
    vi.useFakeTimers();
    render(<AIExternalNavigationOverlay open={true} title="최종 페이즈" />);

    await act(async () => {
      vi.advanceTimersByTime(2300);
    });

    expect(screen.getByText('곧 연결 완료')).toBeInTheDocument();
    vi.useRealTimers();
  });
});

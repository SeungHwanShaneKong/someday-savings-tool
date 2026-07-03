// [CL-TOP20-R50-UI-20260703-094000] NudgeBanner — D-day 저장 실패 에러 문구(표시·재시도 클리어) 계약
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NudgeBanner } from '../NudgeBanner';

function renderWithSave(onSave: (date: string, time: string) => Promise<void>) {
  return render(
    <NudgeBanner type="no-dday" onSave={onSave} actionLabel="D-day 설정하기" />,
  );
}

/** 현재 달력에서 '오늘' 날짜 클릭 (outside-day 제외 → 결정론 — NudgeBanner.preview.test 컨벤션) */
function clickToday() {
  const dayNum = String(new Date().getDate());
  const candidates = screen
    .getAllByRole('gridcell')
    .filter((b) => b.textContent === dayNum && !b.className.includes('day-outside'));
  expect(candidates.length).toBeGreaterThan(0);
  fireEvent.click(candidates[0]);
}

async function openPickAndSave() {
  fireEvent.click(screen.getByRole('button', { name: /D-day 설정하기/ }));
  clickToday();
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
}

describe('NudgeBanner — D-day 저장 실패 피드백', () => {
  it('E1 onSave 거부 → destructive 에러 문구 + role=alert 노출, 팝오버는 유지(즉시 재시도 가능)', async () => {
    const onSave = vi.fn(async () => {
      throw new Error('network down');
    });
    // 테스트 소음 방지 — 소스의 console.error 로깅은 계약 유지
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithSave(onSave);

    await openPickAndSave();

    const error = await screen.findByTestId('dday-save-error');
    expect(error).toHaveTextContent('저장에 실패했어요');
    expect(error).toHaveAttribute('role', 'alert');
    expect(error.className).toContain('text-destructive');
    // 팝오버 유지 → 저장 버튼이 그대로 존재
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('E2 실패 후 재시도 성공 → 에러 문구 클리어 + 팝오버 닫힘', async () => {
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce(undefined) as (date: string, time: string) => Promise<void>;
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithSave(onSave);

    await openPickAndSave();
    await screen.findByTestId('dday-save-error');

    // 재시도 — 시작 시점에 에러 클리어, 성공 시 팝오버 닫힘
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => {
      expect(screen.queryByTestId('dday-save-error')).toBeNull();
      expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
    });
    expect(onSave).toHaveBeenCalledTimes(2);
    consoleSpy.mockRestore();
  });

  it('E3 성공 경로에는 에러 문구가 나타나지 않는다(회귀 0)', async () => {
    const onSave = vi.fn(async () => {});
    renderWithSave(onSave);

    await openPickAndSave();

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
    });
    expect(screen.queryByTestId('dday-save-error')).toBeNull();
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

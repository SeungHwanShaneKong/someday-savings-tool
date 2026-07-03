// [CL-SEC-AUDIT-20260703-101500] #4 error — 저장 진행 중 외부클릭으로 팝오버 닫힘 → 폼/에러 유실 방지 계약
//   재현: onSave 가 pending 인 상태에서 onOpenChange(false)(외부클릭 시뮬)가 발생하면
//   수정 전엔 팝오버(폼)가 언마운트돼 진행 중 입력/에러가 사라진다. 수정 후엔 saving 중 close 무시.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { NudgeBanner } from '../NudgeBanner';

function renderWithSave(onSave: (date: string, time: string) => Promise<void>) {
  return render(
    <NudgeBanner type="no-dday" onSave={onSave} actionLabel="D-day 설정하기" />,
  );
}

/** 현재 달력에서 '오늘' 날짜 클릭(outside-day 제외 → 결정론) */
function clickToday() {
  const dayNum = String(new Date().getDate());
  const candidates = screen
    .getAllByRole('gridcell')
    .filter((b) => b.textContent === dayNum && !b.className.includes('day-outside'));
  expect(candidates.length).toBeGreaterThan(0);
  fireEvent.click(candidates[0]);
}

/**
 * Radix Popover 외부클릭/ESC 는 onOpenChange(false) 로 귀결된다.
 * 저장 진행 중(핸들이 pending) 그 이벤트가 오면 팝오버가 닫히면 안 된다.
 * → 실제 Radix dismiss 를 안정적으로 시뮬하기 위해 ESC 키(escapeKeyDown) 사용.
 */
describe('NudgeBanner — 저장 진행 중 팝오버 닫힘 방지(#4 error)', () => {
  it('G1 저장 pending 중 ESC(외부 dismiss) → 팝오버 유지(폼·저장 버튼 언마운트 안 됨)', async () => {
    // onSave 를 수동 resolve 로 제어 — pending 상태를 명시적으로 유지
    let resolveSave: () => void = () => {};
    const onSave = vi.fn(
      () =>
        new Promise<void>((res) => {
          resolveSave = res;
        }),
    );
    renderWithSave(onSave);

    // 팝오버 열기 → 날짜 선택 → 저장 클릭(pending 진입)
    fireEvent.click(screen.getByRole('button', { name: /D-day 설정하기/ }));
    clickToday();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    // 저장 호출됨 + 여전히 pending
    expect(onSave).toHaveBeenCalledTimes(1);

    // 저장 진행 중 사용자가 팝오버 밖 클릭/ESC → Radix 가 dismiss(escapeKeyDown) 시도
    const content = screen.getByRole('dialog');
    fireEvent.keyDown(content, { key: 'Escape', code: 'Escape' });

    // 수정 전: 팝오버가 닫혀 '저장' 버튼(폼)이 사라짐 → 진행 중 폼/에러 유실
    // 수정 후: saving 가드로 close 무시 → 저장 버튼 그대로 존재
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /저장/ })).toBeInTheDocument();
    });

    // 정리: pending resolve
    await act(async () => {
      resolveSave();
    });
  });

  it('G2 저장 pending 중 dismiss → 실패 후에도 팝오버 유지 + 에러 문구 노출(재시도 가능)', async () => {
    let rejectSave: (e: Error) => void = () => {};
    const onSave = vi.fn(
      () =>
        new Promise<void>((_res, rej) => {
          rejectSave = rej;
        }),
    );
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithSave(onSave);

    fireEvent.click(screen.getByRole('button', { name: /D-day 설정하기/ }));
    clickToday();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    // pending 중 외부 dismiss 시도
    const content = screen.getByRole('dialog');
    fireEvent.keyDown(content, { key: 'Escape', code: 'Escape' });

    // 이제 저장 실패
    await act(async () => {
      rejectSave(new Error('network down'));
    });

    // 팝오버 유지 + 에러 노출 → 사용자가 재시도 가능
    const error = await screen.findByTestId('dday-save-error');
    expect(error).toHaveTextContent('저장에 실패했어요');
    expect(screen.getByRole('button', { name: /저장/ })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('G3 저장 진행 중이 아닐 때 ESC → 정상적으로 팝오버 닫힘(회귀 0)', async () => {
    const onSave = vi.fn(async () => {});
    renderWithSave(onSave);

    // 팝오버만 열고(저장 안 함) ESC → 정상 닫힘
    fireEvent.click(screen.getByRole('button', { name: /D-day 설정하기/ }));
    const content = screen.getByRole('dialog');
    fireEvent.keyDown(content, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});

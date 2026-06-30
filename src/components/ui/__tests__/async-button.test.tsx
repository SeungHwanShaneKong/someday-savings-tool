// [CL-BTNPERFECT-20260629] AsyncButton 단위 — pending disabled+aria-busy+스피너, 연타 1회, 외부 pending.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AsyncButton } from '@/components/ui/async-button';

describe('AsyncButton', () => {
  it('AB.1 외부 pending → disabled + aria-busy + 스피너', () => {
    render(<AsyncButton pending loadingText="저장 중…">저장</AsyncButton>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn.querySelector('svg.animate-spin')).toBeTruthy();
    expect(btn).toHaveTextContent('저장 중…');
  });

  it('AB.2 async onClick → 진행 중 disabled, 완료 후 복구', async () => {
    let resolve!: () => void;
    const onClick = vi.fn(() => new Promise<void>((r) => { resolve = r; }));
    render(<AsyncButton onClick={onClick}>실행</AsyncButton>);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    await waitFor(() => expect(btn).toBeDisabled());
    expect(btn).toHaveAttribute('aria-busy', 'true');
    resolve();
    await waitFor(() => expect(btn).not.toBeDisabled());
  });

  it('AB.3 진행 중 연타 → onClick 1회만', async () => {
    const onClick = vi.fn(() => new Promise<void>(() => {})); // 미해결 유지
    render(<AsyncButton onClick={onClick}>실행</AsyncButton>);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);
    await waitFor(() => expect(btn).toBeDisabled());
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('AB.4 동기 onClick(프라미스 아님) → 정상 동작, busy 미진입', () => {
    const onClick = vi.fn();
    render(<AsyncButton onClick={onClick}>클릭</AsyncButton>);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(btn).not.toBeDisabled();
  });
});

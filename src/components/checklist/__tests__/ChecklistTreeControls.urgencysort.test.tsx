// [CL-TOP20-P3-CHECK-20260703-030000] 트리 컨트롤 바 — "긴급순 보기" 토글
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChecklistTreeControls } from '../ChecklistTreeControls';

const baseProps = {
  items: [],
  onExpandAll: vi.fn(),
  onCollapseAll: vi.fn(),
};

describe('ChecklistTreeControls — 긴급순 토글', () => {
  it('T1 핸들러 전달 시 토글 노출, 기본 off(aria-pressed=false)', () => {
    render(
      <ChecklistTreeControls
        {...baseProps}
        urgencySort={false}
        onUrgencySortChange={vi.fn()}
      />,
    );
    const toggle = screen.getByRole('button', { name: '긴급순 보기' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('T2 클릭 → onUrgencySortChange(true) 호출(제어 컴포넌트)', () => {
    const onChange = vi.fn();
    render(
      <ChecklistTreeControls
        {...baseProps}
        urgencySort={false}
        onUrgencySortChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '긴급순 보기' }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('T3 on 상태 → aria-pressed=true, 클릭 시 false 로 되돌림', () => {
    const onChange = vi.fn();
    render(
      <ChecklistTreeControls
        {...baseProps}
        urgencySort={true}
        onUrgencySortChange={onChange}
      />,
    );
    const toggle = screen.getByRole('button', { name: '긴급순 보기' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('T4 핸들러 미전달(기존 사용처) → 토글 미노출, 기존 컨트롤은 유지(회귀 0)', () => {
    render(<ChecklistTreeControls {...baseProps} />);
    expect(screen.queryByRole('button', { name: '긴급순 보기' })).toBeNull();
    expect(screen.getByRole('button', { name: '전체 펼치기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '전체 접기' })).toBeInTheDocument();
  });
});

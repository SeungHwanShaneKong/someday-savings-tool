// [CL-BTNAUDIT3-20260704 | 터치타깃 스모크] 트리 컨트롤 아이콘 버튼 렌더/클릭 + 히트영역 확대 회귀 가드
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChecklistTreeControls } from '../ChecklistTreeControls';

const baseProps = {
  items: [],
  onExpandAll: vi.fn(),
  onCollapseAll: vi.fn(),
};

describe('ChecklistTreeControls — 터치타깃 확대(접근성)', () => {
  it('전체 펼치기/접기 버튼이 렌더되고 클릭 시 핸들러 호출', () => {
    const onExpandAll = vi.fn();
    const onCollapseAll = vi.fn();
    render(
      <ChecklistTreeControls
        {...baseProps}
        onExpandAll={onExpandAll}
        onCollapseAll={onCollapseAll}
      />,
    );

    const expandBtn = screen.getByRole('button', { name: '전체 펼치기' });
    const collapseBtn = screen.getByRole('button', { name: '전체 접기' });

    fireEvent.click(expandBtn);
    fireEvent.click(collapseBtn);

    expect(onExpandAll).toHaveBeenCalledOnce();
    expect(onCollapseAll).toHaveBeenCalledOnce();
  });

  it('아이콘 버튼이 모바일 44px 히트영역 클래스(min-h-11 min-w-11)를 가진다', () => {
    render(<ChecklistTreeControls {...baseProps} />);

    const expandBtn = screen.getByRole('button', { name: '전체 펼치기' });
    const collapseBtn = screen.getByRole('button', { name: '전체 접기' });

    for (const btn of [expandBtn, collapseBtn]) {
      expect(btn.className).toContain('min-h-11');
      expect(btn.className).toContain('min-w-11');
      // md 이상에서는 기존 크기로 복원(시각적 회귀 방지)
      expect(btn.className).toContain('md:min-h-0');
      expect(btn.className).toContain('md:min-w-0');
    }
  });

  it('아이콘 버튼 내부 lucide 아이콘은 aria-hidden 이고 버튼은 한국어 접근명을 가진다', () => {
    const { container } = render(<ChecklistTreeControls {...baseProps} />);

    const expandBtn = screen.getByRole('button', { name: '전체 펼치기' });
    const svg = expandBtn.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    // 아이콘 시각 크기는 유지(w-4 h-4)
    expect(svg?.getAttribute('class') ?? '').toContain('w-4');
    // 컨테이너 gap 증대(인접 오터치 방지)로 두 버튼이 공존
    expect(container.querySelectorAll('button').length).toBeGreaterThanOrEqual(2);
  });
});

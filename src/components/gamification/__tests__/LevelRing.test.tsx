// [CL-GAMIFY-QA50-20260418-224158] LevelRing 렌더 테스트 (MECE 5)
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LevelRing } from '../LevelRing';

describe('LevelRing', () => {
  it('E1: totalPoints=0 → 레벨 1 + 0pt 표시', () => {
    render(<LevelRing totalPoints={0} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('0pt')).toBeInTheDocument();
  });

  it('E2: totalPoints=250 → 레벨 2', () => {
    render(<LevelRing totalPoints={250} />);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('250pt')).toBeInTheDocument();
  });

  it('E3: totalPoints=900 → 레벨 4 (경계값)', () => {
    render(<LevelRing totalPoints={900} />);
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('E4: aria-valuenow/min/max 올바름', () => {
    render(<LevelRing totalPoints={100} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    // level 2 시작(100pt), 0% progress in level 2
    expect(bar.getAttribute('aria-valuenow')).toBe('0');
  });

  it('E5: size prop 반영 (120px 기본)', () => {
    const { container } = render(<LevelRing totalPoints={100} size={80} />);
    const ring = container.querySelector('[role="progressbar"]') as HTMLElement;
    expect(ring.style.width).toBe('80px');
    expect(ring.style.height).toBe('80px');
  });
});

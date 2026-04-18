// [CL-GAMIFY-QA50-20260418-224158] StreakFlame 렌더 테스트 (MECE 5)
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StreakFlame } from '../StreakFlame';

describe('StreakFlame', () => {
  it('E1: days=0 → 🔥 + 회색톤 (cold state)', () => {
    render(<StreakFlame days={0} variant="login" />);
    // 숫자 0 노출
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByRole('status').className).toContain('text-muted-foreground');
  });

  it('E2: days=3 → 🔥 + hot state (orange 계열)', () => {
    render(<StreakFlame days={3} variant="login" />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByRole('status').className).toContain('orange');
  });

  it('E3: 마일스톤 아이콘 변화 — 7🥉/14🥈/30🥇/100💎/365🌟', () => {
    const cases: Array<[number, string]> = [
      [7, '🥉'],
      [14, '🥈'],
      [30, '🥇'],
      [100, '💎'],
      [365, '🌟'],
    ];
    for (const [days, expectedEmoji] of cases) {
      const { unmount } = render(<StreakFlame days={days} />);
      expect(screen.getByText(expectedEmoji)).toBeInTheDocument();
      unmount();
    }
  });

  it('E4: variant별 aria-label 다름 (login vs checklist)', () => {
    const { rerender } = render(<StreakFlame days={5} variant="login" />);
    expect(screen.getByRole('status').getAttribute('aria-label')).toContain('로그인');
    rerender(<StreakFlame days={5} variant="checklist" />);
    expect(screen.getByRole('status').getAttribute('aria-label')).toContain('체크리스트');
  });

  it('E5: showNextMilestone → 다음 마일스톤까지 남은 일수 노출', () => {
    render(<StreakFlame days={5} showNextMilestone />);
    // 7일까지 2일 남음 → "· 2일 더" 포함
    expect(screen.getByText(/2일 더/)).toBeInTheDocument();
  });
});

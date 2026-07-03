// [CL-TOP20-P4-GAMIFY-20260703-040000] StreakProgressRing 렌더 테스트
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StreakProgressRing } from '../StreakProgressRing';

describe('StreakProgressRing', () => {
  it('R1: days=6 → progressbar aria-valuenow=86 (6/7 구간 진행률)', () => {
    render(<StreakProgressRing days={6} variant="login" />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('86');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
  });

  it('R2: 하단 카운트다운 "🏆 n일 더!" 노출 (days=6 → 1일)', () => {
    render(<StreakProgressRing days={6} variant="login" />);
    expect(screen.getByText(/1일 더!/)).toBeInTheDocument();
  });

  it('R3: days=365 → 최고 기록 문구 + valuenow 100', () => {
    render(<StreakProgressRing days={365} variant="login" />);
    expect(screen.getByText(/최고 기록 달성/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
    expect(screen.getByRole('progressbar').getAttribute('aria-label')).toContain(
      '최고 마일스톤 달성',
    );
  });

  it('R4: 중앙에 기존 StreakFlame 재사용 — 일수·status role 유지(정보 유실 0)', () => {
    render(<StreakProgressRing days={5} variant="login" />);
    const flame = screen.getByRole('status');
    expect(flame.getAttribute('aria-label')).toBe('로그인 연속 5일');
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('R5: variant=checklist → progressbar aria-label 에 체크리스트 + 남은 일수', () => {
    render(<StreakProgressRing days={10} variant="checklist" />);
    const label = screen.getByRole('progressbar').getAttribute('aria-label') ?? '';
    expect(label).toContain('체크리스트');
    expect(label).toContain('14일까지 4일 남음');
  });
});

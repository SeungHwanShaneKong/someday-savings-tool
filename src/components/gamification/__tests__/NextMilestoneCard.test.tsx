// [CL-TOP20-P4-GAMIFY-20260703-040000] NextMilestoneCard 렌더·null 처리 테스트
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextMilestoneCard } from '../NextMilestoneCard';
import type { NextMilestoneCardProps } from '../NextMilestoneCard';

const base: NextMilestoneCardProps = {
  loginStreakDays: 6,
  checklistStreakDays: 2,
  loginActiveToday: true,
  checklistActiveToday: false,
  loginNextMilestoneIn: 1,
  checklistNextMilestoneIn: 5,
};

describe('NextMilestoneCard', () => {
  it('N1: login 이 더 가까움(1일) → "내일 오면 🔥 7일 달성!"', () => {
    render(<NextMilestoneCard {...base} />);
    expect(screen.getByText(/내일 오면 🔥 7일 달성!/)).toBeInTheDocument();
  });

  it('N2: checklist 가 더 가까우면 체크리스트 문구', () => {
    render(
      <NextMilestoneCard
        {...base}
        loginStreakDays={1}
        loginNextMilestoneIn={6}
        checklistStreakDays={12}
        checklistNextMilestoneIn={2}
      />,
    );
    expect(screen.getByText(/2일 더 완료하면 ✅ 14일 달성!/)).toBeInTheDocument();
  });

  it('N3: 둘 다 null(최고 마일스톤) → 최고 기록 문구로 폴백', () => {
    render(
      <NextMilestoneCard
        {...base}
        loginStreakDays={365}
        checklistStreakDays={365}
        loginNextMilestoneIn={null}
        checklistNextMilestoneIn={null}
      />,
    );
    expect(screen.getByText(/모든 마일스톤 달성/)).toBeInTheDocument();
  });

  it('N4: isLoading → 아무것도 렌더하지 않음(레이아웃 점프 방지)', () => {
    const { container } = render(<NextMilestoneCard {...base} isLoading />);
    expect(container.firstChild).toBeNull();
  });

  it('N5: 오늘 진행 요약 칩 — 방문 완료 / 체크리스트 전', () => {
    render(<NextMilestoneCard {...base} />);
    expect(screen.getByText('오늘 방문 완료')).toBeInTheDocument();
    expect(screen.getByText('오늘 체크리스트 전')).toBeInTheDocument();
  });

  it('N6: section aria-label 로 접근 가능', () => {
    render(<NextMilestoneCard {...base} />);
    expect(
      screen.getByRole('region', { name: '다음 방문 목표' }),
    ).toBeInTheDocument();
  });
});

// [CL-GAMIFY-QA50-20260418-224158] BadgeUnlockModal 렌더 테스트 (MECE 5)
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BadgeUnlockModal } from '../BadgeUnlockModal';
import type { BadgeDefinition } from '@/lib/gamification/types';

const mkBadge = (over: Partial<BadgeDefinition> = {}): BadgeDefinition => ({
  id: 'b1',
  slug: 'test',
  name_ko: '테스트 뱃지',
  description: '축하합니다',
  icon_emoji: '🎉',
  category: 'starter',
  rarity: 'common',
  points_reward: 50,
  unlock_rule: { type: 'first_budget' },
  display_order: 0,
  is_active: true,
  ...over,
});

describe('BadgeUnlockModal', () => {
  it('E1: badge=null → 렌더하지 않음', () => {
    const { container } = render(
      <BadgeUnlockModal open={true} badge={null} pointsGained={0} onClose={() => {}} />,
    );
    // dialog 자체가 mount되지 않음
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('E2: rarity=common → 기본 헤드라인 "뱃지 획득!"', () => {
    render(<BadgeUnlockModal open={true} badge={mkBadge()} pointsGained={50} onClose={() => {}} />);
    expect(screen.getByText(/뱃지 획득/)).toBeInTheDocument();
    expect(screen.getByText('테스트 뱃지')).toBeInTheDocument();
    expect(screen.getByText('🎉')).toBeInTheDocument();
  });

  it('E3: rarity=rare → 🌟 레어 헤드라인', () => {
    render(<BadgeUnlockModal open badge={mkBadge({ rarity: 'rare' })} pointsGained={100} onClose={() => {}} />);
    expect(screen.getByText(/레어 뱃지/)).toBeInTheDocument();
  });

  it('E4: rarity=legendary → 👑 전설 헤드라인', () => {
    render(<BadgeUnlockModal open badge={mkBadge({ rarity: 'legendary' })} pointsGained={500} onClose={() => {}} />);
    expect(screen.getByText(/전설 뱃지/)).toBeInTheDocument();
  });

  it('E5: pointsGained > 0 → +pt 표시 + 확인 클릭 → onClose', () => {
    const handler = vi.fn();
    render(<BadgeUnlockModal open badge={mkBadge()} pointsGained={250} onClose={handler} />);
    expect(screen.getByText(/\+250pt/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('확인'));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

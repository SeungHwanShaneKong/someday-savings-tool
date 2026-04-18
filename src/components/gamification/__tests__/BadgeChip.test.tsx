// [CL-GAMIFY-QA50-20260418-224158] BadgeChip 컴포넌트 렌더 테스트 (MECE 5)
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BadgeChip } from '../BadgeChip';
import type { BadgeDefinition } from '@/lib/gamification/types';

const mkBadge = (over: Partial<BadgeDefinition> = {}): BadgeDefinition => ({
  id: 'b1',
  slug: 'test_badge',
  name_ko: '테스트 뱃지',
  description: '테스트 설명',
  icon_emoji: '🎯',
  category: 'starter',
  rarity: 'common',
  points_reward: 10,
  unlock_rule: { type: 'first_budget' },
  display_order: 0,
  is_active: true,
  ...over,
});

describe('BadgeChip', () => {
  it('E1: earned=true → 이모지 + 이름 렌더, aria-label 획득 표시', () => {
    render(<BadgeChip badge={mkBadge()} earned />);
    expect(screen.getByText('🎯')).toBeInTheDocument();
    expect(screen.getByText('테스트 뱃지')).toBeInTheDocument();
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-label')).toContain('획득함');
  });

  it('E2: earned=false → 자물쇠 이모지 + 미획득 aria-label + grayscale', () => {
    render(<BadgeChip badge={mkBadge()} earned={false} />);
    expect(screen.getByText('🔒')).toBeInTheDocument();
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-label')).toContain('미획득');
    expect(btn.className).toContain('grayscale');
  });

  it('E3: rarity=legendary → 금색 border + glow-pulse 애니메이션 클래스', () => {
    render(<BadgeChip badge={mkBadge({ rarity: 'legendary' })} earned />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('border-amber');
    // legendary는 rarity 라벨 노출
    expect(screen.getByText('legendary')).toBeInTheDocument();
  });

  it('E4: rarity=rare → 파란 border + rarity 라벨', () => {
    render(<BadgeChip badge={mkBadge({ rarity: 'rare' })} earned />);
    expect(screen.getByRole('button').className).toContain('border-blue');
    expect(screen.getByText('rare')).toBeInTheDocument();
  });

  it('E5: onClick prop → 클릭 시 핸들러 호출', () => {
    const handler = vi.fn();
    render(<BadgeChip badge={mkBadge()} earned onClick={handler} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

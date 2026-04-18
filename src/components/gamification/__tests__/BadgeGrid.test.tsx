// [CL-GAMIFY-QA50-20260418-224158] BadgeGrid 렌더 테스트 (MECE 5)
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BadgeGrid } from '../BadgeGrid';
import type { BadgeDefinition, UserEarnedBadge } from '@/lib/gamification/types';

const makeBadge = (slug: string, category: BadgeDefinition['category'], over: Partial<BadgeDefinition> = {}): BadgeDefinition => ({
  id: `id-${slug}`,
  slug,
  name_ko: slug,
  description: `d-${slug}`,
  icon_emoji: '🎯',
  category,
  rarity: 'common',
  points_reward: 10,
  unlock_rule: { type: 'first_budget' },
  display_order: 0,
  is_active: true,
  ...over,
});

const makeEarned = (badgeId: string): UserEarnedBadge => ({
  id: `e-${badgeId}`,
  user_id: 'u1',
  badge_id: badgeId,
  earned_at: '2026-04-18T00:00:00Z',
});

describe('BadgeGrid', () => {
  it('E1: 빈 definitions → 획득 0 / 전체 0', () => {
    render(<BadgeGrid definitions={[]} earned={[]} />);
    expect(screen.getByText(/획득/).textContent).toContain('0');
  });

  it('E2: groupByCategory=false → 플랫 그리드', () => {
    const defs = [
      makeBadge('a', 'starter'),
      makeBadge('b', 'planner'),
    ];
    render(<BadgeGrid definitions={defs} earned={[]} groupByCategory={false} />);
    // 플랫 모드는 카테고리 헤더 없음
    expect(screen.queryByText(/🎯 시작/)).not.toBeInTheDocument();
  });

  it('E3: groupByCategory=true → 카테고리별 섹션', () => {
    const defs = [
      makeBadge('starter_1', 'starter'),
      makeBadge('planner_1', 'planner'),
    ];
    render(<BadgeGrid definitions={defs} earned={[]} groupByCategory />);
    expect(screen.getByText(/🎯 시작/)).toBeInTheDocument();
    expect(screen.getByText(/💼 플래너/)).toBeInTheDocument();
  });

  it('E4: earned 개수 카운트 정확', () => {
    const defs = [
      makeBadge('a', 'starter'),
      makeBadge('b', 'starter'),
      makeBadge('c', 'starter'),
    ];
    const earned = [makeEarned('id-a'), makeEarned('id-b')];
    render(<BadgeGrid definitions={defs} earned={earned} groupByCategory />);
    // "획득 2" 가 노출되어야 함
    const header = screen.getByText('2');
    expect(header).toBeInTheDocument();
  });

  it('E5: display_order 오름차순 정렬', () => {
    const defs = [
      makeBadge('z-last', 'starter', { display_order: 99 }),
      makeBadge('a-first', 'starter', { display_order: 1 }),
    ];
    render(<BadgeGrid definitions={defs} earned={[]} groupByCategory={false} />);
    const buttons = screen.getAllByRole('button');
    // 첫 번째 버튼이 display_order=1 뱃지
    expect(buttons[0].getAttribute('aria-label')).toContain('a-first');
  });
});

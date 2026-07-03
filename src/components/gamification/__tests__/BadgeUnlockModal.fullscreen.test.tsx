// [CL-TOP20-P4-GAMIFY-20260703-040000] BadgeUnlockModal 풀스크린 변형(첫 배지) 테스트
// 기존 BadgeUnlockModal.test.tsx 는 무수정 유지 — 신규 변형만 별도 파일로 검증.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BadgeUnlockModal } from '../BadgeUnlockModal';
import type { BadgeDefinition } from '@/lib/gamification/types';

const mkBadge = (over: Partial<BadgeDefinition> = {}): BadgeDefinition => ({
  id: 'b1',
  slug: 'first',
  name_ko: '첫 걸음',
  description: '첫 예산을 만들었어요',
  icon_emoji: '👣',
  category: 'starter',
  rarity: 'common',
  points_reward: 50,
  unlock_rule: { type: 'first_budget' },
  display_order: 0,
  is_active: true,
  ...over,
});

const originalMatchMedia = window.matchMedia;
afterEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: originalMatchMedia,
  });
});

/** prefers-reduced-motion 을 켠 matchMedia 스텁 */
function enableReducedMotion() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe('BadgeUnlockModal — fullscreen(첫 배지) 변형', () => {
  it('FS1: fullscreen → 첫 배지 헤드라인 + dialog 렌더', () => {
    render(
      <BadgeUnlockModal open badge={mkBadge()} pointsGained={50} onClose={() => {}} fullscreen />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/첫 번째 뱃지 획득/)).toBeInTheDocument();
    expect(screen.getByText(/웨딩 준비 여정의 시작/)).toBeInTheDocument();
  });

  it('FS2: fullscreen 파티클 총량 상한 — 1 이상 40 이하', () => {
    render(
      <BadgeUnlockModal open badge={mkBadge()} pointsGained={50} onClose={() => {}} fullscreen />,
    );
    // 중앙 버스트(common=10) + 위성 3×7=21 → 31 (상한 40)
    const particles = document.querySelectorAll('.celebration-particle');
    expect(particles.length).toBeGreaterThan(0);
    expect(particles.length).toBeLessThanOrEqual(40);
  });

  it('FS3: 회귀 가드 — fullscreen 미지정 시 기존 헤드라인·파티클 강도 불변', () => {
    render(
      <BadgeUnlockModal open badge={mkBadge()} pointsGained={50} onClose={() => {}} />,
    );
    expect(screen.getByText(/뱃지 획득!/)).toBeInTheDocument();
    expect(screen.queryByText(/첫 번째 뱃지 획득/)).toBeNull();
    // 일반 common 배지는 중앙 버스트 10개만 (위성 없음)
    const particles = document.querySelectorAll('.celebration-particle');
    expect(particles.length).toBe(10);
  });

  it('FS4: fullscreen + 확인 클릭 → onClose 호출', () => {
    const handler = vi.fn();
    render(
      <BadgeUnlockModal open badge={mkBadge()} pointsGained={50} onClose={handler} fullscreen />,
    );
    fireEvent.click(screen.getByText('확인'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('FS5: reduced-motion → 파티클 0 (정적 축하)', () => {
    enableReducedMotion();
    render(
      <BadgeUnlockModal open badge={mkBadge()} pointsGained={50} onClose={() => {}} fullscreen />,
    );
    expect(document.querySelectorAll('.celebration-particle').length).toBe(0);
    // 콘텐츠(제목·배지명)는 정적으로 온전히 노출
    expect(screen.getByText(/첫 번째 뱃지 획득/)).toBeInTheDocument();
    expect(screen.getByText('첫 걸음')).toBeInTheDocument();
  });
});

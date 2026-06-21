// [CL-ANIM-UPGRADE-20260621-150000] CelebrationBurst 단위 테스트
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { CelebrationBurst } from '../celebration-burst';

const mockReducedMotion = (matches: boolean) =>
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList);

describe('CelebrationBurst', () => {
  afterEach(() => vi.restoreAllMocks());

  it('active + 모션 허용 → 요청한 개수만큼 파티클 렌더', async () => {
    const { container } = render(<CelebrationBurst active count={12} />);
    await waitFor(() =>
      expect(container.querySelectorAll('.celebration-particle').length).toBe(12)
    );
  });

  it('reduced-motion → 파티클 0 (정적)', () => {
    mockReducedMotion(true);
    const { container } = render(<CelebrationBurst active count={12} />);
    expect(container.querySelectorAll('.celebration-particle').length).toBe(0);
  });

  it('inactive → 파티클 0', () => {
    const { container } = render(<CelebrationBurst active={false} count={12} />);
    expect(container.querySelectorAll('.celebration-particle').length).toBe(0);
  });
});

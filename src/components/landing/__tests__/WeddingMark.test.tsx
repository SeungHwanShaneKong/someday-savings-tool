// [CL-TOP20-P1-MARK-20260703-010000] WeddingMark 단위 테스트 — 렌더/size/색상 토큰 규율
import { describe, it, expect } from 'vitest';
import { render } from '@/test/test-utils';
import { WeddingMark } from '../WeddingMark';

describe('WeddingMark', () => {
  it('svg 를 렌더하고 기본 size 40 이 width/height 에 반영되며 장식용(aria-hidden)이다', () => {
    const { container } = render(<WeddingMark />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('width', '40');
    expect(svg).toHaveAttribute('height', '40');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('viewBox', '0 0 48 48');
  });

  it('size prop 이 width/height 에 반영되고 className 이 전달된다', () => {
    const { container } = render(<WeddingMark size={64} className="text-primary" />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('width', '64');
    expect(svg).toHaveAttribute('height', '64');
    expect(svg.getAttribute('class')).toContain('text-primary');
  });

  it('fill/stroke 에 hex·rgb 하드코딩이 없고 currentColor/HSL 토큰만 사용한다', () => {
    const { container } = render(<WeddingMark />);
    const painted = Array.from(container.querySelectorAll('[fill], [stroke]'));
    expect(painted.length).toBeGreaterThan(0);
    const allowed = /^(none|currentColor|hsl\(var\(--[a-z0-9-]+\)\))$/;
    for (const el of painted) {
      for (const attr of ['fill', 'stroke'] as const) {
        const value = el.getAttribute(attr);
        if (value === null) continue;
        expect(value).not.toMatch(/#|rgb/i);
        expect(value).toMatch(allowed);
      }
    }
    // [CL-BRAND-V3-20260711-183000] 브랜드 핑크 토큰 + 링 밴드 펄 토큰 사용(구 primary/chart-2 링 폐기)
    expect(container.innerHTML).toContain('hsl(var(--brand-pink))');
    expect(container.innerHTML).toContain('hsl(var(--brand-ring))');
    expect(container.innerHTML).not.toContain('hsl(var(--chart-2))');
  });

  it('[CL-BRAND-V5] 하트+플래티넘 도넛 밴드 지오메트리 계약 — 하트 바디 + 도넛 2개 + weave', () => {
    const { container } = render(<WeddingMark />);
    // 하트 바디(단색 fill path) 존재
    const body = container.querySelector('path[fill="hsl(var(--brand-pink))"]');
    expect(body).not.toBeNull();
    // 인터로킹 밴드 = evenodd 도넛 2개(mark-small 과 동일 외경 r13/내경 r7 계약)
    const donutGroup = container.querySelector('g[fill-rule="evenodd"]');
    expect(donutGroup).not.toBeNull();
    const donuts = donutGroup!.querySelectorAll('path');
    expect(donuts.length).toBe(2);
    const allD = Array.from(donuts).map((p) => p.getAttribute('d')).join(' ');
    expect(allD.match(/a 13 13/g)?.length).toBe(4); // 밴드 2개 × 외경 반호 2개
    expect(allD.match(/a 7 7/g)?.length).toBe(4); // 밴드 2개 × 내경 반호 2개(반지 두께)
    // weave 호(상단 교차 왼쪽 밴드 위) 존재
    expect(container.innerHTML).toContain('A 10 10 0 0 1 52.6 39.9');
  });
});

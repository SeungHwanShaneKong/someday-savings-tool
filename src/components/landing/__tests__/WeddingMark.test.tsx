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
    // [CL-BRAND-V2-20260711-173300] 브랜드 핑크 토큰이 실제로 사용되는지(구 primary/chart-2 링 폐기)
    expect(container.innerHTML).toContain('hsl(var(--brand-pink))');
    expect(container.innerHTML).toContain('hsl(var(--brand-pink-soft))');
    expect(container.innerHTML).not.toContain('hsl(var(--chart-2))');
  });

  it('[CL-BRAND-V2] 하트+링 지오메트리 계약 — evenodd 링 홀 2개(원 서브패스)와 스파클이 존재', () => {
    const { container } = render(<WeddingMark />);
    const body = container.querySelector('path[fill-rule="evenodd"]');
    expect(body).not.toBeNull();
    // 링 홀 2개 = 12 반지름 원 서브패스 2개(마스터 brand/mark.svg 와 동일 수치 계약)
    const d = body!.getAttribute('d') ?? '';
    expect(d.match(/A 12 12/g)?.length).toBe(4); // 원 1개당 반호 2개 × 2홀
    // 폴리시드 림 원 2개
    expect(container.querySelectorAll('circle[r="12"]').length).toBe(2);
  });
});

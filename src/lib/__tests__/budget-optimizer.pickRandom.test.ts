// [CL-COEDIT-QA5-20260620] AI 인사이트 ≤5 캡 + 초과 시 랜덤 노출(다양성) — pickRandomInsights 순수 단위 검증.
//
// 계약: (1) ≤max 면 원본 그대로(순서·참조 보존) (2) >max 면 정확히 max개 (3) 반환은 입력의 부분집합·중복 0
//       (4) Math.random 을 고정하면 결정적(셔플 가능성) (5) 원본 배열 비변형(불변).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { pickRandomInsights, type BudgetInsight } from '@/lib/budget-optimizer';

function mkInsights(n: number): BudgetInsight[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `ins-${i}`,
    type: 'info' as const,
    title: `t${i}`,
    description: `d${i}`,
    emoji: '💡',
  }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('pickRandomInsights (≤5 캡 + 초과 랜덤)', () => {
  it('P1 빈 배열 → 빈 배열', () => {
    expect(pickRandomInsights([], 5)).toEqual([]);
  });

  it('P2 정확히 max 개(5) → 원본 그대로(동일 참조 반환)', () => {
    const input = mkInsights(5);
    const out = pickRandomInsights(input, 5);
    expect(out).toBe(input); // ≤max 는 새 배열을 만들지 않고 원본 반환
    expect(out).toHaveLength(5);
  });

  it('P3 max 미만(3) → 원본 그대로', () => {
    const input = mkInsights(3);
    expect(pickRandomInsights(input, 5)).toEqual(input);
  });

  it('P4 초과(8) → 정확히 5개', () => {
    expect(pickRandomInsights(mkInsights(8), 5)).toHaveLength(5);
  });

  it('P5 초과 시 반환은 입력의 부분집합 + 중복 0', () => {
    const input = mkInsights(20);
    const out = pickRandomInsights(input, 5);
    const inputIds = new Set(input.map((i) => i.id));
    const outIds = out.map((i) => i.id);
    // 모든 반환 원소는 입력에 존재(가짜 생성 금지)
    expect(outIds.every((id) => inputIds.has(id))).toBe(true);
    // 중복 0
    expect(new Set(outIds).size).toBe(outIds.length);
  });

  it('P6 Math.random 고정(0) → 결정적 선택(같은 입력=같은 출력)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const input = mkInsights(8);
    const a = pickRandomInsights(input, 5);
    const b = pickRandomInsights(input, 5);
    expect(a.map((i) => i.id)).toEqual(b.map((i) => i.id));
    expect(a).toHaveLength(5);
  });

  it('P7 원본 배열을 변형하지 않는다(불변)', () => {
    const input = mkInsights(8);
    const snapshot = input.map((i) => i.id);
    pickRandomInsights(input, 5);
    expect(input.map((i) => i.id)).toEqual(snapshot);
  });

  it('P8 기본 max=5 (인자 생략 시)', () => {
    expect(pickRandomInsights(mkInsights(9))).toHaveLength(5);
  });

  it('P9 max=0 → 빈 배열(엣지)', () => {
    expect(pickRandomInsights(mkInsights(3), 0)).toEqual([]);
  });
});

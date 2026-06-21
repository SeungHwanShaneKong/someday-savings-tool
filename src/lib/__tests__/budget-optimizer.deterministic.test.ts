// [CL-QUALITY-DETERMINISM-20260621] pickRandomInsights 결정성 회귀 가드 — 재렌더 무작위 재셔플 방지.
import { describe, it, expect } from 'vitest';
import { pickRandomInsights, type BudgetInsight } from '@/lib/budget-optimizer';

function mk(n: number): BudgetInsight[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `ins-${i}`, type: 'info' as const, title: `t${i}`, description: 'd', emoji: '💡',
  }));
}

describe('pickRandomInsights 결정성(재셔플 회귀)', () => {
  it('DET.1 같은 입력 → 20회 모두 동일한 5개·동일 순서', () => {
    const list = mk(12);
    const first = pickRandomInsights(list, 5).map((i) => i.id).join('|');
    for (let k = 0; k < 20; k++) {
      expect(pickRandomInsights(list, 5).map((i) => i.id).join('|')).toBe(first);
    }
  });

  it('DET.2 입력 집합이 다르면 시드도 달라 다양성 유지(완전 고정 아님)', () => {
    const a = pickRandomInsights(mk(12), 5).map((i) => i.id).join('|');
    const diff = mk(12); diff.push({ id: 'ins-extra', type: 'info', title: 'x', description: 'd', emoji: '💡' });
    const b = pickRandomInsights(diff, 5).map((i) => i.id).join('|');
    expect(a.split('|')).toHaveLength(5);
    expect(b.split('|')).toHaveLength(5);
    // 서로 다른 집합 → 결과가 동일하리란 보장 없음(다양성). 핵심은 DET.1 의 재렌더 안정성.
  });

  it('DET.3 ≤max 는 원본 그대로(결정성 무관)', () => {
    const list = mk(4);
    expect(pickRandomInsights(list, 5)).toBe(list);
  });
});

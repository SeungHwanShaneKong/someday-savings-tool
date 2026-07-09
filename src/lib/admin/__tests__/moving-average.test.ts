// [CL-ADMIN-VISITOR-20260709-231827] sma/withMovingAverage 단위 테스트 — 7일 MA 오버레이 계약 고정.
//   계약: 길이 보존 · null-head(window-1개, 가짜 0 금지) · 결측(null/undefined) 전파 · 입력 불변 · window<1 throw.
import { describe, it, expect } from 'vitest';
import { sma, withMovingAverage } from '@/lib/admin/moving-average';

describe('sma — 단순 이동평균', () => {
  it('빈 배열 → 빈 배열', () => {
    expect(sma([], 7)).toEqual([]);
  });

  it('window > length → 전부 null(부분 평균으로 오도하지 않음)', () => {
    expect(sma([1, 2, 3], 7)).toEqual([null, null, null]);
  });

  it('head null 개수 = window-1 (가짜 0 없음)', () => {
    const out = sma([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 7);
    expect(out.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(out.slice(6).every((v) => v !== null)).toBe(true);
  });

  it('정답 시리즈: 1..10, w=7 → [null×6, 4, 5, 6, 7]', () => {
    expect(sma([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 7)).toEqual([
      null, null, null, null, null, null, 4, 5, 6, 7,
    ]);
  });

  it('null 갭 전파 — 윈도에 결측이 걸치는 모든 인덱스가 null, 벗어나면 복구', () => {
    // w=3: i=2([1,2,null])·i=3([2,null,4])·i=4([null,4,5]) → null, i=5([4,5,6]) → 5 복구
    expect(sma([1, 2, null, 4, 5, 6], 3)).toEqual([null, null, null, null, null, 5]);
  });

  it('undefined 도 결측으로 전파', () => {
    expect(sma([1, undefined, 3], 2)).toEqual([null, null, null]);
  });

  it('window=1 → 자기 자신(결측은 null 유지)', () => {
    expect(sma([3, null, 5], 1)).toEqual([3, null, 5]);
  });

  it('입력 배열 불변', () => {
    const input: Array<number | null> = [1, 2, null, 4, 5, 6, 7];
    const snapshot = [...input];
    sma(input, 3);
    expect(input).toEqual(snapshot);
  });

  it('window < 1 또는 비정수 → throw', () => {
    expect(() => sma([1, 2], 0)).toThrow();
    expect(() => sma([1, 2], -1)).toThrow();
    expect(() => sma([1, 2], 1.5)).toThrow();
  });

  it('부동소수 안정(오차 누적 없이 근사 일치)', () => {
    const out = sma([0.1, 0.2, 0.3], 3);
    expect(out[2]).not.toBeNull();
    expect(out[2] as number).toBeCloseTo(0.2, 10);
  });
});

describe('withMovingAverage — outKey 주입 헬퍼', () => {
  const data = [
    { date: '7/1', pv: 1 },
    { date: '7/2', pv: 2 },
    { date: '7/3', pv: 3 },
  ];

  it('outKey 로 MA 를 주입하고 원본 필드·길이를 보존', () => {
    const out = withMovingAverage(data, 'pv', 2, 'pvMA2');
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual({ date: '7/1', pv: 1, pvMA2: null });
    expect(out[1]).toEqual({ date: '7/2', pv: 2, pvMA2: 1.5 });
    expect(out[2]).toEqual({ date: '7/3', pv: 3, pvMA2: 2.5 });
  });

  it('입력 배열/원소 불변(새 객체 반환)', () => {
    const snapshot = JSON.parse(JSON.stringify(data));
    const out = withMovingAverage(data, 'pv', 2, 'pvMA2');
    expect(data).toEqual(snapshot);
    expect(out[0]).not.toBe(data[0]);
  });

  it('숫자가 아닌 값(undefined 등)은 결측으로 전파', () => {
    const sparse = [{ v: 1 }, { v: undefined as number | undefined }, { v: 3 }, { v: 4 }];
    const out = withMovingAverage(sparse, 'v', 2, 'ma');
    expect(out.map((o) => o.ma)).toEqual([null, null, null, 3.5]);
  });
});

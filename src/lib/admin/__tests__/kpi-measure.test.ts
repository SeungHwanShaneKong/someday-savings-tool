// [CL-FACT-MEASURE-20260629] Measure 프리미티브 단위/골든 — 정직 4상태 + rate 분모가드.
import { describe, it, expect } from 'vitest';
import { ok, noData, degraded, unmeasurable, rate, isDisplayable, measureLabel } from '@/lib/admin/kpi-measure';

describe('kpi-measure', () => {
  it('M.1 ok(>0)=ok / ok(0)=zero(정직한 0)', () => {
    expect(ok(42)).toMatchObject({ state: 'ok', value: 42 });
    expect(ok(0)).toMatchObject({ state: 'zero', value: 0 });
  });
  it('M.2 noData/degraded/unmeasurable 은 value=null', () => {
    expect(noData()).toMatchObject({ state: 'no-data', value: null });
    expect(degraded('x')).toMatchObject({ state: 'degraded', value: null, reason: 'x' });
    expect(unmeasurable()).toMatchObject({ state: 'unmeasurable', value: null });
  });
  it('M.3 rate: 분모>0 → ok(%), 분모0 → unmeasurable(가짜% 금지), degrade → degraded', () => {
    expect(rate(3, 12)).toMatchObject({ state: 'ok', value: 25 });
    expect(rate(0, 12)).toMatchObject({ state: 'zero', value: 0 }); // 진짜 0%
    expect(rate(1, 0).state).toBe('unmeasurable'); // MAU=0인데 공유1 → '측정불가'(100% 아님)
    expect(rate(1, 5, { denominatorDegraded: true }).state).toBe('degraded');
  });
  it('M.4 rate coverage 전달 + 반올림(소수1자리)', () => {
    const r = rate(1, 3, { coverage: { n: 1, m: 3 } });
    expect(r.value).toBe(33.3);
    expect(r.coverage).toEqual({ n: 1, m: 3 });
  });
  it('M.5 isDisplayable: ok/zero 만 true', () => {
    expect(isDisplayable(ok(5))).toBe(true);
    expect(isDisplayable(ok(0))).toBe(true);
    expect(isDisplayable(noData())).toBe(false);
    expect(isDisplayable(unmeasurable())).toBe(false);
  });
  it('M.6 measureLabel: 상태별 한국어', () => {
    expect(measureLabel(noData())).toBe('데이터 없음');
    expect(measureLabel(degraded())).toBe('불러오기 실패');
    expect(measureLabel(unmeasurable())).toBe('측정불가');
    expect(measureLabel(ok(1))).toBe('');
  });
});

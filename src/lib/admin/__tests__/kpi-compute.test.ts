// [CL-FACT-COMPUTE-20260630] computeUsageRates 골든 — 위조 분모(mau||1, max(total,1)) 제거 회귀 가드.
//   '사실 아닌 숫자' 차단을 단위/골든으로 고정: MAU=0→측정불가(100% 아님), degrade→불러오기실패, 진짜0→0%.
import { describe, it, expect } from 'vitest';
import { computeUsageRates, measureToKpiValue, kpiFact } from '@/lib/admin/kpi-compute';

const base = {
  dau: 0, mau: 0, shareUsers: 0, snapshotUsers: 0,
  contingencyFund: 0, totalBudgetAmount: 0,
  monthlyActiveDegraded: false, budgetItemsDegraded: false,
};

describe('computeUsageRates — 위조 분모 정직화', () => {
  it('C.1 MAU>0 · 공유/스냅샷 측정 → 정직 %(반올림 1자리)', () => {
    const u = computeUsageRates({ ...base, dau: 3, mau: 12, shareUsers: 3, snapshotUsers: 6 });
    expect(u.stickiness).toMatchObject({ state: 'ok', value: 25 });   // 3/12
    expect(u.shareRate).toMatchObject({ state: 'ok', value: 25 });    // 3/12
    expect(u.snapshotRate).toMatchObject({ state: 'ok', value: 50 }); // 6/12
  });

  it('C.2 [핵심] MAU=0 인데 공유>0 → 측정불가(과거 mau||1 로 인한 거짓 100% 차단)', () => {
    const u = computeUsageRates({ ...base, mau: 0, shareUsers: 5, snapshotUsers: 2 });
    expect(u.shareRate.state).toBe('unmeasurable');
    expect(u.shareRate.value).toBeNull();
    expect(u.snapshotRate.state).toBe('unmeasurable');
    expect(u.stickiness.state).toBe('unmeasurable');
  });

  it('C.3 MAU>0 · 공유=0 → 진짜 0%(zero, 무데이터와 구분)', () => {
    const u = computeUsageRates({ ...base, mau: 10, shareUsers: 0 });
    expect(u.shareRate).toMatchObject({ state: 'zero', value: 0 });
  });

  it('C.4 page_views_month degrade → MAU 기반 3종 모두 불러오기 실패(가짜 0 아님)', () => {
    const u = computeUsageRates({ ...base, mau: 0, shareUsers: 5, monthlyActiveDegraded: true });
    expect(u.shareRate.state).toBe('degraded');
    expect(u.snapshotRate.state).toBe('degraded');
    expect(u.stickiness.state).toBe('degraded');
  });

  it('C.5 K18 예비비 준비율 — 분모(전체 예산 합) 0→측정불가, >0→정직%, degrade→불러오기실패', () => {
    expect(computeUsageRates({ ...base, contingencyFund: 100, totalBudgetAmount: 0 }).contingencyRatio.state).toBe('unmeasurable');
    expect(computeUsageRates({ ...base, contingencyFund: 50, totalBudgetAmount: 200 }).contingencyRatio).toMatchObject({ state: 'ok', value: 25 });
    expect(computeUsageRates({ ...base, contingencyFund: 50, totalBudgetAmount: 200, budgetItemsDegraded: true }).contingencyRatio.state).toBe('degraded');
  });

  it('C.6 measureToKpiValue: ok→value 숫자+state, 비사실→value 0 placeholder+state', () => {
    const u = computeUsageRates({ ...base, dau: 3, mau: 12 });
    expect(measureToKpiValue('K05', u.stickiness)).toMatchObject({ id: 'K05', value: 25, change: 0, state: 'ok' });
    const un = computeUsageRates({ ...base, mau: 0, shareUsers: 1 });
    expect(measureToKpiValue('K13', un.shareRate)).toMatchObject({ id: 'K13', value: 0, state: 'unmeasurable' });
  });

  it('C.7 kpiFact: ok/zero/undefined=사실, no-data/degraded/unmeasurable=비사실+라벨', () => {
    expect(kpiFact('ok')).toEqual({ isFact: true, stateLabel: '' });
    expect(kpiFact('zero')).toEqual({ isFact: true, stateLabel: '' });
    expect(kpiFact(undefined)).toEqual({ isFact: true, stateLabel: '' });
    expect(kpiFact('unmeasurable')).toEqual({ isFact: false, stateLabel: '측정불가' });
    expect(kpiFact('no-data')).toEqual({ isFact: false, stateLabel: '데이터 없음' });
    expect(kpiFact('degraded')).toEqual({ isFact: false, stateLabel: '불러오기 실패' });
  });
});

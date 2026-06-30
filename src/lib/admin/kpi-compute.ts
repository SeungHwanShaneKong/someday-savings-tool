// [CL-FACT-COMPUTE-20260630] 관리자 KPI 정확성 — '위조 분모' 지표를 정직 Measure 로 산출하는 순수 함수.
//
// 목적(개선1): useAdminKPI.loadAdminKpi 안에 인라인돼 있던 'mau || 1', 'Math.max(totalAmount, 1)' 같은
//   위조 분모를 단일 진실원으로 격리·골든 잠금한다. MAU=0 인데 100% 같은 거짓 수치를 차단하고,
//   소스 degrade 시 가짜 0 대신 '불러오기 실패'를 방출한다. 순수 함수이므로 supabase mock 없이 단위/골든 가능.
//
// 매핑:
//   K05 Stickiness   = DAU / MAU
//   K13 공유 링크 생성률 = 공유 생성 사용자 / MAU
//   K14 스냅샷 사용률   = 스냅샷 사용자 / MAU
//   K18 예비비 준비율   = 예비비 추정 총액 / 전체 예산 합(분자·분모 동일 스코프 = 전체 filteredBudgetItems)
//
// degrade 전파: MAU 는 page_views_month 소스(monthlyActiveDegraded), K18 분모는 budget_items 소스(budgetItemsDegraded).

import { rate, measureLabel, type Measure } from './kpi-measure';

export interface UsageRateInput {
  /** 당일(기준일 앵커) 고유 활성 사용자 */
  dau: number;
  /** 최근 30일(기준일 앵커) 고유 활성 사용자 — K05/K13/K14 의 분모 */
  mau: number;
  /** 기간 내 공유 링크를 생성한 고유 사용자 */
  shareUsers: number;
  /** 스냅샷을 사용한 고유 사용자 */
  snapshotUsers: number;
  /** 예비비 추정 총액(전체 filteredBudgetItems 기준) — K18 분자 */
  contingencyFund: number;
  /** 전체 예산 합(전체 filteredBudgetItems amount 합) — K18 분모(분자와 동일 스코프) */
  totalBudgetAmount: number;
  /** page_views_month 소스가 degrade(failed)면 MAU 기반 비율은 '불러오기 실패' */
  monthlyActiveDegraded: boolean;
  /** budget_items 소스가 degrade 면 K18 은 '불러오기 실패' */
  budgetItemsDegraded: boolean;
}

export interface UsageRateMeasures {
  stickiness: Measure;   // K05
  shareRate: Measure;    // K13
  snapshotRate: Measure; // K14
  contingencyRatio: Measure; // K18
}

/**
 * 위조 분모 4종을 정직 Measure 로 산출.
 * - MAU=0 → unmeasurable('측정불가') : 과거 'mau || 1' 로 100% 처럼 보이던 거짓 차단.
 * - 소스 degrade → degraded('불러오기 실패') : 가짜 0 차단.
 * - 측정된 0 → zero('0%') : 진짜 0 은 정직하게 표시(무데이터와 구분).
 */
export function computeUsageRates(i: UsageRateInput): UsageRateMeasures {
  const mauDeg = { denominatorDegraded: i.monthlyActiveDegraded, reason: '월간 활성 사용자(MAU) 0 — 비율 계산 불가' };
  return {
    stickiness: rate(i.dau, i.mau, mauDeg),
    shareRate: rate(i.shareUsers, i.mau, mauDeg),
    snapshotRate: rate(i.snapshotUsers, i.mau, mauDeg),
    contingencyRatio: rate(i.contingencyFund, i.totalBudgetAmount, {
      denominatorDegraded: i.budgetItemsDegraded,
      reason: '전체 예산 합 0 — 비율 계산 불가',
    }),
  };
}

/**
 * Measure → KPIValue 보강 필드. value 는 측정 가능할 때만 숫자(아니면 0 placeholder + state 로 UI 가 라벨 표시).
 * change 는 비율 지표라 0(전기 비교 미산출) 유지.
 */
export function measureToKpiValue(id: string, m: Measure): {
  id: string; value: number; change: number; state: Measure['state']; coverage?: { n: number; m: number };
} {
  return {
    id,
    value: typeof m.value === 'number' ? m.value : 0,
    change: 0,
    state: m.state,
    ...(m.coverage ? { coverage: m.coverage } : {}),
  };
}

/**
 * [CL-FACT-COMPUTE-20260630] UI 헬퍼 — KPIValue 의 정직상태로 '사실 표시 가능 여부' 판별.
 * state 미지정/ok/zero = 사실(숫자 표시). no-data/degraded/unmeasurable = 비사실(라벨 표시·상태칩 '참고').
 * 가산형: state 없는 기존 KPI 는 항상 isFact=true → 회귀 0.
 */
export function kpiFact(state?: Measure['state']): { isFact: boolean; stateLabel: string } {
  if (state === 'no-data' || state === 'degraded' || state === 'unmeasurable') {
    return { isFact: false, stateLabel: measureLabel({ state, value: null }) };
  }
  return { isFact: true, stateLabel: '' };
}

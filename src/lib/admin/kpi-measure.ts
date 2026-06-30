// [CL-FACT-MEASURE-20260629] 관리자 KPI "정직 상태" 프리미티브.
//
// 목적(개선1): 대시보드가 '사실 아닌 숫자'를 보여주지 않게, 모든 지표를 4상태로 구분한다.
//  - ok          : 정상 측정값(>0)
//  - zero        : 진짜 측정된 0(정직하게 0/0% 표시 — '무데이터'와 구분)
//  - no-data     : 소스는 정상이나 표본이 비어 산출 불가(예: 관측 가능한 코호트 0명)
//  - degraded    : 해당 지표의 소스 fetch 실패(useAdminKPI 의 failed[] 포함) → '불러오기 실패'
//  - unmeasurable: 분모가 0/위조(예: MAU=0) → 비율 계산 불가('측정불가', 0%/100% 같은 가짜 금지)
// coverage 는 '관측 N / 모수 M' 같은 부분표본 공시용(리텐션·임팩트 커버리지).

export type MeasureState = 'ok' | 'zero' | 'no-data' | 'degraded' | 'unmeasurable';

export interface Measure<T = number> {
  state: MeasureState;
  value: T | null;
  coverage?: { n: number; m: number };
  reason?: string;
}

/** 측정 성공. v===0 이면 'zero'(정직한 0), 그 외 'ok'. */
export const ok = (v: number, coverage?: { n: number; m: number }): Measure => ({
  state: v === 0 ? 'zero' : 'ok',
  value: v,
  ...(coverage ? { coverage } : {}),
});

/** 소스는 정상이나 표본이 비어 산출 불가. */
export const noData = (reason?: string): Measure => ({ state: 'no-data', value: null, ...(reason ? { reason } : {}) });

/** 소스 fetch 실패(degrade). */
export const degraded = (reason?: string): Measure => ({ state: 'degraded', value: null, ...(reason ? { reason } : {}) });

/** 분모 0/위조 등으로 비율 측정 불가. 가짜 % 대신 이 상태를 쓴다. */
export const unmeasurable = (reason?: string): Measure => ({ state: 'unmeasurable', value: null, ...(reason ? { reason } : {}) });

/** 비율(분자/분모*100) 안전 생성: 분모 degrade→degraded, 분모 0→unmeasurable, else ok. */
export function rate(
  numerator: number,
  denominator: number,
  opts?: { denominatorDegraded?: boolean; reason?: string; coverage?: { n: number; m: number } },
): Measure {
  if (opts?.denominatorDegraded) return degraded(opts.reason);
  if (!Number.isFinite(denominator) || denominator <= 0) return unmeasurable(opts?.reason ?? '분모 0 — 비율 계산 불가');
  return ok(Math.round((numerator / denominator) * 1000) / 10, opts?.coverage);
}

/** UI 헬퍼: 값이 표시 가능한 상태인지(ok/zero). */
export const isDisplayable = (m: Measure): boolean => m.state === 'ok' || m.state === 'zero';

/** UI 헬퍼: 상태별 한국어 라벨(값이 없을 때). */
export function measureLabel(m: Measure): string {
  switch (m.state) {
    case 'no-data': return '데이터 없음';
    case 'degraded': return '불러오기 실패';
    case 'unmeasurable': return '측정불가';
    default: return '';
  }
}

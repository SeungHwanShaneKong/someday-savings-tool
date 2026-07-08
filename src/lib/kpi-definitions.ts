// KPI 정의, 임계값, 데모 데이터
// 15개 핵심 지표의 메타데이터와 상태 배지 판별 로직
// [CL-ADMIN-KST-CUMSUM-20260709-073000] 누적 baseline 경계를 트렌드 루프(KST)와 동일 진실원으로 통일 → date-fns 로컬 TZ 제거.
import { startOfKstDayUtc, subKstDays } from '@/lib/admin/kst-time';

export type KPIStatus = '정상' | '주의' | '위험' | '참고';

export interface KPIDefinition {
  id: string;
  name: string;
  description: string;
  formula: string;
  unit: string;
  // 임계값: warn 미만이면 주의, danger 미만이면 위험
  thresholds?: { warn: number; danger: number };
  // 높을수록 좋은지(true) 또는 낮을수록 좋은지(false)
  higherIsBetter: boolean;
}

export const KPI_DEFINITIONS: KPIDefinition[] = [
  { id: 'K01', name: '신규 가입자 수', description: '기간 내 신규 가입한 사용자 수', formula: '기간 내 profiles 생성 수', unit: '명', higherIsBetter: true },
  { id: 'K02', name: 'DAU', description: '일간 활성 사용자 수', formula: '당일 page_views 고유 user_id 수', unit: '명', higherIsBetter: true },
  { id: 'K03', name: 'WAU', description: '주간 활성 사용자 수', formula: '최근 7일 page_views 고유 user_id 수', unit: '명', higherIsBetter: true },
  { id: 'K04', name: 'MAU', description: '월간 활성 사용자 수', formula: '최근 30일 page_views 고유 user_id 수', unit: '명', higherIsBetter: true },
  { id: 'K05', name: 'Stickiness', description: 'DAU/MAU 비율 (서비스 고착도)', formula: 'DAU / MAU × 100', unit: '%', thresholds: { warn: 25, danger: 20 }, higherIsBetter: true },
  { id: 'K06', name: 'D1 리텐션', description: '가입 후 1일 재방문 비율', formula: '가입 다음날 재방문 / 전체 가입자', unit: '%', thresholds: { warn: 40, danger: 35 }, higherIsBetter: true },
  { id: 'K07', name: 'D7 리텐션', description: '가입 후 7일 재방문 비율', formula: '가입 7일 후 재방문 / 전체 가입자', unit: '%', thresholds: { warn: 20, danger: 15 }, higherIsBetter: true },
  { id: 'K08', name: 'D30 리텐션', description: '가입 후 30일 재방문 비율', formula: '가입 30일 후 재방문 / 전체 가입자', unit: '%', thresholds: { warn: 10, danger: 5 }, higherIsBetter: true },
  { id: 'K09', name: '가입→예산 생성(24h)', description: '가입 후 24시간 내 예산 생성 비율', formula: '24h 내 budgets 생성 / 전체 가입자', unit: '%', thresholds: { warn: 50, danger: 30 }, higherIsBetter: true },
  { id: 'K10', name: '가입→첫 금액 입력(24h)', description: '가입 후 24시간 내 첫 금액 입력 비율', formula: '24h 내 amount>0 입력 / 전체 가입자', unit: '%', thresholds: { warn: 30, danger: 15 }, higherIsBetter: true },
  { id: 'K11', name: 'TTFV 중앙값', description: '가입→첫 금액 입력 소요 시간 중앙값', formula: '가입~첫 amount>0 시간 중앙값', unit: '분', thresholds: { warn: 60, danger: 120 }, higherIsBetter: false },
  { id: 'K12', name: '다중 시나리오 사용률', description: '예산 2개 이상 보유 사용자 비율', formula: 'budgets≥2 사용자 / 전체', unit: '%', thresholds: { warn: 15, danger: 5 }, higherIsBetter: true },
  { id: 'K13', name: '공유 링크 생성률', description: '활성 사용자 중 공유 링크 생성 비율', formula: 'shared_budgets 생성자 / 활성 사용자', unit: '%', thresholds: { warn: 10, danger: 5 }, higherIsBetter: true },
  { id: 'K14', name: '스냅샷 사용률', description: '활성 사용자 중 스냅샷 사용 비율', formula: 'budget_snapshots 사용자 / 활성 사용자', unit: '%', thresholds: { warn: 10, danger: 5 }, higherIsBetter: true },
  { id: 'K15', name: '예산 집행률', description: 'is_paid 금액 합 / 전체 금액 합', formula: 'SUM(is_paid) / SUM(amount)', unit: '%', thresholds: { warn: 30, danger: 10 }, higherIsBetter: true },
  // Phase 4-A: 경제적 파급 효과 KPI (BRD §7)
  { id: 'K16', name: '평균 절감률', description: '사용자 입력 금액의 전국 평균 대비 절감률', formula: 'Σ(avg-user) / Σ(avg-ref) × 100', unit: '%', higherIsBetter: true },
  { id: 'K17', name: '숨겨진 비용 인지율', description: '사용자당 평균 숨겨진 비용 경고 인지 건수', formula: '트리거된 hidden cost 규칙 수 / 사용자 수', unit: '건', higherIsBetter: true },
  { id: 'K18', name: '예비비 준비율', description: '예비비 추정 총액 대비 실 예산 비율', formula: '예비비 경고 총액 / 전체 예산', unit: '%', higherIsBetter: true },
];

/** 상태 배지 판별 */
export function getKPIStatus(def: KPIDefinition, value: number): KPIStatus {
  if (!def.thresholds) return '참고';
  const { warn, danger } = def.thresholds;
  if (def.higherIsBetter) {
    if (value < danger) return '위험';
    if (value < warn) return '주의';
    return '정상';
  } else {
    // 낮을수록 좋은 경우 (e.g. TTFV)
    if (value > danger) return '위험';
    if (value > warn) return '주의';
    return '정상';
  }
}

/** 상태 배지 색상 */
export function getStatusColor(status: KPIStatus) {
  switch (status) {
    case '정상': return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' };
    case '주의': return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' };
    case '위험': return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' };
    case '참고': return { bg: 'bg-gray-100 dark:bg-gray-800/30', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' };
  }
}

// [CL-FACT-KPISTATE-20260630] 정직상태(개선1) — 분모 위조·무데이터·degrade 를 가짜 수치로 뭉개지 않도록
//   KPIValue 에 가산형 측정상태를 부여. state 미지정 = 'ok'(기존 동작 100% 보존 → 회귀 0).
export type KPIMeasureState = 'ok' | 'zero' | 'no-data' | 'degraded' | 'unmeasurable';

export interface KPIValue {
  id: string;
  value: number;
  change: number; // 전기 대비 변화율 (%)
  /** [CL-FACT-KPISTATE-20260630] 측정 정직상태. 미지정=ok(value 그대로 표시). 비 ok/zero 면 '측정불가/데이터없음/불러오기실패' 칩. */
  state?: KPIMeasureState;
  /** [CL-FACT-KPISTATE-20260630] 표본 커버리지(분자 n / 분모 m) — 리텐션·임팩트 등 '관측 N/M' 표기용. */
  coverage?: { n: number; m: number };
}

export interface TrendDataPoint {
  date: string;
  dau?: number;
  wau?: number;
  mau?: number;
  signups?: number;
  /** [CL-ADMIN-SIGNUP-TREND-20260622] 시점별 누적 가입자(윈도우 이전 baseline + 일별 신규 누계 = 진짜 누적) */
  cumulativeSignups?: number;
  budgetCreated?: number;
  amountEntered?: number;
  pv?: number;
  loyalCount?: number;
  avgDuration?: number;
}

// [CL-ADMIN-SIGNUP-TREND-20260622] 일별 신규 가입자(signups)를 누계해 cumulativeSignups 주입.
//   baseline = 윈도우 시작 이전 누적 가입자 수(윈도우 0부터 세는 오해 방지). points 는 오래된→최신 순.
export function withCumulativeSignups(points: TrendDataPoint[], baseline = 0): TrendDataPoint[] {
  let acc = Math.max(0, baseline);
  return points.map((p) => {
    acc += p.signups ?? 0;
    return { ...p, cumulativeSignups: acc };
  });
}

// [CL-AUDIT-CUMSUM-BOUNDARY-20260622] 누적 가입자 baseline 컷오프 = 첫 일별 트렌드 버킷의 시작.
//   baseline(<이 시점)과 일별 버킷(>=이 시점)이 '동일 인스턴트'를 공유하게 만들어, 가입자가 정확히
//   한쪽에만 속하도록 한다(경계 갭·이중집계 제거).
// [CL-ADMIN-KST-CUMSUM-20260709-073000] R11 근본수정: 트렌드 루프 첫 버킷은 KST 절대시각
//   (useAdminKPI.tsx:492-493 `startOfKstDayUtc(subKstDays(endDate, dayCount-1))`)인데, 이 컷오프는
//   date-fns `startOfDay`(로컬 TZ)였다 → 비-KST 브라우저(예: CI=UTC)에서 최대 9h 어긋나 갭 구간 가입자가
//   baseline·버킷 양쪽에 집계(이중집계)되거나 누락. 트렌드 루프와 '비트 동일'한 KST 경계로 통일해 근본 제거.
//   dayCount = min(periodDays, 90) 는 useAdminKPI.tsx:488 과 동일.
export function firstTrendBucketStart(endDate: Date, periodDays: number): Date {
  const dayCount = Math.min(periodDays, 90);
  return startOfKstDayUtc(subKstDays(endDate, dayCount - 1));
}

export interface TopPage {
  path: string;
  views: number;
  percentage: number;
}

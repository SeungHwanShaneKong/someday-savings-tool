// KPI 정의, 임계값, 데모 데이터
// 15개 핵심 지표의 메타데이터와 상태 배지 판별 로직

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

export interface KPIValue {
  id: string;
  value: number;
  change: number; // 전기 대비 변화율 (%)
}

export interface TrendDataPoint {
  date: string;
  dau?: number;
  wau?: number;
  mau?: number;
  signups?: number;
  budgetCreated?: number;
  amountEntered?: number;
  d1?: number;
  d7?: number;
  d30?: number;
  multiScenario?: number;
  shareLink?: number;
  snapshot?: number;
  executionRate?: number;
  ttfv?: number;
}

export interface TopPage {
  path: string;
  views: number;
  percentage: number;
}

/** 데모 데이터 */
export function getDemoKPIValues(): KPIValue[] {
  return [
    { id: 'K01', value: 47, change: 12.5 },
    { id: 'K02', value: 23, change: -5.2 },
    { id: 'K03', value: 89, change: 8.1 },
    { id: 'K04', value: 156, change: 15.3 },
    { id: 'K05', value: 14.7, change: -18.2 },
    { id: 'K06', value: 38.5, change: -3.1 },
    { id: 'K07', value: 22.1, change: 5.4 },
    { id: 'K08', value: 8.3, change: -12.0 },
    { id: 'K09', value: 62.4, change: 7.8 },
    { id: 'K10', value: 41.2, change: 3.5 },
    { id: 'K11', value: 35, change: -8.6 },
    { id: 'K12', value: 18.7, change: 22.1 },
    { id: 'K13', value: 7.3, change: -15.0 },
    { id: 'K14', value: 12.5, change: 45.2 },
    { id: 'K15', value: 34.8, change: 6.7 },
  ];
}

export function getDemoTrendData(): TrendDataPoint[] {
  const days = 30;
  return Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
    return {
      date: dateStr,
      dau: Math.floor(15 + Math.random() * 20),
      wau: Math.floor(60 + Math.random() * 40),
      mau: Math.floor(120 + Math.random() * 60),
      signups: Math.floor(1 + Math.random() * 5),
      budgetCreated: Math.floor(1 + Math.random() * 4),
      amountEntered: Math.floor(0 + Math.random() * 3),
      d1: Math.round(30 + Math.random() * 20),
      d7: Math.round(15 + Math.random() * 15),
      d30: Math.round(5 + Math.random() * 10),
      multiScenario: Math.round(10 + Math.random() * 15),
      shareLink: Math.round(3 + Math.random() * 10),
      snapshot: Math.round(5 + Math.random() * 15),
      executionRate: Math.round(25 + Math.random() * 20),
      ttfv: Math.round(20 + Math.random() * 40),
    };
  });
}

export function getDemoTopPages(): TopPage[] {
  return [
    { path: '/', views: 1234, percentage: 35.2 },
    { path: '/budget', views: 876, percentage: 25.0 },
    { path: '/summary', views: 543, percentage: 15.5 },
    { path: '/auth', views: 432, percentage: 12.3 },
    { path: '/shared', views: 421, percentage: 12.0 },
  ];
}

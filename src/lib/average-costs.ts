/**
 * Average cost reference data for Korean weddings
 * [CL-COST-2026Q2-20260713-231500] 2026 상반기 공표 자료 기준 전면 갱신(구: '2025 AI 조사').
 * 출처(검증 원문): 한국소비자원 참가격 결혼서비스 가격조사(2025.4 계약기준·2026.2 동향),
 *   듀오 '2026 결혼비용 실태 보고서'(2026.3 발표, 조사 2025.11 신혼부부 1,000명), 가연 실태조사(2024.3).
 * 공표 통계가 없는 항목은 기존 자체 추정치 유지, 카테고리 총액만 공표된 항목(혼수·신혼여행)은
 *   공표 총액을 자체 배분(note 에 명시) — 수치 날조 금지 원칙.
 */

export interface AverageCostData {
  amount: number;
  note?: string;
}

export const AVERAGE_COSTS: Record<string, Record<string, AverageCostData>> = {
  'main-ceremony': {
    'venue-fee': { amount: 3500000, note: '전국 중간가 (참가격 2026.2)' },
    'meal-cost': { amount: 11600000, note: '200명 기준' }, // 1인 5.8만(참가격 2025.4 중간가)×200
    'thank-you-gifts': { amount: 1170000, note: '답례품 평균 (가연 2024)' },
    'ceremony-staff': { amount: 400000 },
    'main-snap': { amount: 1500000 },
  },
  'sudeme-styling': {
    'dress-main': { amount: 1550000, note: '본식1+촬영3벌 기본 (참가격 2025.4)' },
    'dress-tour': { amount: 100000 },
    'groom-suit': { amount: 500000 },
    'studio': { amount: 1350000, note: '기본 촬영 (참가격 2025.4)' },
    'studio-helper': { amount: 200000 },
    'photo-bouquet': { amount: 50000 },
    'makeup': { amount: 760000, note: '본식+촬영 (참가격 2025.4)' },
    'parents-suit': { amount: 500000 },
    'parents-hanbok': { amount: 1000000 },
  },
  'gifts-houseware': {
    'rings': { amount: 5880000, note: '예물 평균 (듀오 2026)' },
    'yedan': { amount: 10300000, note: '예단 평균 (듀오 2026)' },
    'electronics': { amount: 8000000, note: '혼수 총 1,445만(듀오 2026) 자체 배분' },
    'furniture': { amount: 6450000, note: '혼수 총 1,445만(듀오 2026) 자체 배분' },
  },
  'preparation-promotion': {
    'meeting-meal': { amount: 400000 },
    'meeting-gift': { amount: 400000 },
    'invitation': { amount: 350000, note: '300장 기준' },
    'mobile-invitation': { amount: 20000 },
    'pre-video': { amount: 100000 },
  },
  'honeymoon': {
    'flight': { amount: 2800000, note: '신혼여행 총 763만(듀오 2026) 자체 배분' },
    'train': { amount: 400000 },
    'accommodation-1': { amount: 1900000, note: '신혼여행 총 763만(듀오 2026) 자체 배분' },
    'accommodation-2': { amount: 2530000, note: '신혼여행 총 763만(듀오 2026) 자체 배분' },
  },
  'miscellaneous': {
    'wedding-planner': { amount: 0 },
    'invitation-gathering': { amount: 1250000 },
    'bag-helper': { amount: 0 },
  },
};

export const SOURCE_TEXT =
  '출처: 한국소비자원 참가격(2025.4·2026.2)·듀오 2026 결혼비용 보고서 등 공표 자료 기준(일부 자체 배분)';

// [CL-COVERAGE50-FIX-20260620] 프로토타입 체인 누수 차단 — bracket 접근은 'toString'/'valueOf' 등
// 상속 멤버를 truthy 로 반환해 `|| null` 가드를 우회한다. own-property 만 인정해 없는 키는 항상 null.
const hasOwn = (o: object, k: string): boolean =>
  Object.prototype.hasOwnProperty.call(o, k);

export const getAverageCost = (categoryId: string, subCategoryId: string): AverageCostData | null => {
  if (!hasOwn(AVERAGE_COSTS, categoryId)) return null;
  const cat = AVERAGE_COSTS[categoryId];
  return hasOwn(cat, subCategoryId) ? cat[subCategoryId] : null;
};

export const hasAverageCost = (categoryId: string, subCategoryId: string): boolean => {
  return hasOwn(AVERAGE_COSTS, categoryId) && hasOwn(AVERAGE_COSTS[categoryId], subCategoryId);
};

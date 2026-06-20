/**
 * Average cost reference data for Korean weddings
 * Source: 2025년 전국 기준 AI 조사 결과
 */

export interface AverageCostData {
  amount: number;
  note?: string;
}

export const AVERAGE_COSTS: Record<string, Record<string, AverageCostData>> = {
  'main-ceremony': {
    'venue-fee': { amount: 5000000 },
    'meal-cost': { amount: 14000000, note: '200명 기준' },
    'thank-you-gifts': { amount: 1000000 },
    'ceremony-staff': { amount: 400000 },
    'main-snap': { amount: 1500000 },
  },
  'sudeme-styling': {
    'dress-main': { amount: 1500000 },
    'dress-tour': { amount: 100000 },
    'groom-suit': { amount: 500000 },
    'studio': { amount: 1500000 },
    'studio-helper': { amount: 200000 },
    'photo-bouquet': { amount: 50000 },
    'makeup': { amount: 700000 },
    'parents-suit': { amount: 500000 },
    'parents-hanbok': { amount: 1000000 },
  },
  'gifts-houseware': {
    'rings': { amount: 6500000 },
    'yedan': { amount: 7100000 },
    'electronics': { amount: 10000000 },
    'furniture': { amount: 8000000 },
  },
  'preparation-promotion': {
    'meeting-meal': { amount: 400000 },
    'meeting-gift': { amount: 400000 },
    'invitation': { amount: 350000, note: '300장 기준' },
    'mobile-invitation': { amount: 20000 },
    'pre-video': { amount: 100000 },
  },
  'honeymoon': {
    'flight': { amount: 2500000 },
    'train': { amount: 400000 },
    'accommodation-1': { amount: 1750000 },
    'accommodation-2': { amount: 2250000 },
  },
  'miscellaneous': {
    'wedding-planner': { amount: 0 },
    'invitation-gathering': { amount: 1250000 },
    'bag-helper': { amount: 0 },
  },
};

export const SOURCE_TEXT = '출처: 2025년 전국 기준 AI 조사 결과';

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

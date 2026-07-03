// [CL-TOP20-P1-DEMO-20260703-010000] 게스트 체험 모드(/demo) 샘플 예산 — 순수 모듈.
//
// 원칙:
//  - DB/네트워크 0 (supabase import 금지) — 익명 방문자가 가입 없이 조작하는 로컬 전용 데이터.
//  - 결정론: id 는 `demo-` 접두사 고정 규칙(랜덤·타임스탬프 금지) → 두 번 생성해도 완전 동일.
//  - 영속은 sessionStorage(브라우저 탭 세션) 한정 — "저장하려면 가입" 전환 포인트를 명확히 유지.
//  - BUDGET_CATEGORIES 전 카테고리·전 소분류를 커버(신규 소분류가 추가돼도 amount 0 으로 자동 포함).

import type { ExtendedBudgetItem, CostSplitType } from '@/components/BudgetTable';
import { BUDGET_CATEGORIES } from '@/lib/budget-categories';

/** sessionStorage 키 (v1 — 스키마 변경 시 버전 승급으로 구버전 자연 폐기) */
export const DEMO_STORAGE_KEY = 'wedsem_demo_budget_v1';

/** 데모 항목들이 공유하는 가상 budget id */
export const DEMO_BUDGET_ID = 'demo-budget';

interface DemoSeed {
  amount: number;
  isPaid?: boolean;
  notes?: string;
  unitPrice?: number;
  quantity?: number;
  costSplit?: CostSplitType;
}

// ─────────────────────────────────────────────────────────────────────────────
// 샘플 시나리오: 서울 · 하객 300명 · 호텔/프리미엄 웨딩 + 풀 혼수 + 유럽 신혼여행.
// 금액 근거: src/lib/average-costs.ts 의 2025 전국 평균을 기준으로,
//  - 서울 프리미엄(대관·식대·스드메)은 전국 평균 대비 상향
//  - 하객 300명 연동 항목(식대·답례품·청첩장)은 인원 비례로 산정
// 총액 = 191,400,000원(약 2억) — 아래 카테고리 소계 합.
// ─────────────────────────────────────────────────────────────────────────────
const DEMO_SEED: Record<string, Record<string, DemoSeed>> = {
  // 본식 운영 소계 62,500,000
  'main-ceremony': {
    // 전국 평균 500만 → 서울 호텔·하우스웨딩 대관은 1,500만~2,500만 선
    'venue-fee': {
      amount: 20000000,
      isPaid: true,
      notes: '호텔 채플홀 계약 완료 (잔금 D-30)',
      costSplit: 'together',
    },
    // 서울 호텔 코스 식대 1인 10만~14만 × 하객 300명 (전국 평균은 200명·7만 기준 1,400만)
    'meal-cost': {
      amount: 36000000,
      unitPrice: 120000,
      quantity: 300,
      notes: '보증 인원 280명, 코스 B',
      costSplit: 'together',
    },
    // 답례품 1만원 × 300명
    'thank-you-gifts': { amount: 3000000 },
    // 사회자 섭외 + 축가 + 축의대 도우미 (전국 평균 40만 대비 서울 섭외비 상향)
    'ceremony-staff': { amount: 1000000 },
    // 본식 스냅 2인 작가 (전국 평균 150만 → 서울 인기 업체 220만~)
    'main-snap': { amount: 2500000 },
  },
  // 스드메·스타일링·예복 소계 14,350,000
  'sudeme-styling': {
    // 서울 청담 드레스샵 본식+촬영 (전국 평균 150만 → 프리미엄 400만)
    'dress-main': { amount: 4000000, notes: '청담 A샵 가계약', costSplit: 'bride' },
    // 투어 3곳 × 10만
    'dress-tour': { amount: 300000 },
    // 맞춤 예복 (전국 평균 50만 → 맞춤 150만)
    'groom-suit': { amount: 1500000, costSplit: 'groom' },
    // 서울 스튜디오 원본·수정본 포함 (전국 평균 150만 → 300만)
    'studio': { amount: 3000000, isPaid: true, notes: '촬영일 확정, 원본 포함' },
    // 촬영 헬퍼 1일
    'studio-helper': { amount: 300000 },
    // 촬영용 생화 부케 추가
    'photo-bouquet': { amount: 150000 },
    // 스튜디오+본식 2회 (전국 평균 70만 → 서울 담당 지정 150만)
    'makeup': { amount: 1500000 },
    // 양가 아버지 예복 2벌 (1벌 60만)
    'parents-suit': { amount: 1200000 },
    // 양가 어머니 한복 2벌 (1벌 120만 맞춤)
    'parents-hanbok': { amount: 2400000 },
  },
  // 혼수 및 예물 소계 89,000,000
  'gifts-houseware': {
    // 예물 반지+예물시계 세트 (전국 평균 650만 → 프리미엄 2,000만)
    'rings': { amount: 20000000, isPaid: true, notes: '반지 2 + 시계 세트', costSplit: 'together' },
    // 예단 (전국 평균 710만 → 상향 1,500만)
    'yedan': { amount: 15000000 },
    // 가전 풀 구성: TV·냉장고·세탁기·건조기·에어컨 등 (전국 평균 1,000만 → 풀옵션 3,200만)
    'electronics': { amount: 32000000, notes: '3월 혼수 박람회에서 견적' },
    // 가구: 침실·거실·다이닝 (전국 평균 800만 → 2,200만)
    'furniture': { amount: 22000000 },
  },
  // 사전 준비 및 인사/홍보 소계 2,350,000
  'preparation-promotion': {
    // 상견례 식사 — 서울 한정식 8인
    'meeting-meal': { amount: 800000 },
    // 상견례 선물 양가
    'meeting-gift': { amount: 600000 },
    // 청첩장 300장 고급지 (전국 평균 35만/300장 → 고급지 60만)
    'invitation': { amount: 600000, isPaid: true, notes: '300장 인쇄 완료' },
    // 모바일 청첩장 프리미엄 템플릿
    'mobile-invitation': { amount: 50000 },
    // 식전 영상 셀프 제작 + 편집 외주
    'pre-video': { amount: 300000 },
  },
  // 신혼여행(유럽 2주) 소계 17,800,000
  'honeymoon': {
    // 유럽 왕복 2인 성수기 (전국 평균 250만 → 프리미엄 이코노미 800만)
    'flight': { amount: 8000000, notes: '성수기 왕복 2인', costSplit: 'together' },
    // 피렌체↔파리 구간 열차 2인
    'train': { amount: 800000 },
    // 피렌체 6박
    'accommodation-1': { amount: 4000000 },
    // 파리 7박
    'accommodation-2': { amount: 5000000 },
  },
  // 기타 사항 소계 5,400,000
  'miscellaneous': {
    // 웨딩 플래너 동행 패키지
    'wedding-planner': { amount: 3000000 },
    // 청첩장 모임 4회 × 50만
    'invitation-gathering': { amount: 2000000 },
    // 가방순이 수고비 + 식사
    'bag-helper': { amount: 400000 },
  },
};

/**
 * 데모 예산 항목 전체를 생성한다 — 결정론(두 번 호출해도 완전 동일한 값).
 * BUDGET_CATEGORIES 순회로 전 카테고리·전 소분류를 빠짐없이 포함하며,
 * 시드에 없는 신규 소분류는 amount 0 으로 안전 폴백한다.
 */
export function createDemoBudgetItems(): ExtendedBudgetItem[] {
  const items: ExtendedBudgetItem[] = [];
  for (const category of BUDGET_CATEGORIES) {
    for (const sub of category.subCategories) {
      const seed = DEMO_SEED[category.id]?.[sub.id];
      items.push({
        id: `demo-${category.id}-${sub.id}`,
        budget_id: DEMO_BUDGET_ID,
        category: category.id,
        sub_category: sub.id,
        amount: seed?.amount ?? 0,
        is_paid: seed?.isPaid ?? false,
        notes: seed?.notes ?? null,
        unit_price: seed?.unitPrice ?? null,
        quantity: seed?.quantity ?? null,
        cost_split: seed?.costSplit,
        is_custom: false,
      });
    }
  }
  return items;
}

/** 총액 합산 */
export function getDemoTotal(items: ExtendedBudgetItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

/** 결제 완료 통계 — 빈 배열이어도 NaN 없이 0% */
export function getDemoPaidStats(items: ExtendedBudgetItem[]): {
  paidCount: number;
  totalCount: number;
  completionRate: number;
} {
  const totalCount = items.length;
  const paidCount = items.filter((item) => item.is_paid).length;
  const completionRate = totalCount === 0 ? 0 : Math.round((paidCount / totalCount) * 100);
  return { paidCount, totalCount, completionRate };
}

// ─── 순수 업데이트 헬퍼(불변) — 페이지는 setItems(prev => …) 로만 배선 ────────────

/** 금액 수정. 인원 계산(unitPrice×quantity) 미전달 시 파생값을 함께 비워 표시 불일치를 막는다. */
export function updateDemoAmount(
  items: ExtendedBudgetItem[],
  category: string,
  subCategory: string,
  amount: number,
  unitPrice?: number,
  quantity?: number,
): ExtendedBudgetItem[] {
  return items.map((item) =>
    item.category === category && item.sub_category === subCategory
      ? { ...item, amount, unit_price: unitPrice ?? null, quantity: quantity ?? null }
      : item,
  );
}

/** 결제 완료 토글 */
export function toggleDemoPaid(items: ExtendedBudgetItem[], itemId: string): ExtendedBudgetItem[] {
  return items.map((item) => (item.id === itemId ? { ...item, is_paid: !item.is_paid } : item));
}

/** 메모 수정 — 공백뿐인 메모는 null 로 정규화(실서비스 표시 규칙과 동일) */
export function updateDemoNotes(
  items: ExtendedBudgetItem[],
  itemId: string,
  notes: string,
): ExtendedBudgetItem[] {
  const normalized = notes.trim() === '' ? null : notes;
  return items.map((item) => (item.id === itemId ? { ...item, notes: normalized } : item));
}

/** 항목 이름 변경(custom_name) — 빈 이름은 무시 */
export function renameDemoItem(
  items: ExtendedBudgetItem[],
  itemId: string,
  newName: string,
): ExtendedBudgetItem[] {
  const trimmed = newName.trim();
  if (!trimmed) return items;
  return items.map((item) => (item.id === itemId ? { ...item, custom_name: trimmed } : item));
}

/** 분담 방식 변경 */
export function updateDemoCostSplit(
  items: ExtendedBudgetItem[],
  itemId: string,
  costSplit: CostSplitType,
): ExtendedBudgetItem[] {
  return items.map((item) => (item.id === itemId ? { ...item, cost_split: costSplit } : item));
}

/**
 * 커스텀 항목 추가 — id 는 살아있는 항목의 최대 인덱스 + 1(`demo-custom-N`).
 * 카운트 방식과 달리 중간 삭제 후 추가에도 id 충돌이 없다(결정론·랜덤 금지).
 */
export function addDemoCustomItem(
  items: ExtendedBudgetItem[],
  categoryId: string,
  name: string,
): ExtendedBudgetItem[] {
  const trimmed = name.trim();
  if (!trimmed) return items;
  let maxIndex = 0;
  for (const item of items) {
    const match = /^demo-custom-(\d+)$/.exec(item.id);
    if (match) maxIndex = Math.max(maxIndex, parseInt(match[1], 10));
  }
  const id = `demo-custom-${maxIndex + 1}`;
  return [
    ...items,
    {
      id,
      budget_id: DEMO_BUDGET_ID,
      category: categoryId,
      sub_category: id,
      amount: 0,
      is_paid: false,
      notes: null,
      custom_name: trimmed,
      is_custom: true,
    },
  ];
}

/** 항목 삭제 */
export function deleteDemoItem(items: ExtendedBudgetItem[], itemId: string): ExtendedBudgetItem[] {
  return items.filter((item) => item.id !== itemId);
}

// ─── sessionStorage 영속 (손상·프라이빗 모드 전부 무음 폴백 — UX 비차단) ────────

/** 저장된 항목 1건의 최소 무결성 검증 — 하나라도 어긋나면 전체를 기본값으로 폐기 */
function isValidStoredItem(value: unknown): value is ExtendedBudgetItem {
  if (typeof value !== 'object' || value === null) return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    o.id.startsWith('demo-') &&
    typeof o.category === 'string' &&
    typeof o.sub_category === 'string' &&
    typeof o.amount === 'number' &&
    Number.isFinite(o.amount) &&
    o.amount >= 0 &&
    typeof o.is_paid === 'boolean' &&
    (o.notes === null || typeof o.notes === 'string')
  );
}

/**
 * sessionStorage 에서 데모 예산을 복원한다.
 * 손상 JSON·형식 불일치·빈 배열·스토리지 접근 불가 → 기본 샘플로 폴백(절대 throw 하지 않음).
 */
export function loadDemoBudget(): ExtendedBudgetItem[] {
  try {
    const raw = sessionStorage.getItem(DEMO_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isValidStoredItem)) {
        return parsed;
      }
      // 손상 데이터는 제거해 다음 로드부터 깨끗한 상태 보장
      sessionStorage.removeItem(DEMO_STORAGE_KEY);
    }
  } catch {
    // JSON 파싱 실패 → 손상분 제거 시도 후 기본값 (스토리지 자체 불가면 이것도 무음 스킵)
    try {
      sessionStorage.removeItem(DEMO_STORAGE_KEY);
    } catch {
      /* noop — 프라이빗 모드 등 */
    }
  }
  return createDemoBudgetItems();
}

/** 데모 예산 저장 — 실패(쿼터·프라이빗 모드)는 무음(체험 UX 비차단) */
export function saveDemoBudget(items: ExtendedBudgetItem[]): void {
  try {
    sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* noop */
  }
}

/** 저장분 폐기 + 기본 샘플 반환(초기화 버튼) */
export function resetDemoBudget(): ExtendedBudgetItem[] {
  try {
    sessionStorage.removeItem(DEMO_STORAGE_KEY);
  } catch {
    /* noop */
  }
  return createDemoBudgetItems();
}

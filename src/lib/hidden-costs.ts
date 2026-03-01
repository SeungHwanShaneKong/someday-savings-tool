/**
 * 숨겨진 비용 규칙 엔진 (BRD §1)
 * 한국 결혼 준비에서 자주 놓치는 추가 비용 경고
 * API 비용 0원 — 클라이언트 규칙 엔진
 */

export interface HiddenCostRule {
  id: string;
  /** 트리거 조건: 이 category + subCategory에 금액이 입력되면 발동 */
  triggerCategory: string;
  triggerSubCategory: string;
  /** 경고 제목 */
  title: string;
  /** 상세 설명 */
  description: string;
  /** 추정 추가 비용 (원) */
  estimatedCost: number;
  /** 아이콘 */
  emoji: string;
  /** 관련 예산 카테고리 (연결할 곳) */
  relatedCategory?: string;
  relatedSubCategory?: string;
}

export const HIDDEN_COST_RULES: HiddenCostRule[] = [
  // ─── 스드메 관련 ───
  {
    id: 'dress-fitting-fee',
    triggerCategory: 'sudeme-styling',
    triggerSubCategory: 'dress-main',
    title: '드레스 피팅비',
    description:
      '드레스 수선 및 피팅에 추가 비용(10~20만원)이 발생할 수 있어요. 계약 시 포함 여부를 확인하세요.',
    estimatedCost: 200000,
    emoji: '👗',
  },
  {
    id: 'studio-helper-fee',
    triggerCategory: 'sudeme-styling',
    triggerSubCategory: 'studio',
    title: '스튜디오 촬영 헬퍼비',
    description:
      '촬영 시 드레스 정리/메이크업 보조 헬퍼비(약 20만원)가 별도 청구되는 경우가 많아요.',
    estimatedCost: 200000,
    emoji: '📸',
    relatedCategory: 'sudeme-styling',
    relatedSubCategory: 'studio-helper',
  },
  {
    id: 'photo-bouquet-extra',
    triggerCategory: 'sudeme-styling',
    triggerSubCategory: 'studio',
    title: '촬영용 부케 추가',
    description:
      '스튜디오 촬영용 부케는 본식 부케와 별도로 약 5만원 정도 추가돼요.',
    estimatedCost: 50000,
    emoji: '💐',
    relatedCategory: 'sudeme-styling',
    relatedSubCategory: 'photo-bouquet',
  },
  {
    id: 'original-photo-fee',
    triggerCategory: 'sudeme-styling',
    triggerSubCategory: 'studio',
    title: '원본 사진 추가 비용',
    description:
      '스튜디오 원본 사진 전체를 받으려면 30~50만원의 추가 비용이 발생할 수 있어요.',
    estimatedCost: 400000,
    emoji: '🖼️',
  },
  {
    id: 'makeup-rehearsal',
    triggerCategory: 'sudeme-styling',
    triggerSubCategory: 'makeup',
    title: '메이크업 리허설비',
    description:
      '본식 전 메이크업 리허설 비용(5~10만원)이 별도로 발생할 수 있어요.',
    estimatedCost: 100000,
    emoji: '💄',
  },

  // ─── 본식 관련 ───
  {
    id: 'venue-overtime',
    triggerCategory: 'main-ceremony',
    triggerSubCategory: 'venue-fee',
    title: '예식장 시간 초과 요금',
    description:
      '예식 시간 초과 시 30분당 추가 요금(10~30만원)이 부과될 수 있어요.',
    estimatedCost: 200000,
    emoji: '⏰',
  },
  {
    id: 'meal-kids-free',
    triggerCategory: 'main-ceremony',
    triggerSubCategory: 'meal-cost',
    title: '어린이 식대',
    description:
      '어린이 하객 식대가 별도 청구되는 예식장도 있어요. 미리 확인하세요.',
    estimatedCost: 500000,
    emoji: '🧒',
  },
  {
    id: 'snap-extra-pages',
    triggerCategory: 'main-ceremony',
    triggerSubCategory: 'main-snap',
    title: '스냅 앨범 추가 페이지',
    description:
      '기본 컷 외 추가 사진 선택 시 앨범 페이지당 추가 비용이 발생해요.',
    estimatedCost: 300000,
    emoji: '📷',
  },

  // ─── 혼수/예물 관련 ───
  {
    id: 'ring-engraving',
    triggerCategory: 'gifts-houseware',
    triggerSubCategory: 'rings',
    title: '반지 각인 비용',
    description: '이름/날짜 각인 시 추가 비용(3~5만원)이 발생할 수 있어요.',
    estimatedCost: 50000,
    emoji: '💍',
  },
  {
    id: 'furniture-delivery',
    triggerCategory: 'gifts-houseware',
    triggerSubCategory: 'furniture',
    title: '가구 배송/설치비',
    description:
      '대형 가구는 층수/엘리베이터에 따라 배송 설치비(10~30만원)가 추가돼요.',
    estimatedCost: 200000,
    emoji: '🛋️',
  },
  {
    id: 'electronics-installation',
    triggerCategory: 'gifts-houseware',
    triggerSubCategory: 'electronics',
    title: '가전 설치비',
    description:
      '에어컨, 빌트인 가전 등은 설치비(5~20만원)가 별도로 발생해요.',
    estimatedCost: 150000,
    emoji: '🔧',
  },

  // ─── 신혼여행 관련 ───
  {
    id: 'travel-insurance',
    triggerCategory: 'honeymoon',
    triggerSubCategory: 'flight',
    title: '여행자 보험',
    description:
      '해외 신혼여행 시 여행자 보험(2인 5~10만원)을 꼭 가입하세요.',
    estimatedCost: 100000,
    emoji: '🛡️',
  },
  {
    id: 'airport-transfer',
    triggerCategory: 'honeymoon',
    triggerSubCategory: 'flight',
    title: '공항 교통비',
    description:
      '공항 리무진/택시 왕복 비용(5~15만원)을 예산에 포함하세요.',
    estimatedCost: 100000,
    emoji: '🚕',
  },
  {
    id: 'hotel-resort-fee',
    triggerCategory: 'honeymoon',
    triggerSubCategory: 'accommodation-1',
    title: '리조트 피/세금',
    description:
      '해외 호텔/리조트는 예약 금액 외 리조트 피(1박 2~5만원)가 추가되는 경우가 많아요.',
    estimatedCost: 200000,
    emoji: '🏨',
  },
  {
    id: 'honeymoon-activities',
    triggerCategory: 'honeymoon',
    triggerSubCategory: 'accommodation-1',
    title: '현지 액티비티 비용',
    description:
      '스노클링, 투어, 스파 등 현지 액티비티 비용(50~100만원)을 여유롭게 잡으세요.',
    estimatedCost: 800000,
    emoji: '🤿',
  },
];

/**
 * 특정 카테고리/서브카테고리에 금액이 입력됐을 때 트리거되는 숨겨진 비용 규칙 찾기
 */
export function getHiddenCostsForItem(
  categoryId: string,
  subCategoryId: string
): HiddenCostRule[] {
  return HIDDEN_COST_RULES.filter(
    (rule) =>
      rule.triggerCategory === categoryId &&
      rule.triggerSubCategory === subCategoryId
  );
}

/**
 * 전체 숨겨진 비용 합계 계산
 * @param filledCategories 금액이 입력된 [categoryId, subCategoryId] 쌍 배열
 */
export function calculateTotalHiddenCosts(
  filledCategories: Array<[string, string]>
): {
  total: number;
  rules: HiddenCostRule[];
} {
  const triggeredRules: HiddenCostRule[] = [];
  const seenIds = new Set<string>();

  for (const [catId, subId] of filledCategories) {
    const rules = getHiddenCostsForItem(catId, subId);
    for (const rule of rules) {
      if (!seenIds.has(rule.id)) {
        seenIds.add(rule.id);
        triggeredRules.push(rule);
      }
    }
  }

  return {
    total: triggeredRules.reduce((sum, r) => sum + r.estimatedCost, 0),
    rules: triggeredRules,
  };
}

/**
 * 허니문 여행지 매트릭스 데이터 (BRD §3.2)
 * 좌표 포함 — MapLibre GL 지도 마커용
 */

export type HoneymoonConcept = '휴양' | '관광' | '쇼핑' | '액티비티';
export type AccommodationType = '풀빌라' | '올인클루시브' | '리조트' | '호텔' | '에어비앤비';

export interface Destination {
  id: string;
  name: string;
  nameEn: string;
  coordinates: [number, number]; // [lng, lat] for Mapbox
  concepts: HoneymoonConcept[];
  accommodationTypes: AccommodationType[];
  budgetRange: { min: number; max: number }; // 원 단위
  nights: number;
  features: string[];
  bestBookingWeeks: number; // 출국 전 최적 예약 주수
  visaRequired: boolean;
  description: string;
  markerEmoji: string;
  highlights: string[];
  costBreakdown: {
    flight: { min: number; max: number };
    accommodation: { min: number; max: number };
    local: { min: number; max: number };
  };
}

export const DESTINATIONS: Destination[] = [
  {
    id: 'maldives',
    name: '몰디브',
    nameEn: 'Maldives',
    coordinates: [73.5, 3.2],
    concepts: ['휴양'],
    accommodationTypes: ['풀빌라', '올인클루시브'],
    budgetRange: { min: 8000000, max: 15000000 },
    nights: 7,
    features: ['프라이빗 수상 빌라', '올인클루시브', '스노클링', '선셋 크루즈'],
    bestBookingWeeks: 21,
    visaRequired: false,
    description: '인도양의 보석, 프라이빗 수상 빌라에서 꿈같은 허니문을 보내세요',
    markerEmoji: '🏝️',
    highlights: ['수상 빌라', '산호초 스노클링', '돌핀 워칭'],
    costBreakdown: {
      flight: { min: 1500000, max: 2500000 },
      accommodation: { min: 5000000, max: 10000000 },
      local: { min: 1500000, max: 2500000 },
    },
  },
  {
    id: 'europe',
    name: '유럽',
    nameEn: 'Europe',
    coordinates: [2.35, 48.86], // Paris
    concepts: ['관광', '쇼핑'],
    accommodationTypes: ['호텔', '에어비앤비'],
    budgetRange: { min: 6000000, max: 12000000 },
    nights: 10,
    features: ['파리-로마-바르셀로나', '미술관', '미슐랭 레스토랑', '쇼핑'],
    bestBookingWeeks: 16,
    visaRequired: false,
    description: '파리의 에펠탑, 로마의 콜로세움, 바르셀로나의 가우디까지',
    markerEmoji: '🗼',
    highlights: ['에펠탑 야경', '곤돌라 체험', '와이너리 투어'],
    costBreakdown: {
      flight: { min: 1800000, max: 3000000 },
      accommodation: { min: 2500000, max: 5000000 },
      local: { min: 1700000, max: 4000000 },
    },
  },
  {
    id: 'hawaii',
    name: '하와이',
    nameEn: 'Hawaii',
    coordinates: [-155.5, 19.9],
    concepts: ['휴양', '액티비티'],
    accommodationTypes: ['리조트', '호텔'],
    budgetRange: { min: 7000000, max: 13000000 },
    nights: 7,
    features: ['와이키키 비치', '할레아칼라 일출', '스노클링', '루아우 쇼'],
    bestBookingWeeks: 18,
    visaRequired: true,
    description: '태평양의 낙원, 다양한 액티비티와 휴양을 동시에',
    markerEmoji: '🌺',
    highlights: ['와이키키 서핑', '나팔리 코스트', '화산 국립공원'],
    costBreakdown: {
      flight: { min: 2000000, max: 3500000 },
      accommodation: { min: 3000000, max: 6000000 },
      local: { min: 2000000, max: 3500000 },
    },
  },
  {
    id: 'bali',
    name: '발리',
    nameEn: 'Bali',
    coordinates: [115.2, -8.65],
    concepts: ['휴양', '관광'],
    accommodationTypes: ['풀빌라', '리조트'],
    budgetRange: { min: 3500000, max: 7000000 },
    nights: 7,
    features: ['우붓 라이스 테라스', '프라이빗 풀빌라', '사원', '스파'],
    bestBookingWeeks: 12,
    visaRequired: false,
    description: '가성비 최고의 럭셔리 허니문, 신들의 섬 발리',
    markerEmoji: '🌴',
    highlights: ['우붓 정글 스윙', '울루와뚜 절벽 사원', '바투르 화산 트레킹'],
    costBreakdown: {
      flight: { min: 800000, max: 1500000 },
      accommodation: { min: 1500000, max: 3500000 },
      local: { min: 1200000, max: 2000000 },
    },
  },
  {
    id: 'cancun',
    name: '칸쿤',
    nameEn: 'Cancún',
    coordinates: [-86.85, 21.16],
    concepts: ['휴양', '액티비티'],
    accommodationTypes: ['올인클루시브', '리조트'],
    budgetRange: { min: 7000000, max: 14000000 },
    nights: 7,
    features: ['올인클루시브 리조트', '치첸이트사', '세노테', '카리브해'],
    bestBookingWeeks: 16,
    visaRequired: true,
    description: '카리브해의 에메랄드빛 바다와 마야 유적의 만남',
    markerEmoji: '🏖️',
    highlights: ['세노테 다이빙', '치첸이트사', '이슬라무헤레스'],
    costBreakdown: {
      flight: { min: 2500000, max: 4000000 },
      accommodation: { min: 3000000, max: 7000000 },
      local: { min: 1500000, max: 3000000 },
    },
  },
  {
    id: 'jeju',
    name: '제주',
    nameEn: 'Jeju',
    coordinates: [126.57, 33.45],
    concepts: ['휴양', '관광'],
    accommodationTypes: ['호텔', '에어비앤비', '풀빌라'],
    budgetRange: { min: 1500000, max: 4000000 },
    nights: 4,
    features: ['한라산', '올레길', '해녀 체험', '카페 투어'],
    bestBookingWeeks: 4,
    visaRequired: false,
    description: '국내 최고의 허니문 명소, 부담 없는 가성비 여행',
    markerEmoji: '🍊',
    highlights: ['한라산 등반', '성산일출봉', '우도 자전거'],
    costBreakdown: {
      flight: { min: 200000, max: 400000 },
      accommodation: { min: 800000, max: 2500000 },
      local: { min: 500000, max: 1100000 },
    },
  },
];

/**
 * 필터 기준으로 여행지 매칭 점수 계산 (0~1)
 */
export function getMatchScore(
  destination: Destination,
  filters: {
    maxBudget?: number;
    minNights?: number;
    maxNights?: number;
    concepts?: HoneymoonConcept[];
    accommodationTypes?: AccommodationType[];
  }
): number {
  let score = 1;

  if (filters.maxBudget && destination.budgetRange.min > filters.maxBudget) {
    score *= 0.2; // 예산 초과 — 크게 감점
  } else if (
    filters.maxBudget &&
    destination.budgetRange.max <= filters.maxBudget
  ) {
    score *= 1; // 예산 내 — 만점
  }

  if (
    filters.minNights &&
    destination.nights < filters.minNights
  ) {
    score *= 0.5;
  }

  if (
    filters.maxNights &&
    destination.nights > filters.maxNights
  ) {
    score *= 0.5;
  }

  if (filters.concepts && filters.concepts.length > 0) {
    const matched = destination.concepts.filter((c) =>
      filters.concepts!.includes(c)
    );
    if (matched.length === 0) score *= 0.3;
    else score *= 0.5 + 0.5 * (matched.length / filters.concepts.length);
  }

  if (filters.accommodationTypes && filters.accommodationTypes.length > 0) {
    const matched = destination.accommodationTypes.filter((a) =>
      filters.accommodationTypes!.includes(a)
    );
    if (matched.length === 0) score *= 0.3;
    else
      score *=
        0.5 + 0.5 * (matched.length / filters.accommodationTypes.length);
  }

  return Math.max(0, Math.min(1, score));
}

export function getDestinationById(id: string): Destination | undefined {
  return DESTINATIONS.find((d) => d.id === id);
}

// [HONEYMOON-UPGRADE-2026-03-07] 스마트 배지 시스템
export interface Badge {
  label: string;
  color: string; // tailwind bg + text class pair
}

export function computeBadges(destination: Destination): Badge[] {
  const badges: Badge[] = [];

  // "가성비 최고" — 1박당 최저 비용이 전체 중 가장 낮은 경우
  const perNightMin = destination.budgetRange.min / destination.nights;
  const allPerNight = DESTINATIONS.map((d) => d.budgetRange.min / d.nights);
  const lowestPerNight = Math.min(...allPerNight);
  if (perNightMin === lowestPerNight) {
    badges.push({ label: '가성비 최고', color: 'bg-emerald-100 text-emerald-700' });
  }

  // "인기 허니문" — concepts 3개 이상 또는 accommodationTypes 3개 이상
  if (destination.concepts.length >= 2 && destination.accommodationTypes.length >= 2) {
    badges.push({ label: '인기 허니문', color: 'bg-rose-100 text-rose-700' });
  }

  // "비자 불필요"
  if (!destination.visaRequired) {
    badges.push({ label: '비자 불필요', color: 'bg-sky-100 text-sky-700' });
  }

  // "단기 추천" — 4박 이하
  if (destination.nights <= 4) {
    badges.push({ label: '단기 추천', color: 'bg-amber-100 text-amber-700' });
  }

  return badges.slice(0, 2); // 최대 2개
}

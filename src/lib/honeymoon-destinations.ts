/**
 * 허니문 여행지 매트릭스 데이터 (BRD §3.2)
 * 좌표 포함 — MapLibre GL 지도 마커용
 */

export type HoneymoonConcept = '휴양' | '관광' | '쇼핑' | '액티비티';
export type AccommodationType = '풀빌라' | '올인클루시브' | '리조트' | '호텔' | '에어비앤비';

// [CL-TOP100-DESTINATIONS-20260325] 지역 분류
export type DestinationRegion =
  | '동남아' | '동아시아' | '남아시아/인도양' | '중동/아프리카'
  | '유럽' | '북미' | '중남미/카리브' | '오세아니아/태평양' | '국내';

export interface Destination {
  id: string;
  name: string;
  nameEn: string;
  region: DestinationRegion; // [CL-TOP100-DESTINATIONS-20260325]
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

// [CL-TOP100-DESTINATIONS-20260325] 데이터 파일 분리 → import + re-export
import { DESTINATIONS } from './honeymoon-destinations-data';
export { DESTINATIONS };

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

// [CL-TOP100-DESTINATIONS-20260325] 100개 대응: 가성비 하위 10% + 근거리 뱃지
export function computeBadges(destination: Destination): Badge[] {
  const badges: Badge[] = [];

  // "가성비 최고" — 1박당 비용이 하위 10% 이내
  const perNightMin = destination.budgetRange.min / destination.nights;
  const allPerNight = DESTINATIONS.map((d) => d.budgetRange.min / d.nights).sort((a, b) => a - b);
  const threshold10 = allPerNight[Math.floor(allPerNight.length * 0.1)] ?? allPerNight[0];
  if (perNightMin <= threshold10) {
    badges.push({ label: '가성비 최고', color: 'bg-emerald-100 text-emerald-700' });
  }

  // "인기 허니문" — concepts 2개 이상 & accommodationTypes 2개 이상
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

  // "근거리 추천" — 동아시아/국내
  if (destination.region === '동아시아' || destination.region === '국내') {
    badges.push({ label: '근거리 추천', color: 'bg-violet-100 text-violet-700' });
  }

  return badges.slice(0, 2); // 최대 2개
}

/**
 * [CL-HONEYMOON-REDESIGN-20260316] 여행 성향 프로필 계산 + AI 폴백 생성
 */

import { WORLD_CUP_IMAGES, type TravelStyle } from './honeymoon-images';
import { DESTINATIONS, getMatchScore, type HoneymoonConcept, type AccommodationType } from './honeymoon-destinations';

// ── 프로필 타입 ──

export interface TravelProfile {
  dominantStyle: TravelStyle;
  styleScores: Record<TravelStyle, number>;
  selectedImageIds: string[];
  finalWinnerId: string;
  profileLabel: string;
  profileEmoji: string;
  budgetRange: { min: number; max: number };
  nights: { min: number; max: number };
  departureMonth: number | null;
}

// ── AI 큐레이션 결과 타입 ──

export interface AICurationRecommendation {
  destinationId: string;
  matchScore: number;
  reason: string;
  highlights: string[];
  bestMonths?: number[];
  weatherNote?: string;
}

export interface AICurationResult {
  recommendations: AICurationRecommendation[];
  profileSummary: string;
  profileLabel: string;
  profileEmoji: string;
}

// ── 스타일 라벨 매핑 ──

const STYLE_LABELS: Record<TravelStyle, { label: string; emoji: string }> = {
  relaxation: { label: '여유로운 힐링파', emoji: '🌴' },
  adventure: { label: '모험 탐험가', emoji: '🤿' },
  culture: { label: '문화 감성 여행자', emoji: '🏛️' },
  luxury: { label: '럭셔리 휴양파', emoji: '🏖️' },
};

// ── 스타일 → 필터 매핑 ──

export const STYLE_TO_CONCEPTS: Record<TravelStyle, HoneymoonConcept[]> = {
  relaxation: ['휴양'],
  adventure: ['액티비티'],
  culture: ['관광', '쇼핑'],
  luxury: ['휴양'],
};

export const STYLE_TO_ACCOMMODATION: Record<TravelStyle, AccommodationType[]> = {
  relaxation: ['리조트', '풀빌라'],
  adventure: ['호텔', '에어비앤비'],
  culture: ['호텔', '에어비앤비'],
  luxury: ['풀빌라', '올인클루시브'],
};

/**
 * 월드컵 선택 결과로 프로필 계산
 *
 * 가중치: QF 승리 1점, SF 승리 2점, FINAL 승리 3점
 */
export function computeProfileFromSelections(
  selections: string[],
): Omit<TravelProfile, 'budgetRange' | 'nights' | 'departureMonth'> {
  const scores: Record<TravelStyle, number> = {
    relaxation: 0,
    adventure: 0,
    culture: 0,
    luxury: 0,
  };

  const weights = [1, 1, 1, 1, 2, 2, 3]; // QF×4, SF×2, FINAL×1

  selections.forEach((id, i) => {
    const img = WORLD_CUP_IMAGES.find(im => im.id === id);
    if (img && i < weights.length) {
      scores[img.travelStyle] += weights[i];
    }
  });

  const dominant = (Object.entries(scores) as [TravelStyle, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  const { label, emoji } = STYLE_LABELS[dominant];

  return {
    dominantStyle: dominant,
    styleScores: scores,
    selectedImageIds: selections,
    finalWinnerId: selections[selections.length - 1] ?? '',
    profileLabel: label,
    profileEmoji: emoji,
  };
}

/**
 * AI API 실패 시 로컬 폴백 추천 생성
 * [CL-TOP100-DESTINATIONS-20260325] getMatchScore() 기반 상위 5개 선정
 */
export function buildLocalFallbackResults(profile: TravelProfile): AICurationResult {
  const concepts = STYLE_TO_CONCEPTS[profile.dominantStyle] ?? [];
  const accommodations = STYLE_TO_ACCOMMODATION[profile.dominantStyle] ?? [];

  const scored = DESTINATIONS.map(d => ({
    destination: d,
    score: getMatchScore(d, {
      maxBudget: profile.budgetRange.max,
      minNights: profile.nights.min,
      maxNights: profile.nights.max,
      concepts,
      accommodationTypes: accommodations,
    }),
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // [CL-TOP100-DESTINATIONS-20260325] 3→5

  const { label, emoji } = STYLE_LABELS[profile.dominantStyle];

  return {
    recommendations: scored.map(({ destination, score }) => ({
      destinationId: destination.id,
      matchScore: Math.round(score * 100) / 100,
      reason: `${destination.name}은(는) ${label} 스타일에 딱 맞는 여행지예요. ${destination.description}`,
      highlights: destination.highlights.slice(0, 3),
    })),
    profileSummary: `당신은 ${label} 스타일이에요! ${concepts.join(', ')} 위주의 여행을 좋아하시는군요.`,
    profileLabel: label,
    profileEmoji: emoji,
  };
}

/**
 * [CL-TOP100-DESTINATIONS-20260325] AI 큐레이션용 후보 프리필터링
 * 100개 중 상위 20개만 AI에 전송하여 토큰 최적화
 */
export function preFilterCandidates(
  profile: TravelProfile,
  limit = 20,
): { destination: import('./honeymoon-destinations').Destination; score: number }[] {
  const concepts = STYLE_TO_CONCEPTS[profile.dominantStyle] ?? [];
  const accommodations = STYLE_TO_ACCOMMODATION[profile.dominantStyle] ?? [];

  return DESTINATIONS.map(d => ({
    destination: d,
    score: getMatchScore(d, {
      maxBudget: profile.budgetRange.max,
      minNights: profile.nights.min,
      maxNights: profile.nights.max,
      concepts,
      accommodationTypes: accommodations,
    }),
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

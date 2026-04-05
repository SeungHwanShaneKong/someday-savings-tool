/**
 * [CL-HONEYMOON-REDESIGN-20260316] 여행 성향 프로필 계산 + AI 폴백 생성
 */

import { WORLD_CUP_IMAGES, type TravelStyle, type WorldCupImage, type WorldCupRanking } from './honeymoon-images';
import { DESTINATIONS, getMatchScore, type HoneymoonConcept, type AccommodationType, type Destination } from './honeymoon-destinations';

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
  worldCupRanking?: WorldCupRanking; // [CL-WORLDCUP-IMG-ALGO-20260405-140000]
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
 * [CL-IMPROVE-7TASKS-20260330] 15매치 대응: R16×8(0.5), QF×4(1), SF×2(2), FINAL×1(3)
 *
 * @param allImages 현재 세션의 WorldCupImage 배열 (16강 확장 대응)
 */
export function computeProfileFromSelections(
  selections: string[],
  allImages?: WorldCupImage[],
): Omit<TravelProfile, 'budgetRange' | 'nights' | 'departureMonth'> {
  const scores: Record<TravelStyle, number> = {
    relaxation: 0,
    adventure: 0,
    culture: 0,
    luxury: 0,
  };

  // [CL-IMPROVE-7TASKS-20260330] R16×8(0.5), QF×4(1), SF×2(2), FINAL×1(3)
  const weights = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1, 2, 2, 3];
  const imagePool = allImages ?? WORLD_CUP_IMAGES;

  selections.forEach((id, i) => {
    const img = imagePool.find(im => im.id === id);
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
 * [CL-WORLDCUP-IMG-ALGO-20260405-140000] 월드컵 랭킹 기반 + 스코어 기반 인터리빙
 */
export function buildLocalFallbackResults(profile: TravelProfile): AICurationResult {
  const { label, emoji } = STYLE_LABELS[profile.dominantStyle];
  const ranking = profile.worldCupRanking;

  // 월드컵 랭킹 없으면 기존 스코어 기반 로직 (하위호환)
  if (!ranking) {
    return buildScoreBasedResults(profile);
  }

  const recommendations: AICurationRecommendation[] = [];
  const usedIds = new Set<string>();
  const usedRegions: string[] = [];

  // Slot 1: 🏆 Champion
  const champion = DESTINATIONS.find(d => d.id === ranking.champion);
  if (champion) {
    recommendations.push({
      destinationId: champion.id,
      matchScore: 0.99,
      reason: `월드컵에서 우승한 여행지! ${champion.description}`,
      highlights: champion.highlights.slice(0, 3),
    });
    usedIds.add(champion.id);
    usedRegions.push(champion.region);
  }

  // Slot 2: 🥈 Finalist
  const finalist = DESTINATIONS.find(d => d.id === ranking.finalist);
  if (finalist && !usedIds.has(finalist.id)) {
    recommendations.push({
      destinationId: finalist.id,
      matchScore: 0.92,
      reason: `결승까지 올라간 여행지예요. ${finalist.description}`,
      highlights: finalist.highlights.slice(0, 3),
    });
    usedIds.add(finalist.id);
    usedRegions.push(finalist.region);
  }

  // Slots 3-4: 🥉 SemiFinalists (지역 다양성 우선)
  const sfDests = ranking.semiFinalists
    .map(id => DESTINATIONS.find(d => d.id === id))
    .filter((d): d is Destination => d !== undefined && !usedIds.has(d.id))
    .sort((a, b) => {
      const aNew = usedRegions.includes(a.region) ? 0 : 1;
      const bNew = usedRegions.includes(b.region) ? 0 : 1;
      return bNew - aNew;
    });

  for (const sf of sfDests) {
    recommendations.push({
      destinationId: sf.id,
      matchScore: 0.85,
      reason: `4강까지 진출한 여행지! ${sf.description}`,
      highlights: sf.highlights.slice(0, 3),
    });
    usedIds.add(sf.id);
    usedRegions.push(sf.region);
  }

  // Slots 5-7: 스코어 기반 + 지역 다양성 + 8강 보너스
  const concepts = STYLE_TO_CONCEPTS[profile.dominantStyle] ?? [];
  const accommodations = STYLE_TO_ACCOMMODATION[profile.dominantStyle] ?? [];

  const fillCandidates = DESTINATIONS
    .filter(d => !usedIds.has(d.id))
    .map(d => {
      const score = getMatchScore(d, {
        maxBudget: profile.budgetRange.max,
        minNights: profile.nights.min,
        maxNights: profile.nights.max,
        concepts,
        accommodationTypes: accommodations,
      });
      const wcBonus = ranking.quarterFinalists.includes(d.id) ? 0.15 : 0;
      const regionBonus = usedRegions.includes(d.region) ? 0 : 0.1;
      return { destination: d, totalScore: score + wcBonus + regionBonus, isQF: wcBonus > 0 };
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 3);

  for (const c of fillCandidates) {
    recommendations.push({
      destinationId: c.destination.id,
      matchScore: Math.round(Math.min(c.totalScore, 0.99) * 100) / 100,
      reason: c.isQF
        ? `8강까지 진출한 여행지예요. ${c.destination.description}`
        : `${label} 스타일에 딱 맞는 여행지예요. ${c.destination.description}`,
      highlights: c.destination.highlights.slice(0, 3),
    });
    usedIds.add(c.destination.id);
    usedRegions.push(c.destination.region);
  }

  return {
    recommendations,
    profileSummary: `당신은 ${label} 스타일이에요! 월드컵 결과를 바탕으로 최적의 여행지를 추천해드려요.`,
    profileLabel: label,
    profileEmoji: emoji,
  };
}

/** 기존 스코어 기반 로직 (worldCupRanking 없을 때 하위호환) */
function buildScoreBasedResults(profile: TravelProfile): AICurationResult {
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
    .slice(0, 5);

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
 * [CL-WORLDCUP-IMG-ALGO-20260405-140000] 월드컵 상위 진출자 부스팅
 */
export function preFilterCandidates(
  profile: TravelProfile,
  limit = 20,
): { destination: Destination; score: number }[] {
  const concepts = STYLE_TO_CONCEPTS[profile.dominantStyle] ?? [];
  const accommodations = STYLE_TO_ACCOMMODATION[profile.dominantStyle] ?? [];
  const ranking = profile.worldCupRanking;

  // 월드컵 참가자 ID 수집
  const wcIds = new Set<string>();
  if (ranking) {
    wcIds.add(ranking.champion);
    wcIds.add(ranking.finalist);
    ranking.semiFinalists.forEach(id => wcIds.add(id));
    ranking.quarterFinalists.forEach(id => wcIds.add(id));
  }

  return DESTINATIONS.map(d => {
    let score = getMatchScore(d, {
      maxBudget: profile.budgetRange.max,
      minNights: profile.nights.min,
      maxNights: profile.nights.max,
      concepts,
      accommodationTypes: accommodations,
    });

    // 월드컵 상위 진출자 부스팅 (AI 후보에 반드시 포함)
    if (ranking) {
      if (d.id === ranking.champion) score = Math.max(score, 0.99);
      else if (d.id === ranking.finalist) score = Math.max(score, 0.95);
      else if (ranking.semiFinalists.includes(d.id)) score = Math.max(score, 0.90);
      else if (wcIds.has(d.id)) score += 0.15;
    }

    return { destination: d, score };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

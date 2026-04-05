// [CL-REMOVE-OLD-PLANNER-20260325] AI 큐레이션 전용 Hook
// [CL-TOP100-DESTINATIONS-20260325] 프리필터링 + candidates 전송

import { useState, useCallback } from 'react';
import { edgeFunctionFetch, getUserFriendlyError } from '@/lib/edge-function-fetch';
import type { AICurationResult, TravelProfile } from '@/lib/honeymoon-profile';
import { preFilterCandidates } from '@/lib/honeymoon-profile';

// ── 타입 재수출 (기존 import 경로 호환) ──

export type { AICurationResult, AICurationRecommendation } from '@/lib/honeymoon-profile';

// ── Hook 전용 타입 ──

export interface CurateProfile {
  dominantStyle: string;
  styleScores: Record<string, number>;
  budgetMin: number;
  budgetMax: number;
  nightsMin: number;
  nightsMax: number;
  departureMonth?: number;
}

// [CL-TOP100-DESTINATIONS-20260325] AI에 전송할 후보 정보
interface CandidateInfo {
  id: string;
  name: string;
  region: string;
  description: string;
  highlights: string[];
  budgetRange: { min: number; max: number };
  nights: number;
  localScore: number;
}

// ── Hook ──

interface UseHoneymoonPlannerResult {
  curationResult: AICurationResult | null;
  curateLoading: boolean;
  curateError: string | null;
  curateDestinations: (profile: CurateProfile, travelProfile?: TravelProfile) => Promise<void>;
}

export function useHoneymoonPlanner(): UseHoneymoonPlannerResult {
  const [curationResult, setCurationResult] = useState<AICurationResult | null>(null);
  const [curateLoading, setCurateLoading] = useState(false);
  const [curateError, setCurateError] = useState<string | null>(null);

  const curateDestinations = useCallback(
    async (profile: CurateProfile, travelProfile?: TravelProfile) => {
      setCurateLoading(true);
      setCurateError(null);
      setCurationResult(null);

      // [CL-TOP100-DESTINATIONS-20260325] 100개 중 상위 20개만 AI에 전송
      let candidates: CandidateInfo[] = [];
      if (travelProfile) {
        candidates = preFilterCandidates(travelProfile, 20).map(({ destination, score }) => ({
          id: destination.id,
          name: destination.name,
          region: destination.region,
          description: destination.description,
          highlights: destination.highlights.slice(0, 3),
          budgetRange: destination.budgetRange,
          nights: destination.nights,
          localScore: Math.round(score * 100) / 100,
        }));
      }

      try {
        const data = await edgeFunctionFetch<Record<string, unknown>>({
          functionName: 'honeymoon-planner',
          timeoutMs: 60000,
          body: {
            action: 'curate',
            ...profile,
            ...(candidates.length > 0 ? { candidates } : {}),
            ...(travelProfile?.worldCupRanking ? { worldCupRanking: travelProfile.worldCupRanking } : {}), // [CL-WORLDCUP-IMG-ALGO-20260405-140000]
          },
        });

        // 응답 구조 검증
        if (data.recommendations && Array.isArray(data.recommendations)) {
          setCurationResult(data as unknown as AICurationResult);
        } else if (data.raw_text) {
          setCurateError('AI 응답을 분석할 수 없어요. 대신 추천 결과를 보여드릴게요.');
        } else {
          setCurateError('추천 결과를 받지 못했어요.');
        }
      } catch (err) {
        console.error('[useHoneymoonPlanner] curateDestinations failed:', err);
        setCurateError(getUserFriendlyError(err));
      } finally {
        setCurateLoading(false);
      }
    },
    []
  );

  return { curationResult, curateLoading, curateError, curateDestinations };
}

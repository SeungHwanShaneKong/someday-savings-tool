// [AGENT-TEAM-9-20260307]
// P3 Honeymoon Planner — AI 기반 신혼여행 종합 기획 Hook

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EDGE_FUNCTION_URL, EDGE_FUNCTION_KEY } from '@/lib/edge-function-config';

// ── Response Types ──

export interface ItineraryDay {
  day: number;
  activities: string;
  estimated_cost: number;
  tips: string;
}

export interface BudgetBreakdown {
  flights: number;
  accommodation: number;
  meals: number;
  activities: number;
  buffer: number;
}

export interface Alternative {
  destination: string;
  reason: string;
  cost_diff: number;
}

export interface BookingTip {
  item: string;
  optimal_timing: string;
  savings_estimate: string;
}

export interface HoneymoonPlan {
  recommended_destination: string;
  itinerary: ItineraryDay[];
  budget_breakdown: BudgetBreakdown;
  alternatives: Alternative[];
  booking_tips: BookingTip[];
  raw_text?: string; // fallback when JSON parse fails on server
}

// ── Hook ──

interface UseHoneymoonPlannerResult {
  plan: HoneymoonPlan | null;
  loading: boolean;
  error: string | null;
  planTrip: (
    budget: number,
    durationDays: number,
    preferredRegions: string[],
    travelStyle: string,
    departureDate?: string
  ) => Promise<void>;
}

export function useHoneymoonPlanner(): UseHoneymoonPlannerResult {
  const [plan, setPlan] = useState<HoneymoonPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planTrip = useCallback(
    async (
      budget: number,
      durationDays: number,
      preferredRegions: string[],
      travelStyle: string,
      departureDate?: string
    ) => {
      setLoading(true);
      setError(null);
      setPlan(null);

      try {
        // Get auth token
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
          throw new Error('인증이 필요합니다. 로그인 후 이용해주세요.');
        }

        const response = await fetch(
          `${EDGE_FUNCTION_URL}/functions/v1/honeymoon-planner`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              apikey: EDGE_FUNCTION_KEY,
            },
            body: JSON.stringify({
              budget,
              duration_days: durationDays,
              preferred_regions: preferredRegions,
              travel_style: travelStyle,
              departure_date: departureDate,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `API 오류 (${response.status})`);
        }

        const data = await response.json();

        // Handle raw_text fallback (server couldn't parse GPT JSON)
        if (data.raw_text && !data.recommended_destination) {
          setPlan({
            recommended_destination: '',
            itinerary: [],
            budget_breakdown: { flights: 0, accommodation: 0, meals: 0, activities: 0, buffer: 0 },
            alternatives: [],
            booking_tips: [],
            raw_text: data.raw_text,
          });
        } else {
          setPlan(data as HoneymoonPlan);
        }
      } catch (err: any) {
        console.error('[useHoneymoonPlanner] planTrip failed:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { plan, loading, error, planTrip };
}

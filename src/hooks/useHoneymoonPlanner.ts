// [EF-RESILIENCE-20260308-041500]
// P3 Honeymoon Planner — AI 기반 신혼여행 종합 기획 Hook

import { useState, useCallback } from 'react';
import { edgeFunctionFetch, getUserFriendlyError } from '@/lib/edge-function-fetch';

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
        const data = await edgeFunctionFetch<Record<string, unknown>>({
          functionName: 'honeymoon-planner',
          timeoutMs: 60000, // GPT 호출이므로 60초
          body: {
            budget,
            duration_days: durationDays,
            preferred_regions: preferredRegions,
            travel_style: travelStyle,
            departure_date: departureDate,
          },
        });

        // Handle raw_text fallback (server couldn't parse GPT JSON)
        if (data.raw_text && !data.recommended_destination) {
          setPlan({
            recommended_destination: '',
            itinerary: [],
            budget_breakdown: { flights: 0, accommodation: 0, meals: 0, activities: 0, buffer: 0 },
            alternatives: [],
            booking_tips: [],
            raw_text: data.raw_text as string,
          });
        } else {
          setPlan(data as unknown as HoneymoonPlan);
        }
      } catch (err) {
        console.error('[useHoneymoonPlanner] planTrip failed:', err);
        setError(getUserFriendlyError(err));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { plan, loading, error, planTrip };
}

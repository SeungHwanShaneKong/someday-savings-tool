// [EF-RESILIENCE-20260308-041500] 협상 코치 Hook
// negotiate-coach Edge Function을 호출하여 카테고리별 협상 팁 반환

import { useState, useCallback } from 'react';
import { edgeFunctionFetch, getUserFriendlyError } from '@/lib/edge-function-fetch';

// ── 협상 팁 인터페이스 ──
export interface NegotiationTip {
  title: string;
  description: string;
  example: string;
  savings_estimate: string;
}

// ── 협상 결과 인터페이스 ──
export interface NegotiationResult {
  tips: NegotiationTip[];
  confidence: number;
}

interface UseNegotiateCoachResult {
  result: NegotiationResult | null;
  loading: boolean;
  error: string | null;
  askCoach: (category: string, amount: number, region?: string) => Promise<void>;
}

export function useNegotiateCoach(): UseNegotiateCoachResult {
  const [result, setResult] = useState<NegotiationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const askCoach = useCallback(async (category: string, amount: number, region?: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await edgeFunctionFetch<NegotiationResult>({
        functionName: 'negotiate-coach',
        body: { category, amount, region },
      });
      setResult(data);
    } catch (err) {
      console.warn('[useNegotiateCoach] Fetch failed:', err);
      setError(getUserFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, askCoach };
}

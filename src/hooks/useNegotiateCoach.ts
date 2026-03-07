// [AGENT-TEAM-9-20260307] 협상 코치 Hook
// negotiate-coach Edge Function을 호출하여 카테고리별 협상 팁 반환

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EDGE_FUNCTION_URL, EDGE_FUNCTION_KEY } from '@/lib/edge-function-config';

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
      // Get auth token from main Supabase project
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('인증 토큰이 없습니다. 로그인이 필요합니다.');
      }

      const response = await fetch(
        `${EDGE_FUNCTION_URL}/functions/v1/negotiate-coach`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            apikey: EDGE_FUNCTION_KEY,
          },
          body: JSON.stringify({ category, amount, region }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API 오류 (${response.status})`);
      }

      const data: NegotiationResult = await response.json();
      setResult(data);
    } catch (err: any) {
      console.warn('[useNegotiateCoach] Fetch failed:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, askCoach };
}

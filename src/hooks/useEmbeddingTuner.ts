// [AGENT-TEAM-9-20260307]
// 임베딩 자동 조정 (Embedding Tuner) Hook
// Edge Function(embedding-tuner)을 호출하여 커버리지 분석 결과 반환

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EDGE_FUNCTION_URL, EDGE_FUNCTION_KEY } from '@/lib/edge-function-config';

// ── 인터페이스 ──
export interface CoverageEntry {
  category: string;
  count: number;
  ideal_min: number;
  gap: number;
  avg_freshness: number;
}

export interface TunerRecommendation {
  action: 're-embed' | 'add' | 'prune';
  category: string;
  reason: string;
}

export interface EmbeddingTunerResult {
  coverage: CoverageEntry[];
  recommendations: TunerRecommendation[];
  overall_coverage_pct: number;
  recent_7d_count: number;
}

interface UseEmbeddingTunerReturn {
  result: EmbeddingTunerResult | null;
  loading: boolean;
  error: string | null;
  analyze: () => Promise<void>;
}

export function useEmbeddingTuner(): UseEmbeddingTunerReturn {
  const [result, setResult] = useState<EmbeddingTunerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get auth token from main Supabase project
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('인증 토큰이 없습니다');
      }

      const response = await fetch(
        `${EDGE_FUNCTION_URL}/functions/v1/embedding-tuner`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            apikey: EDGE_FUNCTION_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API 오류 (${response.status})`);
      }

      const data: EmbeddingTunerResult = await response.json();
      setResult(data);
    } catch (err: any) {
      console.warn('[useEmbeddingTuner] Fetch failed:', err.message);
      setError(err.message);
      // Keep previous result on error to avoid UI flicker
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, analyze };
}

// [EF-RESILIENCE-20260308-041500]
// 임베딩 자동 조정 (Embedding Tuner) Hook
// Edge Function(embedding-tuner)을 호출하여 커버리지 분석 결과 반환

import { useState, useCallback } from 'react';
import { edgeFunctionFetch, getUserFriendlyError } from '@/lib/edge-function-fetch';

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
      const data = await edgeFunctionFetch<EmbeddingTunerResult>({
        functionName: 'embedding-tuner',
      });
      setResult(data);
    } catch (err) {
      console.warn('[useEmbeddingTuner] Fetch failed:', err);
      setError(getUserFriendlyError(err));
      // Keep previous result on error to avoid UI flicker
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, analyze };
}

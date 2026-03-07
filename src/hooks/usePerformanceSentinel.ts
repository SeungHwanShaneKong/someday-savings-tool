// [AGENT-TEAM-9-20260307] Edge Function 성능 모니터링 Hook
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EDGE_FUNCTION_URL, EDGE_FUNCTION_KEY } from '@/lib/edge-function-config';

export interface FunctionMetrics {
  name: string;
  total_calls: number;
  avg_duration_ms: number;
  error_rate: number;
  p95_duration_ms: number;
  calls_24h: number;
}

export interface OverallMetrics {
  total_calls: number;
  avg_duration_ms: number;
  error_rate: number;
}

export interface PerformanceResult {
  functions: FunctionMetrics[];
  overall: OverallMetrics;
  warning?: string;
}

interface UsePerformanceSentinelResult {
  metrics: PerformanceResult | null;
  loading: boolean;
  error: string | null;
  fetchMetrics: () => Promise<void>;
}

export function usePerformanceSentinel(): UsePerformanceSentinelResult {
  const [metrics, setMetrics] = useState<PerformanceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('인증 토큰이 없습니다');
      }

      const response = await fetch(
        `${EDGE_FUNCTION_URL}/functions/v1/performance-sentinel`,
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

      const data: PerformanceResult = await response.json();
      setMetrics(data);
    } catch (err: any) {
      console.warn('[usePerformanceSentinel] Fetch failed:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { metrics, loading, error, fetchMetrics };
}

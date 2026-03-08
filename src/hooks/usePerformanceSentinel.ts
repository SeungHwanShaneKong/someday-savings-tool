// [EF-RESILIENCE-20260308-041500] Edge Function 성능 모니터링 Hook
import { useState, useCallback } from 'react';
import { edgeFunctionFetch, getUserFriendlyError } from '@/lib/edge-function-fetch';

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
      const data = await edgeFunctionFetch<PerformanceResult>({
        functionName: 'performance-sentinel',
      });
      setMetrics(data);
    } catch (err) {
      console.warn('[usePerformanceSentinel] Fetch failed:', err);
      setError(getUserFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  return { metrics, loading, error, fetchMetrics };
}

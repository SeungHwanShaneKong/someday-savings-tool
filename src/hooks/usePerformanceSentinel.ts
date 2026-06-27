// [EF-RESILIENCE-20260308-041500] Edge Function 성능 모니터링 Hook
// [CL-ADMIN-RQ-MIGRATION-20260627-234656] 수동 state → React Query 준실시간 폴링(ADMIN_PANEL).
import { useQuery } from '@tanstack/react-query';
import { edgeFunctionFetch, getUserFriendlyError } from '@/lib/edge-function-fetch';
import { ADMIN_PANEL } from '@/hooks/admin/adminQueryConfig';

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

export function usePerformanceSentinel(enabled = true): UsePerformanceSentinelResult {
  const q = useQuery({
    queryKey: ['admin', 'perf'],
    queryFn: () => edgeFunctionFetch<PerformanceResult>({ functionName: 'performance-sentinel' }),
    enabled,
    ...ADMIN_PANEL,
  });
  return {
    metrics: q.data ?? null,
    loading: q.isLoading,
    error: q.error ? getUserFriendlyError(q.error) : null,
    fetchMetrics: async () => { await q.refetch(); },
  };
}

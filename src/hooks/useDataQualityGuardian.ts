// [EF-RESILIENCE-20260308-041500]
// E1 데이터 품질 감시 (Data Quality Guardian) Hook
// Admin 페이지에서 Edge Function(data-quality-guardian)을 호출하여 품질 스캔 결과 반환

import { useState, useCallback } from 'react';
import { edgeFunctionFetch, getUserFriendlyError } from '@/lib/edge-function-fetch';

// ── 품질 이슈 인터페이스 ──
export interface DataQualityIssue {
  type: 'duplicate' | 'stale' | 'uncategorized' | 'outdated';
  count: number;
  details: string[];
}

// ── 스캔 결과 인터페이스 ──
export interface DataQualityResult {
  scan_at: string;
  total_scanned: number;
  issues: DataQualityIssue[];
  health_score: number;
}

interface UseDataQualityGuardianReturn {
  result: DataQualityResult | null;
  loading: boolean;
  error: string | null;
  runScan: () => Promise<void>;
}

export function useDataQualityGuardian(): UseDataQualityGuardianReturn {
  const [result, setResult] = useState<DataQualityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runScan = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await edgeFunctionFetch<DataQualityResult>({
        functionName: 'data-quality-guardian',
      });
      setResult(data);
    } catch (err) {
      console.warn('[useDataQualityGuardian] Scan failed:', err);
      setError(getUserFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, runScan };
}

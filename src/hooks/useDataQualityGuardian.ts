// [AGENT-TEAM-9-20260307]
// E1 데이터 품질 감시 (Data Quality Guardian) Hook
// Admin 페이지에서 Edge Function(data-quality-guardian)을 호출하여 품질 스캔 결과 반환

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EDGE_FUNCTION_URL, EDGE_FUNCTION_KEY } from '@/lib/edge-function-config';

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
      // Get auth token from main Supabase project
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('인증 토큰이 없습니다');
      }

      const response = await fetch(
        `${EDGE_FUNCTION_URL}/functions/v1/data-quality-guardian`,
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

      const data: DataQualityResult = await response.json();
      setResult(data);
    } catch (err: any) {
      console.warn('[useDataQualityGuardian] Scan failed:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, runScan };
}

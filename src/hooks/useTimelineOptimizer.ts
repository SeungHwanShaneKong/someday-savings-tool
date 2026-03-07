// [AGENT-TEAM-9-20260307]
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EDGE_FUNCTION_URL, EDGE_FUNCTION_KEY } from '@/lib/edge-function-config';

export interface TimelineTask {
  task: string;
  priority: 'high' | 'medium' | 'low';
  tip: string;
  deadline: string;
}

export interface TimelineMonth {
  month: string;
  tasks: TimelineTask[];
}

export interface TimelineResult {
  timeline: TimelineMonth[];
  dday_count: number;
}

export function useTimelineOptimizer() {
  const [result, setResult] = useState<TimelineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optimize = useCallback(
    async (weddingDate: string, completedItems: string[], budgetTotal?: number): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
          throw new Error('인증이 필요합니다. 로그인 후 다시 시도해주세요.');
        }

        const response = await fetch(
          `${EDGE_FUNCTION_URL}/functions/v1/timeline-optimizer`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              apikey: EDGE_FUNCTION_KEY,
            },
            body: JSON.stringify({
              wedding_date: weddingDate,
              completed_items: completedItems,
              budget_total: budgetTotal,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `일정 최적화 실패 (${response.status})`);
        }

        const data: TimelineResult = await response.json();
        setResult(data);
      } catch (err: any) {
        console.error('Timeline optimizer error:', err);
        setError(err.message || '일정 최적화 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { result, loading, error, optimize };
}

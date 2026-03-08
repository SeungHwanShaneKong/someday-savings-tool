// [EF-RESILIENCE-20260308-041500] 일정 최적화 Hook
// [CL-TIMELINE-FIX-20260308-203000] 타임아웃 60s + 재시도 지원
import { useState, useCallback, useRef } from 'react';
import { edgeFunctionFetch, getUserFriendlyError } from '@/lib/edge-function-fetch';

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

  // [CL-TIMELINE-FIX-20260308-203000] 마지막 요청 파라미터 저장 — 재시도용
  const lastParamsRef = useRef<{
    weddingDate: string;
    completedItems: string[];
    budgetTotal?: number;
  } | null>(null);

  const optimize = useCallback(
    async (weddingDate: string, completedItems: string[], budgetTotal?: number): Promise<void> => {
      setLoading(true);
      setError(null);
      lastParamsRef.current = { weddingDate, completedItems, budgetTotal };

      try {
        const data = await edgeFunctionFetch<TimelineResult>({
          functionName: 'timeline-optimizer',
          body: {
            wedding_date: weddingDate,
            completed_items: completedItems,
            budget_total: budgetTotal,
          },
          // [CL-TIMELINE-FIX-20260308-203000] GPT 다달 계획 생성 시 콜드스타트 포함 60초
          timeoutMs: 60000,
        });
        setResult(data);
      } catch (err) {
        console.error('Timeline optimizer error:', err);
        setError(getUserFriendlyError(err));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // [CL-TIMELINE-FIX-20260308-203000] 재시도 — 마지막 파라미터로 다시 호출
  const retry = useCallback(() => {
    if (lastParamsRef.current) {
      const { weddingDate, completedItems, budgetTotal } = lastParamsRef.current;
      optimize(weddingDate, completedItems, budgetTotal);
    }
  }, [optimize]);

  return { result, loading, error, optimize, retry };
}

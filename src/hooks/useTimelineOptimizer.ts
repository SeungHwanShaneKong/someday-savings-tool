// [EF-RESILIENCE-20260308-041500] 일정 최적화 Hook
import { useState, useCallback } from 'react';
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

  const optimize = useCallback(
    async (weddingDate: string, completedItems: string[], budgetTotal?: number): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const data = await edgeFunctionFetch<TimelineResult>({
          functionName: 'timeline-optimizer',
          body: {
            wedding_date: weddingDate,
            completed_items: completedItems,
            budget_total: budgetTotal,
          },
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

  return { result, loading, error, optimize };
}

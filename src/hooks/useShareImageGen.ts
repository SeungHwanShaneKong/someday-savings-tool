// [EF-RESILIENCE-20260308-041500] 공유 이미지 생성 Hook
// share-image-gen Edge Function을 호출하여 공유 카드 HTML 및 OG 메타 반환

import { useState, useCallback } from 'react';
import { edgeFunctionFetch, getUserFriendlyError } from '@/lib/edge-function-fetch';

// ── 공유 카테고리 인터페이스 ──
export interface ShareCategory {
  name: string;
  amount: number;
}

// ── 공유 카드 결과 인터페이스 ──
export interface ShareCardResult {
  card_html: string;
  og_title: string;
  og_description: string;
  summary: {
    total: number;
    categories_count: number;
    savings_pct: number;
  };
}

interface UseShareImageGenResult {
  result: ShareCardResult | null;
  loading: boolean;
  error: string | null;
  generate: (
    totalBudget: number,
    categories: ShareCategory[],
    savingsPct?: number,
    weddingDate?: string,
  ) => Promise<void>;
}

export function useShareImageGen(): UseShareImageGenResult {
  const [result, setResult] = useState<ShareCardResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (
      totalBudget: number,
      categories: ShareCategory[],
      savingsPct?: number,
      weddingDate?: string,
    ) => {
      setLoading(true);
      setError(null);

      try {
        const data = await edgeFunctionFetch<ShareCardResult>({
          functionName: 'share-image-gen',
          body: {
            total_budget: totalBudget,
            categories,
            savings_pct: savingsPct,
            wedding_date: weddingDate,
          },
        });
        setResult(data);
      } catch (err) {
        console.warn('[useShareImageGen] Fetch failed:', err);
        setError(getUserFriendlyError(err));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { result, loading, error, generate };
}

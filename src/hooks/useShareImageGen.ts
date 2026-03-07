// [AGENT-TEAM-9-20260307] 공유 이미지 생성 Hook
// share-image-gen Edge Function을 호출하여 공유 카드 HTML 및 OG 메타 반환

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EDGE_FUNCTION_URL, EDGE_FUNCTION_KEY } from '@/lib/edge-function-config';

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
        // Get auth token from main Supabase project
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
          throw new Error('인증 토큰이 없습니다. 로그인이 필요합니다.');
        }

        const response = await fetch(
          `${EDGE_FUNCTION_URL}/functions/v1/share-image-gen`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              apikey: EDGE_FUNCTION_KEY,
            },
            body: JSON.stringify({
              total_budget: totalBudget,
              categories,
              savings_pct: savingsPct,
              wedding_date: weddingDate,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `API 오류 (${response.status})`);
        }

        const data: ShareCardResult = await response.json();
        setResult(data);
      } catch (err: any) {
        console.warn('[useShareImageGen] Fetch failed:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { result, loading, error, generate };
}

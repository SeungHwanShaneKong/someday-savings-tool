// [AGENT-TEAM-9-20260307]
// M2 SEO Amplifier — SEO 콘텐츠 생성 Hook
// Admin 페이지에서 Edge Function(seo-amplifier)을 호출하여 SEO 콘텐츠 생성

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EDGE_FUNCTION_URL, EDGE_FUNCTION_KEY } from '@/lib/edge-function-config';

// ── SEO 콘텐츠 인터페이스 ──
export interface SEOContent {
  title: string;
  meta_description: string;
  body_html: string;
  keywords: string[];
  estimated_read_time: string;
}

interface UseSEOAmplifierResult {
  content: SEOContent | null;
  loading: boolean;
  error: string | null;
  generate: (keyword: string, tone?: string, maxWords?: number) => Promise<void>;
}

export function useSEOAmplifier(): UseSEOAmplifierResult {
  const [content, setContent] = useState<SEOContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (keyword: string, tone?: string, maxWords?: number) => {
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
        `${EDGE_FUNCTION_URL}/functions/v1/seo-amplifier`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            apikey: EDGE_FUNCTION_KEY,
          },
          body: JSON.stringify({
            keyword,
            tone: tone || 'friendly',
            max_words: maxWords || 800,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API 오류 (${response.status})`);
      }

      const data: SEOContent = await response.json();
      setContent(data);
    } catch (err: any) {
      console.warn('[useSEOAmplifier] Generate failed:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { content, loading, error, generate };
}

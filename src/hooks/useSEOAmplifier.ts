// [EF-RESILIENCE-20260308-041500]
// M2 SEO Amplifier — SEO 콘텐츠 생성 Hook
// Admin 페이지에서 Edge Function(seo-amplifier)을 호출하여 SEO 콘텐츠 생성

import { useState, useCallback } from 'react';
import { edgeFunctionFetch, getUserFriendlyError } from '@/lib/edge-function-fetch';

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
      const data = await edgeFunctionFetch<SEOContent>({
        functionName: 'seo-amplifier',
        body: {
          keyword,
          tone: tone || 'friendly',
          max_words: maxWords || 800,
        },
      });
      setContent(data);
    } catch (err) {
      console.warn('[useSEOAmplifier] Generate failed:', err);
      setError(getUserFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  return { content, loading, error, generate };
}

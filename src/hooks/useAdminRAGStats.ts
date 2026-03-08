// [EF-RESILIENCE-20260308-041500] RAG 파이프라인 모니터링 통계 Hook
// Admin 페이지에서 Edge Function(admin-rag-stats)을 호출하여 MECE 통계 반환

import { useState, useCallback } from 'react';
import { edgeFunctionFetch, getUserFriendlyError } from '@/lib/edge-function-fetch';

// ── 크롤링 파이프라인 ──
export interface CrawlJob {
  id: string;
  source_name: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  documents_found: number;
}

export interface CrawlingStats {
  total_sources: number;
  active_sources: number;
  total_jobs: number;
  success_jobs: number;
  failed_jobs: number;
  last_crawl_at: string | null;
  recent_jobs: CrawlJob[];
}

// ── 벡터 데이터베이스 ──
export interface CategoryCount {
  category: string;
  count: number;
}

export interface VectorDBStats {
  total_embeddings: number;
  total_categories: number;
  avg_freshness_score: number;
  categories: CategoryCount[];
  oldest_embedding: string | null;
  newest_embedding: string | null;
}

// ── AI 대화 현황 ──
export interface FeatureCount {
  feature: string;
  count: number;
}

export interface ConversationStats {
  total_conversations: number;
  total_by_feature: FeatureCount[];
  recent_24h: number;
  recent_7d: number;
}

// ── 시스템 건강 ──
export interface SystemHealth {
  embedding_freshness: 'good' | 'warning' | 'critical';
  crawl_success_rate: number;
  avg_crawl_duration_sec: number;
  storage_estimate_mb: number;
}

// ── 통합 ──
export interface RAGStats {
  crawling: CrawlingStats;
  vector_db: VectorDBStats;
  conversations: ConversationStats;
  system_health: SystemHealth;
}

interface UseAdminRAGStatsResult {
  ragStats: RAGStats | null;
  loading: boolean;
  error: string | null;
  fetchRAGStats: () => Promise<void>;
}

const DEFAULT_STATS: RAGStats | null = null;

export function useAdminRAGStats(): UseAdminRAGStatsResult {
  const [ragStats, setRagStats] = useState<RAGStats | null>(DEFAULT_STATS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRAGStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await edgeFunctionFetch<RAGStats>({
        functionName: 'admin-rag-stats',
      });
      setRagStats(data);
    } catch (err) {
      console.warn('[useAdminRAGStats] Fetch failed:', err);
      setError(getUserFriendlyError(err));
      // Keep previous stats on error to avoid UI flicker
    } finally {
      setLoading(false);
    }
  }, []);

  return { ragStats, loading, error, fetchRAGStats };
}

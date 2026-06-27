// [EF-RESILIENCE-20260308-041500] RAG 파이프라인 모니터링 통계 Hook
// Admin 페이지에서 Edge Function(admin-rag-stats)을 호출하여 MECE 통계 반환
// [CL-ADMIN-RQ-MIGRATION-20260627-234656] 수동 state → React Query 준실시간 폴링(ADMIN_PANEL).

import { useQuery } from '@tanstack/react-query';
import { edgeFunctionFetch, getUserFriendlyError } from '@/lib/edge-function-fetch';
import { ADMIN_PANEL } from '@/hooks/admin/adminQueryConfig';

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

export function useAdminRAGStats(enabled = true): UseAdminRAGStatsResult {
  const q = useQuery({
    queryKey: ['admin', 'rag'],
    queryFn: () => edgeFunctionFetch<RAGStats>({ functionName: 'admin-rag-stats' }),
    enabled,
    ...ADMIN_PANEL,
  });
  // RQ 가 직전 data 를 유지(실패 background refetch 시 flicker 방지) — 기존 'keep previous stats' 의도 보존.
  return {
    ragStats: q.data ?? null,
    loading: q.isLoading,
    error: q.error ? getUserFriendlyError(q.error) : null,
    fetchRAGStats: async () => { await q.refetch(); },
  };
}

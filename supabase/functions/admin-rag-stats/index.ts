// [ADMIN-RAG-MONITOR-2026-03-07] RAG 파이프라인 모니터링 통계 Edge Function
// Admin 인증 후 4개 MECE 카테고리 (크롤링, 벡터DB, 대화, 시스템건강) 통계 반환
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { verifyUserToken } from '../_shared/jwt.ts';
import { checkAdminOnMainProject } from '../_shared/admin-check.ts';

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // ── Auth: admin only ──
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: '인증이 필요합니다' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.replace('Bearer ', '');

  // Cross-project auth: try getUser first, fall back to JWT decode
  let userId: string | null = null;
  const { data: { user } } = await supabase.auth.getUser(token);
  if (user) {
    userId = user.id;
  } else {
    const payload = decodeJwtPayload(token);
    if (payload?.sub) userId = payload.sub;
  }

  if (!userId) {
    return new Response(
      JSON.stringify({ error: '유효하지 않은 토큰' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // [EF-ADMIN-FIX-20260308-110000] Check admin role on main project (cross-project fix)
  const isAdmin = await checkAdminOnMainProject(userId, token);

  if (!isAdmin) {
    return new Response(
      JSON.stringify({ error: '관리자 권한이 필요합니다' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // ══════════════════════════════════════════════════
    // 1. 크롤링 파이프라인 (Crawling Pipeline)
    // ══════════════════════════════════════════════════

    // 1-a. 소스 통계
    const { count: totalSources } = await supabase
      .from('crawl_sources')
      .select('*', { count: 'exact', head: true });

    const { count: activeSources } = await supabase
      .from('crawl_sources')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // 1-b. 작업 통계
    const { count: totalJobs } = await supabase
      .from('crawl_jobs')
      .select('*', { count: 'exact', head: true });

    const { count: successJobs } = await supabase
      .from('crawl_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    const { count: failedJobs } = await supabase
      .from('crawl_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed');

    // 1-c. 마지막 크롤 시각
    const { data: lastCrawlRow } = await supabase
      .from('crawl_jobs')
      .select('completed_at')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 1-d. 최근 크롤 작업 10건
    const { data: recentJobsRaw } = await supabase
      .from('crawl_jobs')
      .select('id, source, status, started_at, completed_at, documents_found')
      .order('started_at', { ascending: false })
      .limit(10);

    const recentJobs = (recentJobsRaw || []).map((j: any) => ({
      id: j.id,
      source_name: j.source || 'unknown',
      status: j.status,
      started_at: j.started_at,
      completed_at: j.completed_at,
      documents_found: j.documents_found ?? 0,
    }));

    // ══════════════════════════════════════════════════
    // 2. 벡터 데이터베이스 (Vector Database)
    // ══════════════════════════════════════════════════

    // 2-a. 총 임베딩 수
    const { count: totalEmbeddings } = await supabase
      .from('knowledge_embeddings')
      .select('*', { count: 'exact', head: true });

    // 2-b. 카테고리별 분포 (RPC 대신 전체 가져오기 - 소규모 데이터)
    const { data: embeddingsRaw } = await supabase
      .from('knowledge_embeddings')
      .select('category, freshness_score, created_at');

    const categoryMap = new Map<string, number>();
    let freshnessSum = 0;
    let freshnessCount = 0;
    let oldestEmbedding: string | null = null;
    let newestEmbedding: string | null = null;

    for (const row of embeddingsRaw || []) {
      // Category count
      const cat = row.category || 'uncategorized';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);

      // Freshness average
      if (row.freshness_score != null) {
        freshnessSum += row.freshness_score;
        freshnessCount++;
      }

      // Oldest/newest
      if (row.created_at) {
        if (!oldestEmbedding || row.created_at < oldestEmbedding) {
          oldestEmbedding = row.created_at;
        }
        if (!newestEmbedding || row.created_at > newestEmbedding) {
          newestEmbedding = row.created_at;
        }
      }
    }

    const categories = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // ══════════════════════════════════════════════════
    // 3. AI 대화 현황 (Conversations)
    // ══════════════════════════════════════════════════

    const { count: totalConversations } = await supabase
      .from('ai_conversations')
      .select('*', { count: 'exact', head: true });

    // 기능별 분포
    const { data: conversationsRaw } = await supabase
      .from('ai_conversations')
      .select('feature, created_at');

    const featureMap = new Map<string, number>();
    let recent24h = 0;
    let recent7d = 0;
    const now = Date.now();
    const ms24h = 24 * 60 * 60 * 1000;
    const ms7d = 7 * 24 * 60 * 60 * 1000;

    for (const row of conversationsRaw || []) {
      const feat = row.feature || 'unknown';
      featureMap.set(feat, (featureMap.get(feat) || 0) + 1);

      if (row.created_at) {
        const diff = now - new Date(row.created_at).getTime();
        if (diff <= ms24h) recent24h++;
        if (diff <= ms7d) recent7d++;
      }
    }

    const totalByFeature = Array.from(featureMap.entries())
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count);

    // ══════════════════════════════════════════════════
    // 4. 시스템 건강 (System Health)
    // ══════════════════════════════════════════════════

    // 4-a. 임베딩 신선도
    let embeddingFreshness: 'good' | 'warning' | 'critical' = 'critical';
    if (newestEmbedding) {
      const hoursAgo = (now - new Date(newestEmbedding).getTime()) / (1000 * 60 * 60);
      if (hoursAgo <= 24) embeddingFreshness = 'good';
      else if (hoursAgo <= 72) embeddingFreshness = 'warning';
      else embeddingFreshness = 'critical';
    }

    // 4-b. 크롤 성공률
    const crawlSuccessRate = (totalJobs ?? 0) > 0
      ? Math.round(((successJobs ?? 0) / (totalJobs ?? 1)) * 100)
      : 0;

    // 4-c. 평균 크롤 소요시간
    const { data: completedJobsForDuration } = await supabase
      .from('crawl_jobs')
      .select('started_at, completed_at')
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(20);

    let avgCrawlDurationSec = 0;
    if (completedJobsForDuration && completedJobsForDuration.length > 0) {
      const durations = completedJobsForDuration.map((j: any) => {
        const start = new Date(j.started_at).getTime();
        const end = new Date(j.completed_at).getTime();
        return (end - start) / 1000;
      });
      avgCrawlDurationSec = Math.round(
        durations.reduce((s: number, d: number) => s + d, 0) / durations.length
      );
    }

    // 4-d. 스토리지 추정 (1536 dim * 4 bytes * count)
    const storageEstimateMb = totalEmbeddings
      ? Number(((totalEmbeddings * 1536 * 4) / (1024 * 1024)).toFixed(2))
      : 0;

    // ── 최종 응답 ──
    const result = {
      crawling: {
        total_sources: totalSources ?? 0,
        active_sources: activeSources ?? 0,
        total_jobs: totalJobs ?? 0,
        success_jobs: successJobs ?? 0,
        failed_jobs: failedJobs ?? 0,
        last_crawl_at: lastCrawlRow?.completed_at || null,
        recent_jobs: recentJobs,
      },
      vector_db: {
        total_embeddings: totalEmbeddings ?? 0,
        total_categories: categories.length,
        avg_freshness_score: freshnessCount > 0
          ? Number((freshnessSum / freshnessCount).toFixed(3))
          : 0,
        categories,
        oldest_embedding: oldestEmbedding,
        newest_embedding: newestEmbedding,
      },
      conversations: {
        total_conversations: totalConversations ?? 0,
        total_by_feature: totalByFeature,
        recent_24h: recent24h,
        recent_7d: recent7d,
      },
      system_health: {
        embedding_freshness: embeddingFreshness,
        crawl_success_rate: crawlSuccessRate,
        avg_crawl_duration_sec: avgCrawlDurationSec,
        storage_estimate_mb: storageEstimateMb,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[admin-rag-stats] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || '통계 조회 실패' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// [AGENT-TEAM-9-20260307]
// 임베딩 자동 조정 (Embedding Tuner) — Admin-only Edge Function
// 카테고리별 커버리지 분석 + 추천 액션 생성 (GPT 호출 없음, 순수 SQL 분석)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { verifyUserToken } from '../_shared/jwt.ts';
import { logFunctionCall } from '../_shared/log-call.ts';
import { checkAdminOnMainProject } from '../_shared/admin-check.ts';

// ── 카테고리별 최소 임베딩 기준 ──
const IDEAL_MIN_PER_CATEGORY = 10;

serve(async (req) => {
  const startTime = Date.now();
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // ── Auth: admin only ──
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    await logFunctionCall(supabase, 'embedding-tuner', startTime, 401, null, '인증 헤더 없음');
    return new Response(
      JSON.stringify({ error: '인증이 필요합니다' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.replace('Bearer ', '');

  // [SEC-FIX-20260315] Secure JWT verification
  const userId = await verifyUserToken(supabase, token);

  if (!userId) {
    await logFunctionCall(supabase, 'embedding-tuner', startTime, 401, null, '유효하지 않은 토큰');
    return new Response(
      JSON.stringify({ error: '유효하지 않은 토큰' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // [EF-ADMIN-FIX-20260308-110000] Check admin role on main project (cross-project fix)
  const isAdmin = await checkAdminOnMainProject(userId, token);

  if (!isAdmin) {
    await logFunctionCall(supabase, 'embedding-tuner', startTime, 403, userId, '관리자 아님');
    return new Response(
      JSON.stringify({ error: '관리자 권한이 필요합니다' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // ══════════════════════════════════════════════════
    // 1. 전체 임베딩 데이터 조회
    // ══════════════════════════════════════════════════
    const { data: embeddingsRaw, error: fetchError } = await supabase
      .from('knowledge_embeddings')
      .select('category, freshness_score, created_at');

    // [EF-ADMIN-FIX-20260308-130000] Handle schema errors gracefully
    // Catches: 42P01 (table missing), PostgREST schema cache, column/relation not found
    if (fetchError) {
      const errMsg = fetchError.message || '';
      const isSchemaError = fetchError.code === '42P01'
        || errMsg.includes('schema cache')
        || errMsg.includes('does not exist');
      if (isSchemaError) {
        const emptyResult = {
          coverage: [],
          recommendations: [],
          overall_coverage_pct: 0,
          recent_7d_count: 0,
        };
        await logFunctionCall(supabase, 'embedding-tuner', startTime, 200, userId);
        return new Response(JSON.stringify(emptyResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw fetchError;
    }

    const rows = embeddingsRaw || [];

    // ══════════════════════════════════════════════════
    // 2. 카테고리별 집계: count, freshness 합계
    // ══════════════════════════════════════════════════
    const categoryAgg = new Map<string, { count: number; freshnessSum: number; freshnessCount: number }>();

    const now = Date.now();
    const ms7d = 7 * 24 * 60 * 60 * 1000;
    let recent7dCount = 0;

    for (const row of rows) {
      const cat = row.category || 'uncategorized';

      if (!categoryAgg.has(cat)) {
        categoryAgg.set(cat, { count: 0, freshnessSum: 0, freshnessCount: 0 });
      }
      const agg = categoryAgg.get(cat)!;
      agg.count++;

      if (row.freshness_score != null) {
        agg.freshnessSum += row.freshness_score;
        agg.freshnessCount++;
      }

      // 최근 7일 트렌드
      if (row.created_at) {
        const diff = now - new Date(row.created_at).getTime();
        if (diff <= ms7d) recent7dCount++;
      }
    }

    // ══════════════════════════════════════════════════
    // 3. 커버리지 계산 + 추천 생성
    // ══════════════════════════════════════════════════
    interface CoverageEntry {
      category: string;
      count: number;
      ideal_min: number;
      gap: number;
      avg_freshness: number;
    }

    interface TunerRecommendation {
      action: 're-embed' | 'add' | 'prune';
      category: string;
      reason: string;
    }

    const coverage: CoverageEntry[] = [];
    const recommendations: TunerRecommendation[] = [];
    let categoriesWithNoGap = 0;

    for (const [category, agg] of categoryAgg) {
      const idealMin = IDEAL_MIN_PER_CATEGORY;
      const gap = Math.max(0, idealMin - agg.count);
      const avgFreshness = agg.freshnessCount > 0
        ? Number((agg.freshnessSum / agg.freshnessCount).toFixed(2))
        : 0;

      coverage.push({
        category,
        count: agg.count,
        ideal_min: idealMin,
        gap,
        avg_freshness: avgFreshness,
      });

      if (gap === 0) categoriesWithNoGap++;

      // 추천 로직
      if (gap > 0) {
        recommendations.push({
          action: 'add',
          category,
          reason: `카테고리 커버리지 부족 (현재 ${agg.count}/${idealMin})`,
        });
      }

      if (avgFreshness > 0 && avgFreshness < 0.4) {
        recommendations.push({
          action: 're-embed',
          category,
          reason: `신선도 낮음 (${avgFreshness})`,
        });
      }

      if (agg.count > 50 && avgFreshness < 0.3) {
        recommendations.push({
          action: 'prune',
          category,
          reason: `오래된 데이터 정리 필요 (${agg.count}건, 신선도 ${avgFreshness})`,
        });
      }
    }

    // 커버리지를 count 내림차순으로 정렬
    coverage.sort((a, b) => b.count - a.count);

    const totalCategories = categoryAgg.size;
    const overallCoveragePct = totalCategories > 0
      ? Math.round((categoriesWithNoGap / totalCategories) * 100)
      : 0;

    // ── 최종 응답 ──
    const result = {
      coverage,
      recommendations,
      overall_coverage_pct: overallCoveragePct,
      recent_7d_count: recent7dCount,
    };

    await logFunctionCall(supabase, 'embedding-tuner', startTime, 200, userId);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[embedding-tuner] Error:', error);
    await logFunctionCall(supabase, 'embedding-tuner', startTime, 500, userId, error.message);
    return new Response(
      JSON.stringify({ error: error.message || '임베딩 분석 실패' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

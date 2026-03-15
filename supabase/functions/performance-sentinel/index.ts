// [AGENT-TEAM-9-20260307] Edge Function 성능 모니터링 (function_call_log 집계)
// Admin 인증 후 함수별 호출 통계 및 전체 요약 반환
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

  // [SEC-FIX-20260315] Secure JWT verification
  const userId = await verifyUserToken(supabase, token);

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
    // Fetch recent logs (limit 1000) for in-memory aggregation
    // ══════════════════════════════════════════════════
    const { data: logsRaw, error: logsError } = await supabase
      .from('function_call_log')
      .select('function_name, duration_ms, status_code, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    // [EF-ADMIN-FIX-20260308-130000] Handle schema errors gracefully
    // Catches: 42P01 (table missing), PostgREST schema cache, column/relation not found
    if (logsError) {
      const pgCode = (logsError as any)?.code;
      const errMsg = logsError.message || '';
      const isTableMissing = pgCode === '42P01'
        || errMsg.includes('schema cache')
        || errMsg.includes('does not exist');
      if (isTableMissing) {
        return new Response(
          JSON.stringify({
            functions: [],
            overall: { total_calls: 0, avg_duration_ms: 0, error_rate: 0 },
            warning: 'function_call_log 테이블이 아직 생성되지 않았습니다',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw logsError;
    }

    const logs = logsRaw || [];

    // ══════════════════════════════════════════════════
    // Per-function aggregation
    // ══════════════════════════════════════════════════
    const now = Date.now();
    const ms24h = 24 * 60 * 60 * 1000;

    const funcMap = new Map<string, {
      durations: number[];
      errorCount: number;
      calls24h: number;
    }>();

    let overallDurationSum = 0;
    let overallErrorCount = 0;

    for (const row of logs) {
      const name = row.function_name || 'unknown';
      if (!funcMap.has(name)) {
        funcMap.set(name, { durations: [], errorCount: 0, calls24h: 0 });
      }
      const entry = funcMap.get(name)!;

      const dur = row.duration_ms ?? 0;
      entry.durations.push(dur);
      overallDurationSum += dur;

      // Errors: status_code >= 400
      if (row.status_code && row.status_code >= 400) {
        entry.errorCount++;
        overallErrorCount++;
      }

      // 24h window
      if (row.created_at) {
        const diff = now - new Date(row.created_at).getTime();
        if (diff <= ms24h) entry.calls24h++;
      }
    }

    // Build per-function stats
    const functions = Array.from(funcMap.entries()).map(([name, entry]) => {
      const totalCalls = entry.durations.length;
      const avgDurationMs = totalCalls > 0
        ? Math.round(entry.durations.reduce((s, d) => s + d, 0) / totalCalls)
        : 0;
      const errorRate = totalCalls > 0
        ? Number(((entry.errorCount / totalCalls) * 100).toFixed(1))
        : 0;

      // p95: sort durations ascending, pick 95th percentile index
      const sorted = [...entry.durations].sort((a, b) => a - b);
      const p95Index = Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1);
      const p95DurationMs = sorted.length > 0 ? sorted[p95Index] : 0;

      return {
        name,
        total_calls: totalCalls,
        avg_duration_ms: avgDurationMs,
        error_rate: errorRate,
        p95_duration_ms: p95DurationMs,
        calls_24h: entry.calls24h,
      };
    }).sort((a, b) => b.total_calls - a.total_calls);

    // ══════════════════════════════════════════════════
    // Overall aggregates
    // ══════════════════════════════════════════════════
    const overallTotalCalls = logs.length;
    const overallAvgDurationMs = overallTotalCalls > 0
      ? Math.round(overallDurationSum / overallTotalCalls)
      : 0;
    const overallErrorRate = overallTotalCalls > 0
      ? Number(((overallErrorCount / overallTotalCalls) * 100).toFixed(1))
      : 0;

    // ── 최종 응답 ──
    const result = {
      functions,
      overall: {
        total_calls: overallTotalCalls,
        avg_duration_ms: overallAvgDurationMs,
        error_rate: overallErrorRate,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[performance-sentinel] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || '성능 통계 조회 실패' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

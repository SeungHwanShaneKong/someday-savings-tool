// [AGENT-TEAM-9-20260307] E1 데이터 품질 감시 Edge Function
// Admin-only. 순수 SQL 쿼리로 knowledge_embeddings 품질 이슈 스캔 (GPT 호출 없음)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { verifyUserToken } from '../_shared/jwt.ts';
import { logFunctionCall } from '../_shared/log-call.ts';
import { checkAdminOnMainProject } from '../_shared/admin-check.ts';

serve(async (req) => {
  const startTime = Date.now();
  let userId: string | null = null;

  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // ── Auth: admin only ──
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    await logFunctionCall(supabase, 'data-quality-guardian', startTime, 401);
    return new Response(
      JSON.stringify({ error: '인증이 필요합니다' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.replace('Bearer ', '');

  // [SEC-FIX-20260315] Secure JWT verification
  userId = await verifyUserToken(supabase, token);

  if (!userId) {
    await logFunctionCall(supabase, 'data-quality-guardian', startTime, 401, null, '유효하지 않은 토큰');
    return new Response(
      JSON.stringify({ error: '유효하지 않은 토큰' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // [EF-ADMIN-FIX-20260308-110000] Check admin role on main project (cross-project fix)
  const isAdmin = await checkAdminOnMainProject(userId, token);

  if (!isAdmin) {
    await logFunctionCall(supabase, 'data-quality-guardian', startTime, 403, userId, '관리자 권한 없음');
    return new Response(
      JSON.stringify({ error: '관리자 권한이 필요합니다' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { data: rows, error: fetchError } = await supabase
      .from('knowledge_embeddings')
      .select('id, content_hash, category, freshness_score, created_at, updated_at');

    // [EF-ADMIN-FIX-20260308-130000] Handle schema errors gracefully
    // Catches: 42P01 (table missing), PostgREST schema cache, column/relation not found
    if (fetchError) {
      const errMsg = fetchError.message || '';
      const isSchemaError = fetchError.code === '42P01'
        || errMsg.includes('schema cache')
        || errMsg.includes('does not exist');
      if (isSchemaError) {
        const emptyResult = {
          scan_at: new Date().toISOString(),
          total_scanned: 0,
          issues: [],
          health_score: 100,
          warning: `DB 스키마 불일치: ${errMsg}`,
        };
        await logFunctionCall(supabase, 'data-quality-guardian', startTime, 200, userId);
        return new Response(JSON.stringify(emptyResult), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw fetchError;
    }

    const allRows = rows || [];
    const totalScanned = allRows.length;

    if (totalScanned === 0) {
      const emptyResult = { scan_at: new Date().toISOString(), total_scanned: 0, issues: [], health_score: 100 };
      await logFunctionCall(supabase, 'data-quality-guardian', startTime, 200, userId);
      return new Response(JSON.stringify(emptyResult), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const now = Date.now();

    // 2-a. Duplicate: group by content_hash, find count > 1
    const hashMap = new Map<string, Array<{ id: string; content_hash: string }>>();
    for (const row of allRows) {
      if (!row.content_hash) continue;
      const existing = hashMap.get(row.content_hash);
      if (existing) { existing.push({ id: row.id, content_hash: row.content_hash }); }
      else { hashMap.set(row.content_hash, [{ id: row.id, content_hash: row.content_hash }]); }
    }
    const duplicateDetails: Array<{ id: string; content_hash?: string }> = [];
    for (const [hash, group] of hashMap) {
      if (group.length > 1) { for (const row of group) { duplicateDetails.push({ id: row.id, content_hash: hash }); } }
    }

    // 2-b. Stale: freshness_score < 0.3
    const staleDetails: Array<{ id: string; freshness_score?: number }> = [];
    for (const row of allRows) {
      if (row.freshness_score != null && row.freshness_score < 0.3) {
        staleDetails.push({ id: row.id, freshness_score: row.freshness_score });
      }
    }

    // 2-c. Uncategorized: category IS NULL or 'uncategorized'
    const uncategorizedDetails: Array<{ id: string; category?: string }> = [];
    for (const row of allRows) {
      if (!row.category || row.category === 'uncategorized') {
        uncategorizedDetails.push({ id: row.id, category: row.category || undefined });
      }
    }

    // 2-d. Outdated: updated_at or created_at > 30 days ago
    const outdatedDetails: Array<{ id: string; age_days?: number }> = [];
    for (const row of allRows) {
      const refDate = row.updated_at || row.created_at;
      if (refDate) {
        const ageDays = Math.floor((now - new Date(refDate).getTime()) / (24 * 60 * 60 * 1000));
        if (ageDays > 30) { outdatedDetails.push({ id: row.id, age_days: ageDays }); }
      }
    }

    // [AGENT-TEAM-9-VERIFY-20260308T120000] 3. health_score 먼저 계산 (원본 object 배열 기반)
    const issueIdSet = new Set<string>();
    for (const d of duplicateDetails) issueIdSet.add(d.id);
    for (const d of staleDetails) issueIdSet.add(d.id);
    for (const d of uncategorizedDetails) issueIdSet.add(d.id);
    for (const d of outdatedDetails) issueIdSet.add(d.id);
    const rawScore = 100 - (issueIdSet.size / totalScanned * 100);
    const healthScore = Math.round(Math.max(0, Math.min(100, rawScore)));

    // 4. Build issues array (string[] for frontend compatibility)
    interface QualityIssue {
      type: 'duplicate' | 'stale' | 'uncategorized' | 'outdated';
      count: number;
      details: string[];
    }
    const issues: QualityIssue[] = [];
    if (duplicateDetails.length > 0) {
      issues.push({ type: 'duplicate', count: duplicateDetails.length, details: duplicateDetails.map(d => d.content_hash ? `hash:${d.content_hash.slice(0,8)}` : d.id) });
    }
    if (staleDetails.length > 0) {
      issues.push({ type: 'stale', count: staleDetails.length, details: staleDetails.map(d => `score:${d.freshness_score?.toFixed(2)}`) });
    }
    if (uncategorizedDetails.length > 0) {
      issues.push({ type: 'uncategorized', count: uncategorizedDetails.length, details: uncategorizedDetails.map(d => d.id.slice(0,8)) });
    }
    if (outdatedDetails.length > 0) {
      issues.push({ type: 'outdated', count: outdatedDetails.length, details: outdatedDetails.map(d => `${d.age_days}일 경과`) });
    }

    const result = { scan_at: new Date().toISOString(), total_scanned: totalScanned, issues, health_score: healthScore };
    await logFunctionCall(supabase, 'data-quality-guardian', startTime, 200, userId);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[data-quality-guardian] Error:', error);
    await logFunctionCall(supabase, 'data-quality-guardian', startTime, 500, userId, error.message);
    return new Response(
      JSON.stringify({ error: error.message || '품질 스캔 실패' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

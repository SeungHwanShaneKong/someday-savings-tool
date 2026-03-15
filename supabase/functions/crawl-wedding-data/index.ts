// crawl-wedding-data: Main crawler for wedding cost data (BRD §5)
// Triggered by GitHub Actions cron (3x/day) or manual admin call
// [ZERO-COST-PIPELINE-2026-03-07] robots.txt 준수, PII 마스킹, raw 저장, URL 중복제거 추가
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import OpenAI from 'https://esm.sh/openai@4.77.0';
import { verifyUserToken } from '../_shared/jwt.ts';
import { checkAdminOnMainProject } from '../_shared/admin-check.ts';
import { safeFetch, extractTextFromHtml, chunkText, contentHash, checkRobotsTxt, urlHash } from '../_shared/anti-block.ts';
import { filterOutliers, filterByCategory } from '../_shared/outlier-filter.ts';
import { processContent, calculateFreshnessScore } from '../_shared/embedding-pipeline.ts';
import { maskPII } from '../_shared/pii-masker.ts';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')!,
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Auth check (admin only or cron)
  const authHeader = req.headers.get('Authorization');
  const isCron = req.headers.get('X-Cron-Secret') === Deno.env.get('CRON_SECRET');

  if (!isCron) {
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: '인증이 필요합니다' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // [EF-ADMIN-FIX-20260308-110000] Cross-project auth + admin check on main project
    const token = authHeader.replace('Bearer ', '');
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

    const isAdmin = await checkAdminOnMainProject(userId, token);

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: '관리자 권한이 필요합니다' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // Create crawl job record
  const { data: job, error: jobError } = await supabase
    .from('crawl_jobs')
    .insert({
      source: 'scheduled_crawl',
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (jobError || !job) {
    return new Response(
      JSON.stringify({ error: '크롤 작업 생성 실패' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const jobId = job.id;
  let totalProcessed = 0;
  let errors: string[] = [];

  try {
    // 1. Load active crawl sources
    const { data: sources } = await supabase
      .from('crawl_sources')
      .select('*')
      .eq('is_active', true);

    if (!sources || sources.length === 0) {
      await updateJob(supabase, jobId, 'completed', 0, 'No active sources');
      return new Response(
        JSON.stringify({ message: 'No active crawl sources', jobId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Process each source
    for (const source of sources) {
      try {
        // Skip manual sources (they are seed data uploaded manually)
        if (source.config?.type === 'seed' || source.config?.manual) {
          continue;
        }

        // Check if enough time has passed since last crawl
        if (source.last_crawled_at) {
          const lastCrawled = new Date(source.last_crawled_at);
          const hoursSince = (Date.now() - lastCrawled.getTime()) / (1000 * 60 * 60);
          if (hoursSince < source.crawl_interval_hours) {
            continue; // Too soon to re-crawl
          }
        }

        console.log(`Crawling source: ${source.name} (${source.url_pattern})`);

        // [ZERO-COST-PIPELINE-2026-03-07] robots.txt 준수 체크
        const robotsAllowed = await checkRobotsTxt(source.url_pattern);
        if (!robotsAllowed) {
          console.log(`Skipping ${source.name}: blocked by robots.txt`);
          errors.push(`${source.name}: blocked by robots.txt`);
          continue;
        }

        // [ZERO-COST-PIPELINE-2026-03-07] URL 기반 중복제거
        const sourceUrlHash = await urlHash(source.url_pattern);

        // 3. Fetch page with anti-block measures
        const delayConfig = source.config?.delay_ms
          ? { min: source.config.delay_ms, max: source.config.delay_ms * 2 }
          : { min: 2000, max: 5000 };

        const response = await safeFetch(source.url_pattern, {
          delayMs: delayConfig,
          timeout: 30000,
        });

        if (!response.ok) {
          errors.push(`${source.name}: HTTP ${response.status}`);
          continue;
        }

        const html = await response.text();

        // [ZERO-COST-PIPELINE-2026-03-07] raw HTML을 Supabase Storage에 보관
        try {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const storagePath = `${source.name.replace(/\s+/g, '_')}/${timestamp}.html`;
          await supabase.storage
            .from('raw-crawl-data')
            .upload(storagePath, html, {
              contentType: 'text/html',
              upsert: false,
            });
        } catch (storageErr: unknown) {
          // Storage 미설정 시 무시 (핵심 기능이 아님)
          console.warn('Raw storage save skipped:', storageErr);
        }

        const text = extractTextFromHtml(html);

        if (text.length < 100) {
          errors.push(`${source.name}: Content too short (${text.length} chars)`);
          continue;
        }

        // [ZERO-COST-PIPELINE-2026-03-07] PII 마스킹 적용
        const cleanText = maskPII(text);
        const crawledAt = new Date().toISOString();

        // 4. Process and embed content
        const records = await processContent(openai, [
          {
            content: cleanText,
            metadata: {
              source: source.name,
              url: source.url_pattern,
              crawled_at: crawledAt,
              url_hash: sourceUrlHash,
              category: 'wedding_cost',
            },
            source_type: 'platform_crawl',
            region: source.config?.region || undefined,
          },
        ]);

        // 5. Upsert to knowledge_embeddings
        if (records.length > 0) {
          const { error: upsertError } = await supabase
            .from('knowledge_embeddings')
            .upsert(records, { onConflict: 'content_hash' });

          if (upsertError) {
            errors.push(`${source.name}: DB upsert error - ${upsertError.message}`);
          } else {
            totalProcessed += records.length;
          }
        }

        // 6. Update last_crawled_at
        await supabase
          .from('crawl_sources')
          .update({ last_crawled_at: new Date().toISOString() })
          .eq('id', source.id);
      } catch (sourceError: unknown) {
        const msg = sourceError instanceof Error ? sourceError.message : String(sourceError);
        errors.push(`${source.name}: ${msg}`);
        console.error(`Error crawling ${source.name}:`, sourceError);
      }
    }

    // 7. Update freshness scores for all existing embeddings
    await updateFreshnessScores(supabase);

    // 8. Aggregate user budget data (anonymous)
    const userDataCount = await aggregateUserBudgetData(supabase, openai);
    totalProcessed += userDataCount;

    // Update job status
    const status = errors.length > 0 ? 'completed_with_errors' : 'completed';
    await updateJob(
      supabase,
      jobId,
      status,
      totalProcessed,
      errors.length > 0 ? errors.join('; ') : null
    );

    return new Response(
      JSON.stringify({
        jobId,
        status,
        processed: totalProcessed,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await updateJob(supabase, jobId, 'failed', totalProcessed, message);

    return new Response(
      JSON.stringify({ error: message, jobId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function updateJob(
  supabase: any,
  jobId: string,
  status: string,
  recordsProcessed: number,
  errorMessage: string | null
) {
  await supabase
    .from('crawl_jobs')
    .update({
      status,
      records_processed: recordsProcessed,
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);
}

/**
 * Update freshness scores using exponential decay (half-life = 90 days)
 */
async function updateFreshnessScores(supabase: any) {
  try {
    const { data: embeddings } = await supabase
      .from('knowledge_embeddings')
      .select('id, created_at')
      .eq('is_active', true);

    if (!embeddings || embeddings.length === 0) return;

    for (const emb of embeddings) {
      const freshness = calculateFreshnessScore(new Date(emb.created_at));
      if (freshness < 0.1) {
        // Very old data — mark as inactive
        await supabase
          .from('knowledge_embeddings')
          .update({ is_active: false, freshness_score: freshness })
          .eq('id', emb.id);
      } else {
        await supabase
          .from('knowledge_embeddings')
          .update({ freshness_score: freshness })
          .eq('id', emb.id);
      }
    }
  } catch (error: unknown) {
    console.error('Freshness update error:', error);
  }
}

/**
 * Aggregate anonymous user budget data for community insights
 * Creates embeddings from aggregated budget statistics
 */
async function aggregateUserBudgetData(
  supabase: any,
  openai: OpenAI
): Promise<number> {
  try {
    // Get aggregate stats per category (anonymous)
    // Uses raw query via budget_items table since get_budget_stats RPC may not exist
    const { data: stats, error: rpcError } = await supabase
      .from('budget_items')
      .select('category_name:sub_category, amount')
      .gt('amount', 0);

    if (rpcError || !stats || stats.length === 0) return 0;

    // Aggregate manually: group by category_name
    const grouped: Record<string, number[]> = {};
    for (const item of stats) {
      const cat = item.category_name || 'Unknown';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item.amount);
    }

    const aggregated = Object.entries(grouped).map(([category_name, amounts]) => ({
      category_name,
      avg_amount: Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length),
      min_amount: Math.min(...amounts),
      max_amount: Math.max(...amounts),
      count: amounts.length,
    }));

    if (aggregated.length === 0) return 0;

    // Format aggregated data into readable text for embedding
    const summaryTexts = aggregated.map((s) => ({
      content: `${s.category_name} 평균 비용: ${formatWon(s.avg_amount)} (범위: ${formatWon(s.min_amount)}~${formatWon(s.max_amount)}, 응답 수: ${s.count}명)`,
      metadata: {
        source: '웨딩셈 사용자 데이터',
        category: s.category_name,
        date: new Date().toISOString().split('T')[0],
        sample_size: s.count,
      },
      source_type: 'user_generated' as const,
    }));

    const records = await processContent(openai, summaryTexts);

    if (records.length > 0) {
      await supabase
        .from('knowledge_embeddings')
        .upsert(records, { onConflict: 'content_hash' });
    }

    return records.length;
  } catch (error: unknown) {
    console.error('User data aggregation error:', error);
    return 0;
  }
}

function formatWon(amount: number): string {
  if (amount >= 10000) {
    return `${Math.round(amount / 10000)}만원`;
  }
  return `${amount.toLocaleString()}원`;
}

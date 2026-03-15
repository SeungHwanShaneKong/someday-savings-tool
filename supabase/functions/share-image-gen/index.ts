// [AGENT-TEAM-9-20260307] 공유 이미지 생성 Edge Function
// 예산 데이터를 기반으로 스타일링된 HTML 공유 카드 및 OG 메타태그 생성 (GPT 미사용)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { verifyUserToken } from '../_shared/jwt.ts';
import { logFunctionCall } from '../_shared/log-call.ts';

interface ShareCategory {
  name: string;
  amount: number;
}

interface ShareImageRequest {
  total_budget: number;
  categories: ShareCategory[];
  savings_pct?: number;
  wedding_date?: string;
}

interface ShareImageSummary {
  total: number;
  categories_count: number;
  savings_pct: number;
}

interface ShareImageResponse {
  card_html: string;
  og_title: string;
  og_description: string;
  summary: ShareImageSummary;
}

// ── 금액을 만원 단위 문자열로 변환 ──
function formatManWon(amount: number): string {
  const man = Math.round(amount / 10000);
  return `${man.toLocaleString('ko-KR')}만원`;
}

// ── 상위 N개 카테고리 추출 (금액 기준 내림차순) ──
function topCategories(categories: ShareCategory[], n: number): ShareCategory[] {
  return [...categories]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, n);
}

// ── 스타일링된 HTML 카드 생성 (1200x630 OG 이미지 사이즈) ──
function generateCardHtml(
  totalBudget: number,
  categories: ShareCategory[],
  savingsPct?: number,
  weddingDate?: string,
): string {
  const top5 = topCategories(categories, 5);

  const categoryRows = top5
    .map(
      (cat, i) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:${i < top5.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none'};">
        <span style="font-size:18px;color:#fce4ec;">${cat.name}</span>
        <span style="font-size:18px;font-weight:700;color:#fff;">${formatManWon(cat.amount)}</span>
      </div>`
    )
    .join('');

  const savingsSection = savingsPct != null
    ? `<div style="margin-top:16px;padding:10px 16px;background:rgba(255,255,255,0.15);border-radius:8px;display:flex;align-items:center;gap:8px;">
        <span style="font-size:20px;">&#128176;</span>
        <span style="font-size:16px;color:#fff;">절감률 <strong>${savingsPct}%</strong></span>
      </div>`
    : '';

  const dateSection = weddingDate
    ? `<div style="margin-top:8px;font-size:14px;color:#f8bbd0;">&#128210; 예식일: ${weddingDate}</div>`
    : '';

  return `<div style="width:1200px;height:630px;background:linear-gradient(135deg,#e91e63 0%,#ad1457 50%,#880e4f 100%);font-family:'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif;padding:48px 56px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;">
  <div style="position:absolute;top:-80px;right:-80px;width:300px;height:300px;border-radius:50%;background:rgba(255,255,255,0.06);"></div>
  <div style="position:absolute;bottom:-60px;left:-60px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.04);"></div>

  <div>
    <div style="font-size:16px;color:#f8bbd0;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">WEDDING BUDGET REPORT</div>
    <h1 style="margin:0 0 4px 0;font-size:36px;font-weight:800;color:#fff;">웨딩셈 예산 리포트</h1>
    ${dateSection}
  </div>

  <div style="flex:1;display:flex;gap:48px;margin-top:24px;">
    <div style="flex:1;">
      <div style="font-size:14px;color:#f8bbd0;margin-bottom:6px;">총 예산</div>
      <div style="font-size:42px;font-weight:800;color:#fff;margin-bottom:20px;">${formatManWon(totalBudget)}</div>
      ${savingsSection}
    </div>
    <div style="flex:1.2;">
      <div style="font-size:14px;color:#f8bbd0;margin-bottom:10px;">주요 항목 TOP ${top5.length}</div>
      ${categoryRows}
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;">
    <div style="font-size:14px;color:rgba(255,255,255,0.6);">웨딩셈 | weddingsem.com</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.4);">Powered by AI</div>
  </div>
</div>`;
}

// ── OG description 생성 ──
function generateOgDescription(
  totalBudget: number,
  categories: ShareCategory[],
  savingsPct?: number,
): string {
  const top5 = topCategories(categories, 5);
  const topItem = top5[0];
  const restCount = top5.length - 1;

  let desc = `총 예산 ${formatManWon(totalBudget)}`;
  if (topItem) {
    desc += ` | ${topItem.name} ${formatManWon(topItem.amount)}`;
    if (restCount > 0) desc += ` 외 ${restCount}개 항목`;
  }
  if (savingsPct != null) {
    desc += ` | 절감률 ${savingsPct}%`;
  }
  return desc;
}

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  const startTime = Date.now();

  try {
    // ── Auth: user authentication ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: '인증이 필요합니다' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // [SEC-FIX-20260315] Secure JWT verification
    const token = authHeader.replace('Bearer ', '');
    const userId = await verifyUserToken(supabase, token);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: '유효하지 않은 인증입니다' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Parse request body ──
    const { total_budget, categories, savings_pct, wedding_date }: ShareImageRequest = await req.json();

    if (!total_budget || !categories || !Array.isArray(categories) || categories.length === 0) {
      return new Response(
        JSON.stringify({ error: 'total_budget와 categories(배열)가 필요합니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Generate HTML card (no GPT — pure template) ──
    const cardHtml = generateCardHtml(total_budget, categories, savings_pct, wedding_date);
    const ogDescription = generateOgDescription(total_budget, categories, savings_pct);

    const top5 = topCategories(categories, 5);

    const result: ShareImageResponse = {
      card_html: cardHtml,
      og_title: '웨딩셈 예산 리포트',
      og_description: ogDescription,
      summary: {
        total: total_budget,
        categories_count: top5.length,
        savings_pct: savings_pct ?? 0,
      },
    };

    await logFunctionCall(supabase, 'share-image-gen', startTime, 200, userId);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[share-image-gen] Error:', message);

    // Best-effort logging — supabase may not be initialized if auth failed early
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      await logFunctionCall(supabase, 'share-image-gen', startTime, 500, null, message);
    } catch {
      // Ignore logging failure
    }

    return new Response(
      JSON.stringify({ error: '공유 카드 생성 중 오류가 발생했습니다', detail: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// [AGENT-TEAM-9-20260307]
// M2 SEO Amplifier — Admin-only Edge Function
// GPT 기반 한국어 웨딩 SEO 콘텐츠 생성기
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { decodeJwtPayload } from '../_shared/jwt.ts';
import { chatCompletion, type ChatMessage } from '../_shared/openai.ts';
import { logFunctionCall } from '../_shared/log-call.ts';

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
    return new Response(
      JSON.stringify({ error: '인증이 필요합니다' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.replace('Bearer ', '');

  // Cross-project auth: try getUser first, fall back to JWT decode
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

  // Check admin role
  const { data: isAdmin } = await supabase.rpc('has_role', {
    _user_id: userId,
    _role: 'admin',
  });

  if (!isAdmin) {
    return new Response(
      JSON.stringify({ error: '관리자 권한이 필요합니다' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // ── Parse input ──
    const body = await req.json();
    const keyword: string = body.keyword;
    const tone: string = body.tone || 'friendly';
    const maxWords: number = body.max_words || 800;

    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: '키워드를 입력해주세요' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Optionally fetch related embeddings for context (top 5 by category match) ──
    let contextSnippets = '';
    try {
      const { data: embeddings } = await supabase
        .from('knowledge_embeddings')
        .select('content, category')
        .ilike('content', `%${keyword.trim()}%`)
        .order('freshness_score', { ascending: false })
        .limit(5);

      if (embeddings && embeddings.length > 0) {
        contextSnippets = embeddings
          .map((e: any) => `[${e.category || '일반'}] ${e.content}`)
          .join('\n\n');
      }
    } catch (err) {
      // Non-critical: proceed without context
      console.warn('[seo-amplifier] Embedding fetch failed:', err);
    }

    // ── Tone mapping ──
    const toneDescriptions: Record<string, string> = {
      friendly: '친근하고 따뜻한 톤 (반말/존댓말 혼용, 이모지 가능)',
      professional: '전문적이고 신뢰감 있는 톤 (존댓말, 데이터 인용 스타일)',
      casual: '가볍고 편한 톤 (대화체, SNS 스타일)',
    };
    const toneInstruction = toneDescriptions[tone] || toneDescriptions.friendly;

    // ── Build GPT messages ──
    const systemPrompt = `당신은 한국 웨딩 업계 전문 SEO 콘텐츠 작성가입니다.
사용자가 제공한 키워드를 중심으로 블로그 스타일의 SEO 최적화 콘텐츠를 생성합니다.

작성 규칙:
- 톤: ${toneInstruction}
- 분량: 약 ${maxWords}자 내외
- HTML 태그 사용: <h2>, <h3>, <p>, <ul>, <li>, <strong> 등 시맨틱 태그 활용
- 2026년 기준 최신 트렌드 반영
- 자연스러운 키워드 삽입 (키워드 스터핑 금지)
- 가독성 높은 구조 (소제목, 목록, 짧은 문단)

반드시 아래 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이 순수 JSON):
{
  "title": "SEO 최적화된 제목 (60자 이내)",
  "meta_description": "검색 결과에 표시될 메타 설명 (155자 이내)",
  "body_html": "<h2>...</h2><p>...</p>...",
  "keywords": ["관련 키워드1", "관련 키워드2", ...],
  "estimated_read_time": "N분"
}`;

    const userMessage = contextSnippets
      ? `키워드: "${keyword.trim()}"

참고 자료 (RAG 컨텍스트):
${contextSnippets}

위 키워드를 중심으로 SEO 콘텐츠를 생성해주세요.`
      : `키워드: "${keyword.trim()}"

위 키워드를 중심으로 SEO 콘텐츠를 생성해주세요.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    // ── Call GPT ──
    const rawResponse = await chatCompletion(messages, {
      temperature: 0.7,
      maxTokens: 4096,
    });

    // ── Parse response ──
    let parsed: any;
    try {
      // Strip markdown code fences if present
      const cleaned = rawResponse
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('[seo-amplifier] JSON parse failed. Raw:', rawResponse);
      return new Response(
        JSON.stringify({ error: 'GPT 응답 파싱 실패', raw: rawResponse }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = {
      title: parsed.title || '',
      meta_description: parsed.meta_description || '',
      body_html: parsed.body_html || '',
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      estimated_read_time: parsed.estimated_read_time || '3분',
    };

    await logFunctionCall(supabase, 'seo-amplifier', startTime, 200, userId);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[seo-amplifier] Error:', error);
    await logFunctionCall(supabase, 'seo-amplifier', startTime, 500, userId, error.message);
    return new Response(
      JSON.stringify({ error: error.message || 'SEO 콘텐츠 생성 실패' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

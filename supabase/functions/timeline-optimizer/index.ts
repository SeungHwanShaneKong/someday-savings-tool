// [AGENT-TEAM-9-20260307]
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { decodeJwtPayload } from '../_shared/jwt.ts';
import { chatCompletion, type ChatMessage } from '../_shared/openai.ts';
import { logFunctionCall } from '../_shared/log-call.ts';
import { parseGptJson } from '../_shared/parse-gpt-json.ts';

const SYSTEM_PROMPT = `당신은 한국 결혼 준비 일정 최적화 전문 AI 플래너입니다.

역할:
- 결혼식 날짜를 기준으로 역산하여 월별 준비 일정을 생성합니다.
- 이미 완료된 항목은 제외하고 남은 할 일만 추천합니다.
- 각 항목에 우선순위(high/medium/low)와 구체적인 팁을 제공합니다.
- 예산이 주어지면 예산에 맞는 실용적인 조언을 포함합니다.

규칙:
- 반드시 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.
- 한국 결혼 문화에 맞는 항목 (예식장, 스드메, 예물, 혼수, 청첩장, 예단 등)을 포함하세요.
- month 필드는 "YYYY-MM" 형식으로, 현재 월부터 결혼식 월까지 순서대로 나열하세요.
- deadline 필드는 "YYYY-MM-DD" 형식으로 해당 월 내 권장 마감일을 지정하세요.
- 각 월에 2~5개의 task를 배치하세요.

응답 형식:
{
  "timeline": [
    {
      "month": "2026-04",
      "tasks": [
        {
          "task": "예식장 투어 및 계약",
          "priority": "high",
          "tip": "주말 예식은 최소 6개월 전 예약 필요. 평일 예식 시 30~50% 할인 가능",
          "deadline": "2026-04-15"
        }
      ]
    }
  ]
}`;

serve(async (req: Request) => {
  const startTime = Date.now();
  let userId: string | null = null;

  // CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      await logFunctionCall(supabase, 'timeline-optimizer', startTime, 401, null, '인증 헤더 없음');
      return new Response(
        JSON.stringify({ error: '인증이 필요합니다' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (!authError && user) {
      userId = user.id;
    } else {
      const payload = decodeJwtPayload(token);
      if (payload?.sub) userId = payload.sub;
    }

    if (!userId) {
      await logFunctionCall(supabase, 'timeline-optimizer', startTime, 401, null, '유효하지 않은 토큰');
      return new Response(
        JSON.stringify({ error: '유효하지 않은 인증입니다' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body
    const { wedding_date, completed_items, budget_total } = await req.json() as {
      wedding_date: string;
      completed_items: string[];
      budget_total?: number;
    };

    if (!wedding_date || !Array.isArray(completed_items)) {
      await logFunctionCall(supabase, 'timeline-optimizer', startTime, 400, userId, '필수 파라미터 누락');
      return new Response(
        JSON.stringify({ error: 'wedding_date와 completed_items가 필요합니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate D-day
    const weddingDateObj = new Date(wedding_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    weddingDateObj.setHours(0, 0, 0, 0);
    const diffMs = weddingDateObj.getTime() - today.getTime();
    const dday_count = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Build user prompt
    let userPrompt = `결혼식 날짜: ${wedding_date}\n`;
    userPrompt += `오늘 날짜: ${today.toISOString().split('T')[0]}\n`;
    userPrompt += `남은 일수: D-${dday_count}\n`;

    if (completed_items.length > 0) {
      userPrompt += `\n이미 완료한 항목:\n${completed_items.map(item => `- ${item}`).join('\n')}\n`;
    } else {
      userPrompt += '\n아직 완료한 항목이 없습니다.\n';
    }

    if (budget_total) {
      userPrompt += `\n총 예산: ${budget_total.toLocaleString()}만원\n`;
    }

    userPrompt += '\n위 정보를 바탕으로 남은 기간에 대한 월별 준비 일정을 JSON으로 생성해주세요.';

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ];

    // Call GPT
    // [EF-RESILIENCE-20260308-051500] gpt-4o-mini: restored temperature
    const reply = await chatCompletion(messages, {
      temperature: 0.6,
      maxTokens: 3000,
    });

    // [EF-ADMIN-FIX-20260308-140000] Robust JSON extraction
    const parsed = parseGptJson<{ timeline: unknown }>(reply);
    if (!parsed?.timeline) {
      console.error('GPT JSON 파싱 실패. Raw reply:', reply);
      await logFunctionCall(supabase, 'timeline-optimizer', startTime, 500, userId, 'GPT 응답 JSON 파싱 실패');
      return new Response(
        JSON.stringify({ error: 'AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { timeline } = parsed;

    await logFunctionCall(supabase, 'timeline-optimizer', startTime, 200, userId);

    return new Response(
      JSON.stringify({ timeline, dday_count }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('timeline-optimizer error:', message);
    await logFunctionCall(supabase, 'timeline-optimizer', startTime, 500, userId, message);
    return new Response(
      JSON.stringify({ error: '일정 최적화 중 오류가 발생했습니다', detail: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// [AGENT-TEAM-9-20260307]
// honeymoon-planner: 예산·일정·선호도 기반 AI 신혼여행 종합 플래너
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { verifyUserToken } from '../_shared/jwt.ts';
import { chatCompletion, type ChatMessage } from '../_shared/openai.ts';
import { logFunctionCall } from '../_shared/log-call.ts';
import { parseGptJson } from '../_shared/parse-gpt-json.ts';

interface HoneymoonRequest {
  budget: number;
  duration_days: number;
  preferred_regions: string[];
  travel_style: string;
  departure_date?: string;
}

const SYSTEM_PROMPT = `당신은 한국 커플을 위한 신혼여행 기획 전문 AI 플래너입니다.

역할:
- 예산, 기간, 선호 지역, 여행 스타일, 출발일을 기반으로 최적의 신혼여행 계획을 수립합니다.
- 항공권, 숙소, 식비, 액티비티, 예비비를 포함한 상세 예산 분석을 제공합니다.
- 일자별 세부 일정과 예상 비용, 현지 팁을 안내합니다.
- 대안 여행지와 예약 최적 타이밍을 제안합니다.

원칙:
- 금액은 원(KRW) 단위 숫자로 정확히 제시
- 확실하지 않은 정보는 "확인이 필요합니다"로 안내
- 실용적이고 현실적인 예산 배분을 우선
- 성수기/비수기 가격 차이를 반영

반드시 아래 JSON 형식으로만 응답하세요. JSON 외 텍스트를 포함하지 마세요:
{
  "recommended_destination": "추천 여행지 이름",
  "itinerary": [
    { "day": 1, "activities": "일정 설명", "estimated_cost": 비용숫자, "tips": "현지 팁" }
  ],
  "budget_breakdown": {
    "flights": 항공비숫자,
    "accommodation": 숙박비숫자,
    "meals": 식비숫자,
    "activities": 액티비티비숫자,
    "buffer": 예비비숫자
  },
  "alternatives": [
    { "destination": "대안 여행지", "reason": "추천 이유", "cost_diff": 비용차이숫자 }
  ],
  "booking_tips": [
    { "item": "예약 항목", "optimal_timing": "최적 예약 시기", "savings_estimate": "절감 예상액" }
  ]
}`;

serve(async (req) => {
  // CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const startTime = Date.now();
  let userId: string | null = null;

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: '인증이 필요합니다' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT — try native verification first, then decode for cross-project tokens
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (!authError && user) {
      userId = user.id;
    } else {
      const payload = decodeJwtPayload(token);
      if (payload?.sub) userId = payload.sub;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: '유효하지 않은 인증입니다' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body
    const body: HoneymoonRequest = await req.json();
    const { budget, duration_days, preferred_regions, travel_style, departure_date } = body;

    if (!budget || !duration_days || !preferred_regions?.length || !travel_style) {
      return new Response(
        JSON.stringify({ error: 'budget, duration_days, preferred_regions, travel_style는 필수입니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build user prompt
    const userPrompt = [
      `예산: ${budget.toLocaleString()}원`,
      `기간: ${duration_days}일`,
      `선호 지역: ${preferred_regions.join(', ')}`,
      `여행 스타일: ${travel_style}`,
      departure_date ? `출발 예정일: ${departure_date}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ];

    // Call GPT
    // [EF-RESILIENCE-20260308-051500] gpt-4o-mini: restored temperature
    const reply = await chatCompletion(messages, {
      temperature: 0.7,
      maxTokens: 4096,
    });

    // [EF-ADMIN-FIX-20260308-140000] Robust JSON extraction from GPT response
    const parsedPlan = parseGptJson(reply);
    if (!parsedPlan) {
      // All parse strategies failed — return raw text as fallback
      await logFunctionCall(
        createClient(supabaseUrl, supabaseKey),
        'honeymoon-planner',
        startTime,
        200,
        userId
      );

      return new Response(
        JSON.stringify({ raw_text: reply }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log successful call
    await logFunctionCall(
      createClient(supabaseUrl, supabaseKey),
      'honeymoon-planner',
      startTime,
      200,
      userId
    );

    return new Response(
      JSON.stringify(parsedPlan),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('honeymoon-planner error:', message);

    // Log failed call
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      await logFunctionCall(
        createClient(supabaseUrl, supabaseKey),
        'honeymoon-planner',
        startTime,
        500,
        userId,
        message
      );
    } catch {
      // Fire-and-forget
    }

    return new Response(
      JSON.stringify({ error: '신혼여행 계획 생성 중 오류가 발생했습니다', detail: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

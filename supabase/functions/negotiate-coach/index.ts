// [AGENT-TEAM-9-20260307] 협상 코치 Edge Function
// 카테고리별 결혼 비용 협상 팁을 GPT로 생성하여 반환
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { decodeJwtPayload } from '../_shared/jwt.ts';
import { chatCompletion, type ChatMessage } from '../_shared/openai.ts';

interface NegotiateRequest {
  category: string;
  amount: number;
  region?: string;
}

interface NegotiationTip {
  title: string;
  description: string;
  example: string;
  savings_estimate: string;
}

interface NegotiateResponse {
  tips: NegotiationTip[];
  confidence: number;
}

/** 간단한 성능 로깅 (logFunctionCall) */
function logFunctionCall(
  functionName: string,
  startTime: number,
  success: boolean,
  meta?: Record<string, unknown>
): void {
  const durationMs = Date.now() - startTime;
  console.log(
    JSON.stringify({
      function: functionName,
      duration_ms: durationMs,
      success,
      timestamp: new Date().toISOString(),
      ...meta,
    })
  );
}

const SYSTEM_PROMPT = `당신은 한국 결혼 준비 비용 협상 전문가 "웨딩셈 협상 코치"입니다.

역할:
- 결혼 준비 각 항목(예식장, 스드메, 웨딩홀, 꽃, 영상, 폐백, 혼수 등)의 협상 전략 제공
- 실제 커플들이 사용한 효과적인 협상 화법 예시 제공
- 현실적인 절감 금액 추정
- 지역별 시세 차이를 고려한 맞춤 조언

응답 규칙:
1. 반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이)
2. tips 배열에 3~5개의 협상 팁을 포함하세요
3. 각 팁의 savings_estimate는 "약 XX만원 절감 가능" 형태로 작성하세요
4. example은 실제 대화 예시 ("이렇게 말해보세요: ..." 형태)
5. confidence는 0~1 사이 숫자 (해당 카테고리 협상 성공 가능성)

JSON 형식:
{
  "tips": [
    {
      "title": "팁 제목",
      "description": "상세 설명",
      "example": "실제 협상 대화 예시",
      "savings_estimate": "약 XX만원 절감 가능"
    }
  ],
  "confidence": 0.8
}`;

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

    // Verify JWT — try native verification first, then decode for cross-project tokens
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
        JSON.stringify({ error: '유효하지 않은 인증입니다' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Parse request body ──
    const { category, amount, region }: NegotiateRequest = await req.json();

    if (!category || !amount) {
      return new Response(
        JSON.stringify({ error: 'category와 amount가 필요합니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Build user message with context ──
    const regionContext = region ? ` 지역: ${region}.` : '';
    const userMessage = `카테고리: ${category}. 현재 견적 금액: ${amount.toLocaleString()}원.${regionContext} 이 항목에 대한 협상 팁을 JSON 형식으로 알려주세요.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ];

    // ── Call GPT ──
    const rawReply = await chatCompletion(messages, {
      temperature: 0.7,
      maxTokens: 2048,
    });

    // ── Parse GPT response as JSON ──
    let result: NegotiateResponse;

    try {
      // GPT may wrap JSON in markdown code blocks — strip them
      const cleaned = rawReply
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      result = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('[negotiate-coach] JSON parse error:', parseError, 'raw:', rawReply);
      // Fallback: return a generic tip
      result = {
        tips: [
          {
            title: '복수 업체 견적 비교',
            description: '최소 3곳 이상의 업체에서 견적을 받아 비교하세요. 경쟁 견적이 있다는 것만으로도 협상력이 크게 높아집니다.',
            example: '이렇게 말해보세요: "다른 곳에서 비슷한 조건으로 더 낮은 견적을 받았는데, 혹시 맞춰주실 수 있을까요?"',
            savings_estimate: '약 10~20% 절감 가능',
          },
        ],
        confidence: 0.5,
      };
    }

    // ── Validate response structure ──
    if (!Array.isArray(result.tips) || result.tips.length === 0) {
      throw new Error('GPT 응답에 유효한 tips가 없습니다');
    }

    // Clamp confidence to 0–1
    result.confidence = Math.max(0, Math.min(1, result.confidence ?? 0.7));

    // ── Save conversation for analytics ──
    try {
      await supabase.from('ai_conversations').insert({
        user_id: userId,
        feature: 'negotiate',
        messages: [
          { role: 'user', content: userMessage },
          { role: 'assistant', content: JSON.stringify(result) },
        ],
        metadata: { category, amount, region: region || null },
      });
    } catch (saveError) {
      // Conversation save failure should not block the response
      console.warn('[negotiate-coach] Failed to save conversation:', saveError);
    }

    logFunctionCall('negotiate-coach', startTime, true, {
      category,
      amount,
      region: region || null,
      tips_count: result.tips.length,
    });

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[negotiate-coach] Error:', message);

    logFunctionCall('negotiate-coach', startTime, false, { error: message });

    return new Response(
      JSON.stringify({ error: '협상 팁 생성 중 오류가 발생했습니다', detail: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

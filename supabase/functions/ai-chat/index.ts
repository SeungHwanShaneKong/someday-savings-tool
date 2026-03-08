import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { chatCompletion, type ChatMessage } from '../_shared/openai.ts';
import { decodeJwtPayload } from '../_shared/jwt.ts';

// Feature-specific system prompts
const SYSTEM_PROMPTS: Record<string, string> = {
  honeymoon: `당신은 한국 커플을 위한 신혼여행 전문 AI 어드바이저 '웨딩셈 허니문'입니다.
역할:
- 신혼여행지 추천 및 비교 (몰디브, 유럽, 하와이, 발리, 칸쿤, 제주 등)
- 예산별 최적 여행 코스 제안
- 항공권/숙소 예약 시기 조언
- 비자, 환전, 여행자 보험 안내
톤: 따뜻하고 전문적인 한국어. 금액은 '만원' 단위 사용.
제한: 확실하지 않은 정보는 "확인이 필요합니다"로 답변.`,

  qa: `당신은 한국 결혼 준비 전문 AI 어드바이저 '웨딩셈 Q&A'입니다.
역할:
- 결혼 준비 전반에 대한 질문 답변 (예식장, 스드메, 혼수, 예물 등)
- 비용 절감 팁 및 숨겨진 비용 안내
- 결혼 준비 일정 관리 조언
- 양가 소통 및 에티켓 안내
톤: 친근하고 실용적인 한국어. 금액은 '만원' 단위 사용.
원칙:
- 항상 출처/근거를 함께 안내
- 지역별 차이가 있을 경우 명시
- 개인 상황에 따라 다를 수 있음을 안내

## 중요: 답변 형식 규칙
모든 답변은 반드시 정확히 3개의 불릿 포인트(•)로 구성하세요.
- 첫 번째 불릿: 핵심 답변 (질문에 대한 직접적인 답)
- 두 번째 불릿: 비용/일정 관련 구체적 정보 (금액, 기간, 시기 등)
- 세 번째 불릿: 실용적 팁 또는 주의사항
3개를 초과하거나 미달하지 마세요. 각 불릿은 '•' 기호로 시작하세요.`,

  budget: `당신은 한국 결혼 예산 전문 AI 어드바이저 '웨딩셈 예산'입니다.
역할:
- 예산 항목별 적정 금액 조언
- 숨겨진 비용 경고 (피팅비, 헬퍼비, 원본 사진 등)
- 절감 가능 항목 제안
- 예비비 산출 안내
톤: 신뢰감 있는 한국어. 금액은 정확한 숫자로.`,
};

const DAILY_LIMIT = 50;

Deno.serve(async (req: Request) => {
  // CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Auth
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
    // (Live site issues JWTs from Lovable's project; Edge Functions live on a different project)
    const token = authHeader.replace('Bearer ', '');
    let userId: string;

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (!authError && user) {
      userId = user.id;
    } else {
      // Cross-project token: decode payload to extract user ID
      const payload = decodeJwtPayload(token);
      if (!payload) {
        return new Response(
          JSON.stringify({ error: '유효하지 않은 인증입니다' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = payload.sub;
    }

    // Parse body
    const { feature, messages, context } = await req.json() as {
      feature: string;
      messages: ChatMessage[];
      context?: Record<string, unknown>;
    };

    if (!feature || !messages?.length) {
      return new Response(
        JSON.stringify({ error: 'feature와 messages가 필요합니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit check (50 per day per user)
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('ai_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00Z`);

    if ((count ?? 0) >= DAILY_LIMIT) {
      return new Response(
        JSON.stringify({ error: `일일 AI 사용 한도(${DAILY_LIMIT}회)를 초과했습니다. 내일 다시 이용해주세요.` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build messages with system prompt
    const systemPrompt = SYSTEM_PROMPTS[feature] || SYSTEM_PROMPTS.qa;
    let contextNote = '';
    if (context) {
      contextNote = `\n\n[사용자 컨텍스트]\n${JSON.stringify(context, null, 2)}`;
    }

    const fullMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt + contextNote },
      ...messages,
    ];

    // Call OpenAI GPT
    // [EF-RESILIENCE-20260308-051500] gpt-4o-mini: restored temperature
    const reply = await chatCompletion(fullMessages, {
      temperature: 0.7,
      maxTokens: 2048,
    });

    // Save conversation (wrapped in try-catch: cross-project user_id may fail FK constraint)
    try {
      await supabase.from('ai_conversations').insert({
        user_id: userId,
        feature,
        messages: [...messages, { role: 'assistant', content: reply }],
        metadata: context ? { context } : null,
      });
    } catch (saveError) {
      // Conversation save failure should not block the AI response
      console.warn('Failed to save conversation:', saveError);
    }

    return new Response(
      JSON.stringify({ reply, feature }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('ai-chat error:', message);
    return new Response(
      JSON.stringify({ error: 'AI 응답 생성 중 오류가 발생했습니다', detail: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

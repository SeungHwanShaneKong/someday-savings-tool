import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { chatCompletion, type ChatMessage } from '../_shared/openai.ts';
import { verifyUserToken } from '../_shared/jwt.ts';

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

// [CL-AI-CHAT-LIMIT5-20260408-100500] Feature-scoped daily limits
// qa는 하루 5회 제한(사용자 요청), 그 외(honeymoon/budget)는 기존 20회 유지
const DAILY_LIMITS: Record<string, number> = {
  qa: 5,
  honeymoon: 20,
  budget: 20,
};
const DEFAULT_DAILY_LIMIT = 20;
// [CL-SEC-FEATURE-ALLOWLIST-20260621] 클라가 임의 feature 문자열(qa_2, qa_3 …)을 보내면 매번
// 0부터 시작하는 새 카운터 + 기본 20한도가 적용돼 qa 5회/일 제한이 무력화됐다(레이트리밋 우회).
// DAILY_LIMITS 키만 허용해 `?? DEFAULT_DAILY_LIMIT` 와 `SYSTEM_PROMPTS[feature] || qa` 폴백을 봉쇄.
const ALLOWED_FEATURES = new Set(Object.keys(DAILY_LIMITS));

function getSeoulResetAt(): string {
  // 다음 00:00 KST(UTC+9)를 ISO 문자열로 계산
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const tomorrow = new Date(kstNow);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  // KST 00:00 → UTC 기준 -9h
  const resetUtc = new Date(tomorrow.getTime() - 9 * 60 * 60 * 1000);
  return resetUtc.toISOString();
}

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

    // [SEC-FIX-20260315] Secure JWT verification (replaces decodeJwtPayload)
    const token = authHeader.replace('Bearer ', '');
    const userId = await verifyUserToken(supabase, token);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: '유효하지 않은 인증입니다' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body
    const { feature, messages, context } = await req.json() as {
      feature: string;
      messages: ChatMessage[];
      context?: Record<string, unknown>;
    };

    if (!feature || !ALLOWED_FEATURES.has(feature) || !messages?.length) {
      return new Response(
        JSON.stringify({ error: '유효하지 않은 요청입니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // [CL-SEC-AICHAT-SANITIZE-20260621] 클라가 보낸 messages 를 신뢰하지 않는다:
    // (1) system/tool 역할 주입을 제거(가드레일 오버라이드·탈옥 차단) — user/assistant 만 허용
    // (2) 최근 12턴으로 제한 + 총/단일 길이 상한(토큰 비용 증폭 방지). embed-text(100개 제한)와 일관.
    const safeMessages = (messages as ChatMessage[]).filter(
      (m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim().length > 0,
    ).slice(-12);
    if (safeMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: '유효하지 않은 요청입니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const totalLen = safeMessages.reduce((n, m) => n + m.content.length, 0) + (context ? JSON.stringify(context).length : 0);
    if (totalLen > 16000 || safeMessages.some((m) => m.content.length > 8000)) {
      return new Response(
        JSON.stringify({ error: '입력이 너무 깁니다. 질문을 줄여주세요.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // [CL-AI-CHAT-LIMIT5-20260408-100500] Feature-scoped rate limit
    // feature 컬럼으로 필터링하여 qa 5회/일, 나머지 20회/일 (feature 간 카운트 격리)
    const limit = DAILY_LIMITS[feature] ?? DEFAULT_DAILY_LIMIT;
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('ai_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('feature', feature)
      .gte('created_at', `${today}T00:00:00Z`);

    const usedToday = count ?? 0;
    if (usedToday >= limit) {
      const isQa = feature === 'qa';
      const friendlyMsg = isQa
        ? `오늘의 AI Q&A 질문 ${limit}회를 모두 사용하셨어요. 내일 다시 이용해주세요! 🌙`
        : `오늘의 AI 사용 한도(${limit}회)를 모두 사용하셨어요. 내일 다시 이용해주세요! 🌙`;
      return new Response(
        JSON.stringify({
          error: friendlyMsg,
          remaining: 0,
          limit,
          feature,
          resetAt: getSeoulResetAt(),
        }),
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
      ...safeMessages,
    ];

    // Call OpenAI GPT
    const reply = await chatCompletion(fullMessages, {
      temperature: 0.7,
      maxTokens: 2048,
    });

    // Save conversation
    try {
      await supabase.from('ai_conversations').insert({
        user_id: userId,
        feature,
        messages: [...safeMessages, { role: 'assistant', content: reply }],
        metadata: context ? { context } : null,
      });
    } catch (saveError) {
      console.warn('Failed to save conversation:', saveError);
    }

    // [CL-AI-CHAT-LIMIT5-20260408-100500] 성공 응답에 remaining 포함 (클라이언트 카운터용)
    const remaining = Math.max(0, limit - (usedToday + 1));
    return new Response(
      JSON.stringify({ reply, feature, remaining, limit }),
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

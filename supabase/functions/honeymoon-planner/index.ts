// [AGENT-TEAM-9-20260307]
// [CL-HONEYMOON-REDESIGN-20260316] action: 'curate' 분기 추가
// [CL-REMOVE-OLD-PLANNER-20260325] 레거시 plan 분기 제거
// [CL-TOP100-DESTINATIONS-20260325] 동적 candidates 프롬프트 + 5개 추천
// honeymoon-planner: AI 신혼여행 큐레이션 전용 Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { verifyUserToken } from '../_shared/jwt.ts';
import { chatCompletion, type ChatMessage } from '../_shared/openai.ts';
import { logFunctionCall } from '../_shared/log-call.ts';
import { parseGptJson } from '../_shared/parse-gpt-json.ts';

// [CL-TOP100-DESTINATIONS-20260325] 후보 정보 인터페이스
interface CandidateInfo {
  id: string;
  name: string;
  region: string;
  description: string;
  highlights: string[];
  budgetRange: { min: number; max: number };
  nights: number;
  localScore: number;
}

// AI 큐레이션 요청 인터페이스
interface CurateRequest {
  action: 'curate';
  dominantStyle: string;
  styleScores: Record<string, number>;
  budgetMin: number;
  budgetMax: number;
  nightsMin: number;
  nightsMax: number;
  departureMonth?: number;
  candidates?: CandidateInfo[]; // [CL-TOP100-DESTINATIONS-20260325]
}

// [CL-TOP100-DESTINATIONS-20260325] 동적 시스템 프롬프트 생성
function buildCurateSystemPrompt(candidates?: CandidateInfo[]): string {
  const candidateSection = candidates && candidates.length > 0
    ? `사용 가능한 후보 여행지 (클라이언트 매칭 점수 포함):\n${candidates.map((c, i) =>
        `${i + 1}. ${c.id}: ${c.name} (${c.region}) — ${c.description}, ` +
        `예산 ${Math.round(c.budgetRange.min / 10000)}~${Math.round(c.budgetRange.max / 10000)}만원, ` +
        `${c.nights}박, 매칭점수 ${c.localScore}, 하이라이트: ${c.highlights.join(', ')}`
      ).join('\n')}`
    : `사용 가능한 여행지: 클라이언트가 100개 여행지 중 상위 후보를 전달하지 않았습니다. 일반적인 한국 신혼여행 인기 여행지를 기준으로 추천하세요.`;

  return `당신은 한국 커플을 위한 신혼여행 큐레이션 AI입니다.

역할:
- 사용자의 여행 성향(dominantStyle, styleScores), 예산 범위, 기간 범위, 출발월을 분석하여 최적의 여행지 5곳을 추천합니다.
- 각 추천에는 매칭 점수, 추천 이유, 하이라이트, 날씨 정보를 포함합니다.
- 클라이언트가 사전 필터링한 후보 목록에서 최적의 5곳을 선별합니다.

${candidateSection}

원칙:
- 반드시 5개 여행지를 추천 (matchScore 높은 순)
- matchScore는 0.0~1.0 범위 (1.0이 최고 매칭)
- reason은 해요체로 작성 (2~3문장, 왜 이 커플에게 맞는지 설명)
- highlights는 3~5개 키워드
- weatherNote는 출발월이 있을 때만 포함
- 후보 목록의 destinationId를 정확히 사용

여행 스타일 매핑 참고:
- relaxation: 힐링, 휴양, 스파 → 해변/리조트/자연 우선
- adventure: 액티비티, 모험 → 트레킹/수상스포츠/자연탐험 우선
- culture: 문화, 역사, 미식 → 도시/유적지/미식 우선
- luxury: 럭셔리, 프라이빗 → 프리미엄 숙소/프라이빗 경험 우선

응답 형식은 반드시 아래 JSON으로만 응답하세요:
{
  "profileEmoji": "프로필 이모지",
  "profileLabel": "프로필 라벨 (예: 여유로운 힐링파)",
  "profileSummary": "프로필 설명 1문장",
  "recommendations": [
    {
      "destinationId": "여행지ID",
      "matchScore": 0.95,
      "reason": "추천 이유 (해요체)",
      "highlights": ["키워드1", "키워드2", "키워드3"],
      "weatherNote": "날씨 참고 (출발월이 있을 때만)"
    }
  ]
}`;
}

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

    // [SEC-FIX-20260315] Secure JWT verification
    userId = await verifyUserToken(supabase, token);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: '유효하지 않은 인증입니다' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body — determine action
    const body = await req.json();
    const action: string = body.action ?? 'curate';

    if (action !== 'curate') {
      return new Response(
        JSON.stringify({ error: `알 수 없는 action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const curateBody = body as CurateRequest;
    const { dominantStyle, styleScores, budgetMin, budgetMax, nightsMin, nightsMax, departureMonth, candidates } = curateBody;

    if (!dominantStyle || !styleScores || !budgetMin || !budgetMax) {
      return new Response(
        JSON.stringify({ error: 'dominantStyle, styleScores, budgetMin, budgetMax는 필수입니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // [CL-TOP100-DESTINATIONS-20260325] 동적 시스템 프롬프트
    const systemPrompt = buildCurateSystemPrompt(candidates);

    const curateUserPrompt = [
      `여행 성향: ${dominantStyle}`,
      `스타일 점수: ${JSON.stringify(styleScores)}`,
      `예산 범위: ${budgetMin.toLocaleString()}원 ~ ${budgetMax.toLocaleString()}원`,
      `기간: ${nightsMin}박 ~ ${nightsMax}박`,
      departureMonth ? `출발 예정월: ${departureMonth}월` : '출발월: 미정',
    ].join('\n');

    const curateMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: curateUserPrompt },
    ];

    const curateReply = await chatCompletion(curateMessages, {
      temperature: 0.7,
      maxTokens: 2048,
    });

    const parsedCuration = parseGptJson(curateReply);

    await logFunctionCall(
      createClient(supabaseUrl, supabaseKey),
      'honeymoon-planner:curate',
      startTime,
      200,
      userId
    );

    if (!parsedCuration || !parsedCuration.recommendations) {
      return new Response(
        JSON.stringify({ error: 'AI 큐레이션 응답 파싱 실패', raw_text: curateReply }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(parsedCuration),
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
        'honeymoon-planner:curate',
        startTime,
        500,
        userId,
        message
      );
    } catch {
      // Fire-and-forget
    }

    return new Response(
      JSON.stringify({ error: '신혼여행 추천 생성 중 오류가 발생했습니다', detail: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

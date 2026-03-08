// rag-query: Vector search → top-5 → GPT-4.1-mini response with citations
// [ZERO-COST-PIPELINE-2026-03-07] freshness_info 응답 추가
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import OpenAI from 'https://esm.sh/openai@4.77.0';
import { DEFAULT_MODEL } from '../_shared/openai.ts';
import { decodeJwtPayload } from '../_shared/jwt.ts';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')!,
});

const EMBEDDING_MODEL = 'text-embedding-3-small';

interface RagRequest {
  question: string;
  feature?: string;       // 'qa' | 'honeymoon' | 'budget'
  match_count?: number;    // default 5
  match_threshold?: number; // default 0.7
}

interface Citation {
  source: string;
  category: string;
  region?: string;
  date?: string;
  url?: string;
  similarity: number;
  // [ZERO-COST-PIPELINE-2026-03-07] 신선도 필드 추가
  crawled_at?: string;
  freshness_score?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: '인증이 필요합니다' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify JWT — native first, then decode for cross-project tokens
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      // Cross-project token: decode payload to validate
      const payload = decodeJwtPayload(token);
      if (!payload) {
        return new Response(
          JSON.stringify({ error: '유효하지 않은 토큰입니다' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Token is valid (cross-project); continue with request
    }

    const body: RagRequest = await req.json();
    const {
      question,
      feature = 'qa',
      match_count = 5,
      match_threshold = 0.7,
    } = body;

    if (!question?.trim()) {
      return new Response(
        JSON.stringify({ error: '질문이 필요합니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Embed the question
    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: question,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Step 2: Vector similarity search
    const { data: matches, error: searchError } = await supabase.rpc(
      'match_knowledge',
      {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold,
        match_count,
      }
    );

    if (searchError) {
      console.error('Vector search error:', searchError);
      // Fall back to non-RAG response if vector search fails
    }

    // Step 3: Build context from matches
    const ragContext = (matches || [])
      .map(
        (m: any, i: number) =>
          `[출처 ${i + 1}] ${m.metadata?.source || m.source_type}${m.region ? ` (${m.region})` : ''}${m.metadata?.date ? ` ${m.metadata.date}` : ''}\n${m.content}`
      )
      .join('\n\n');

    const citations: Citation[] = (matches || []).map((m: any) => ({
      source: m.metadata?.source || m.source_type,
      category: m.metadata?.category || '일반',
      region: m.region || undefined,
      date: m.metadata?.date || undefined,
      url: m.metadata?.url || undefined,
      similarity: m.similarity,
      // [ZERO-COST-PIPELINE-2026-03-07] 신선도 정보 추가
      crawled_at: m.metadata?.crawled_at || undefined,
      freshness_score: m.freshness_score || undefined,
    }));

    // Step 4: Build system prompt with RAG context
    const systemPrompt = buildSystemPrompt(feature, ragContext, citations.length > 0);

    // Step 5: Generate response with GPT
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      // [EF-RESILIENCE-20260308-051500] gpt-4o-mini: restored standard params
      temperature: 0.7,
      max_tokens: 1000,
    });

    const reply = completion.choices[0]?.message?.content || '응답을 생성하지 못했습니다.';

    // [ZERO-COST-PIPELINE-2026-03-07] 신선도 정보 계산
    const freshnessInfo = buildFreshnessInfo(citations);

    return new Response(
      JSON.stringify({
        reply,
        citations: citations.length > 0 ? citations : undefined,
        sources_count: citations.length,
        model: DEFAULT_MODEL,
        rag_used: citations.length > 0,
        freshness_info: freshnessInfo,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'RAG 쿼리 중 오류';
    console.error('rag-query error:', error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildSystemPrompt(
  feature: string,
  ragContext: string,
  hasContext: boolean
): string {
  const basePrompt = `당신은 한국 결혼 준비 전문 AI 어드바이저 "웨딩셈"입니다.
응답 규칙:
- 한국어로 응답합니다
- 정확한 수치와 출처를 함께 제시합니다
- 친근하되 전문적인 톤을 유지합니다
- 불확실한 정보는 명확히 "확인이 필요합니다"라고 표시합니다

## 중요: 답변 형식 규칙
모든 답변은 반드시 정확히 3개의 불릿 포인트(•)로 구성하세요.
- 첫 번째 불릿: 핵심 답변 (질문에 대한 직접적인 답)
- 두 번째 불릿: 비용/일정 관련 구체적 정보 (금액, 기간, 시기 등)
- 세 번째 불릿: 실용적 팁 또는 주의사항
3개를 초과하거나 미달하지 마세요. 각 불릿은 '•' 기호로 시작하세요.`;

  if (hasContext) {
    return `${basePrompt}

다음은 검색된 관련 정보입니다. 이 정보를 기반으로 질문에 답변하세요.
답변 끝에 참고한 출처를 "[출처]" 형태로 표시해주세요.

--- 검색된 정보 ---
${ragContext}
--- 검색된 정보 끝 ---

중요: 검색된 정보에 없는 내용은 추측하지 마세요.`;
  }

  return `${basePrompt}

현재 검색된 관련 데이터가 없습니다. 일반적인 한국 결혼 준비 지식을 기반으로 답변해주세요.
정확한 가격이나 통계가 필요한 질문은 "최신 데이터 확인이 필요합니다"라고 안내해주세요.`;
}

// [ZERO-COST-PIPELINE-2026-03-07] 신선도 정보 빌드
interface FreshnessInfo {
  latest_source_time: string | null;
  freshness_label: string;
  avg_freshness_score: number;
}

function buildFreshnessInfo(citations: Citation[]): FreshnessInfo | null {
  if (!citations || citations.length === 0) return null;

  // 가장 최근 crawled_at 찾기
  const crawledDates = citations
    .map((c) => c.crawled_at)
    .filter((d): d is string => !!d)
    .map((d) => new Date(d))
    .filter((d) => !isNaN(d.getTime()));

  const latestTime = crawledDates.length > 0
    ? new Date(Math.max(...crawledDates.map((d) => d.getTime())))
    : null;

  // 평균 freshness_score
  const scores = citations
    .map((c) => c.freshness_score)
    .filter((s): s is number => s !== undefined && s !== null);
  const avgScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 0;

  // 신선도 라벨 생성
  const label = latestTime
    ? formatFreshnessLabel(latestTime)
    : '데이터 수집 시각 미확인';

  return {
    latest_source_time: latestTime ? latestTime.toISOString() : null,
    freshness_label: label,
    avg_freshness_score: Math.round(avgScore * 100) / 100,
  };
}

function formatFreshnessLabel(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // 시간 포맷 (HH:MM)
  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  if (diffMinutes < 60) {
    return `방금 전(${timeStr}) 업데이트된 정보`;
  }
  if (diffHours < 24) {
    return `오늘 ${timeStr} 업데이트된 정보`;
  }
  if (diffDays === 1) {
    return `어제 ${timeStr} 업데이트된 정보`;
  }
  if (diffDays < 7) {
    return `${diffDays}일 전 업데이트된 정보`;
  }
  if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)}주 전 업데이트된 정보`;
  }
  return `${Math.floor(diffDays / 30)}개월 전 업데이트된 정보`;
}

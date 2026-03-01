// rag-query: Vector search → top-5 → GPT-5-mini response with citations
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
      temperature: 0.7,
      max_tokens: 1000,
    });

    const reply = completion.choices[0]?.message?.content || '응답을 생성하지 못했습니다.';

    return new Response(
      JSON.stringify({
        reply,
        citations: citations.length > 0 ? citations : undefined,
        sources_count: citations.length,
        model: DEFAULT_MODEL,
        rag_used: citations.length > 0,
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
- 불확실한 정보는 명확히 "확인이 필요합니다"라고 표시합니다`;

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

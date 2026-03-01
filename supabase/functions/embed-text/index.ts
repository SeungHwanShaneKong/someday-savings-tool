// embed-text: Convert text to vector embedding using OpenAI text-embedding-3-small
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import OpenAI from 'https://esm.sh/openai@4.77.0';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')!,
});

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSION = 1536;

interface EmbedRequest {
  texts: string[];
  metadata?: Record<string, unknown>[];
  source_type?: string;
  region?: string;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth check
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: '인증이 필요합니다' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: '유효하지 않은 토큰입니다' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const body: EmbedRequest = await req.json();
    const { texts, metadata = [], source_type = 'user_generated', region } = body;

    if (!texts || texts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'texts 배열이 필요합니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Batch limit
    if (texts.length > 100) {
      return new Response(
        JSON.stringify({ error: '한 번에 최대 100개까지 처리 가능합니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate embeddings
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
    });

    const embeddings = response.data.map((item) => item.embedding);

    // Generate content hashes for dedup (SHA-256, Deno doesn't support MD5)
    const encoder = new TextEncoder();
    const hashes = await Promise.all(
      texts.map(async (text) => {
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      })
    );

    // Upsert into knowledge_embeddings
    const records = texts.map((text, i) => ({
      content: text,
      content_hash: hashes[i],
      metadata: metadata[i] || {},
      embedding: JSON.stringify(embeddings[i]),
      source_type,
      region: region || null,
      freshness_score: 1.0,
      is_active: true,
      updated_at: new Date().toISOString(),
    }));

    // Use upsert to handle duplicates via content_hash
    const { data: upserted, error: dbError } = await supabase
      .from('knowledge_embeddings')
      .upsert(records, { onConflict: 'content_hash' })
      .select('id, content_hash');

    if (dbError) {
      console.error('DB upsert error:', dbError);
      return new Response(
        JSON.stringify({ error: 'DB 저장 오류', details: dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: texts.length,
        records: upserted?.length || 0,
        usage: response.usage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '임베딩 생성 중 오류';
    console.error('embed-text error:', error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

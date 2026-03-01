-- Phase 3-A: Vector Search with pgvector for RAG-based Q&A
-- Requires: pgvector extension (already available on Supabase)

-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. knowledge_embeddings: Vectorized knowledge chunks for RAG search
CREATE TABLE public.knowledge_embeddings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  content_hash text NOT NULL,          -- MD5 hash for dedup
  metadata jsonb NOT NULL DEFAULT '{}', -- {source, category, region, date, url}
  embedding vector(1536) NOT NULL,     -- OpenAI text-embedding-3-small dimension
  source_type text NOT NULL,           -- 'kostat','health_institute','platform_crawl','user_generated'
  region text,                         -- Regional segmentation (BRD §5.2)
  freshness_score float DEFAULT 1.0,   -- Data freshness (decays over time)
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(content_hash)                 -- Prevent duplicate data (BRD §5.2)
);

-- IVFFlat index for cosine similarity search
CREATE INDEX knowledge_embeddings_idx ON public.knowledge_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Additional indexes
CREATE INDEX idx_knowledge_embeddings_source ON public.knowledge_embeddings(source_type);
CREATE INDEX idx_knowledge_embeddings_region ON public.knowledge_embeddings(region);
CREATE INDEX idx_knowledge_embeddings_active ON public.knowledge_embeddings(is_active) WHERE is_active = true;

-- 2. crawl_sources: Manages crawling targets and schedules
CREATE TABLE public.crawl_sources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  url_pattern text NOT NULL,
  crawl_interval_hours integer NOT NULL DEFAULT 72,  -- 3 days default
  last_crawled_at timestamptz,
  is_active boolean DEFAULT true,
  config jsonb DEFAULT '{}',           -- {user_agent, delay_ms, proxy, selectors}
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.knowledge_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawl_sources ENABLE ROW LEVEL SECURITY;

-- Knowledge embeddings: admin full access, authenticated users can read active
CREATE POLICY "Admin manages embeddings"
  ON public.knowledge_embeddings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users read active embeddings"
  ON public.knowledge_embeddings FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

-- Crawl sources: admin only
CREATE POLICY "Admin manages crawl sources"
  ON public.crawl_sources FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Vector similarity search function (used by rag-query Edge Function)
CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  source_type text,
  region text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    ke.id,
    ke.content,
    ke.metadata,
    ke.source_type,
    ke.region,
    1 - (ke.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_embeddings ke
  WHERE ke.is_active = true
    AND 1 - (ke.embedding <=> query_embedding) > match_threshold
  ORDER BY (ke.embedding <=> query_embedding) ASC
  LIMIT match_count;
$$;

-- Seed initial crawl sources
INSERT INTO public.crawl_sources (name, url_pattern, crawl_interval_hours, config) VALUES
  ('통계청 혼인통계', 'https://kostat.go.kr/marriage', 720, '{"type": "seed", "manual": true}'),
  ('한국보건사회연구원', 'https://kihasa.re.kr/reports', 720, '{"type": "seed", "manual": true}'),
  ('더웨딩 견적', 'https://thewedding.co.kr/estimates', 72, '{"type": "auto", "delay_ms": 3000}'),
  ('웨딩의여신 후기', 'https://weddinggoddess.co.kr/reviews', 72, '{"type": "auto", "delay_ms": 3000}');

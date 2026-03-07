-- [ZERO-COST-PIPELINE-2026-03-07] 크롤 파이프라인 강화 마이그레이션
-- 1. 새 크롤 소스 추가 (네이버 카페, 다음 카페, 웨딩 블로그)
-- 2. 기존 auto 소스 크롤 주기 72h → 8h 변경
-- 3. knowledge_embeddings에 url_hash 컬럼 추가

-- ─── 1. 새 크롤 소스 추가 ───
INSERT INTO public.crawl_sources (name, url_pattern, crawl_interval_hours, config) VALUES
  ('네이버 웨딩카페', 'https://cafe.naver.com/weddingnavi', 8,
   '{"type":"auto","delay_ms":5000,"region":"서울","selectors":{"content":".article_viewer"}}'),
  ('다음 결혼준비카페', 'https://cafe.daum.net/weddingcafe', 8,
   '{"type":"auto","delay_ms":5000,"region":"서울","selectors":{"content":".article_view"}}'),
  ('웨딩홀 정보 블로그', 'https://blog.naver.com/PostList.nhn?blogId=weddinghall', 8,
   '{"type":"auto","delay_ms":5000,"selectors":{"content":".se-main-container"}}'),
  ('결혼준비 후기', 'https://cafe.naver.com/weddingbest', 8,
   '{"type":"auto","delay_ms":5000,"region":"전국","selectors":{"content":".article_viewer"}}'),
  ('한국결혼문화연구소', 'https://kwri.or.kr/publications', 8,
   '{"type":"auto","delay_ms":3000,"selectors":{"content":".board-view"}}')
ON CONFLICT DO NOTHING;

-- ─── 2. 기존 auto 소스 크롤 주기 업데이트 (3일 → 8시간) ───
UPDATE public.crawl_sources
SET crawl_interval_hours = 8
WHERE config->>'type' = 'auto'
  AND crawl_interval_hours > 8;

-- ─── 3. knowledge_embeddings에 url_hash 컬럼 추가 ───
ALTER TABLE public.knowledge_embeddings
  ADD COLUMN IF NOT EXISTS url_hash text;

CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_url_hash
  ON public.knowledge_embeddings(url_hash)
  WHERE url_hash IS NOT NULL;

-- 크롤 작업에 트리거 소스 정보 추가
ALTER TABLE public.crawl_jobs
  ADD COLUMN IF NOT EXISTS trigger_type text DEFAULT 'manual';

COMMENT ON COLUMN public.crawl_jobs.trigger_type IS
  'Trigger source: manual, cron, github_actions';

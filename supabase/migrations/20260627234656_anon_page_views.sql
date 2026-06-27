-- [CL-ANONVISIT-TABLE-20260627-234656] 익명 방문 집계 전용 테이블 (상관관계 0 · PII 0 · 사용자 적용)
--
-- 배경: page_views 는 RLS 상 로그인 유저만 기록(20260214152805) → 관리자 대시보드의 방문/PV/유입/체류 차트가
--   실제 트래픽(랜딩·SEO·공유 viewer 등 대다수 익명)을 0으로 표시. GA4 엔 있으나 자체 대시보드엔 없음.
-- 설계(프라이버시): user_id/IP/UA/duration 컬럼 없음. session_id 는 비영구 랜덤 UUID(sessionStorage) —
--   사용자/세션 간 상관 불가. referrer 는 origin 만. 쓰기는 Edge(track-visit) service_role 만(직접 anon INSERT 미개방).
-- 거버넌스: is_synthetic 으로 합성/테스트 데이터 격리(집계 RPC 기본 제외).
-- realtime: 준실시간 폴링 사용 → supabase_realtime publication 미추가(WAL 부하/실시간 읽기표면 0).

CREATE TABLE IF NOT EXISTS public.anon_page_views (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path    text NOT NULL,
  session_id   uuid NOT NULL,
  referrer     text,
  utm_source   text,
  is_synthetic boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.anon_page_views ENABLE ROW LEVEL SECURITY;
-- RLS 정책 0개 = anon/authenticated 직접 접근 불가. 쓰기=service_role(Edge), 읽기=DEFINER RPC 만.
REVOKE ALL ON public.anon_page_views FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_anon_pv_created        ON public.anon_page_views (created_at);
CREATE INDEX IF NOT EXISTS idx_anon_pv_utmsrc_created ON public.anon_page_views (utm_source, created_at);
CREATE INDEX IF NOT EXISTS idx_anon_pv_path_created   ON public.anon_page_views (page_path, created_at);

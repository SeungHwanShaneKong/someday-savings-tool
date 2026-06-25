-- [CL-ACQ-VISIT-20260623-230113] 방문 기준 유입경로 집계 (개선1, 사용자 적용)
--
-- 배경: page_views 는 매 방문 referrer(origin)+utm_source(분류)를 저장하나 어떤 집계도 읽지 않았다(R4 감사).
--   first-touch(가입자 기준, admin_acquisition_breakdown)와 별개로, '매 방문(직전 페이지/소스)'을 카운트한다.
-- 안전: SECURITY DEFINER + has_role(admin) 게이트(비관리자 빈셋) · search_path 고정 · ADMIN 본인 방문 제외 · 멱등.

CREATE OR REPLACE FUNCTION public.admin_visit_source_breakdown(p_start timestamptz, p_end timestamptz)
RETURNS TABLE(source text, visits integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(pv.utm_source, ''), 'unknown') AS source, COUNT(*)::int AS visits
  FROM public.page_views pv
  WHERE public.has_role(auth.uid(), 'admin')
    AND pv.user_id IS DISTINCT FROM 'f628fbf6-5f2f-4ca1-86e0-21eb2395bc40'::uuid
    AND pv.created_at >= p_start
    AND pv.created_at <= p_end
  GROUP BY 1
  ORDER BY 2 DESC
$$;
REVOKE ALL ON FUNCTION public.admin_visit_source_breakdown(timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_visit_source_breakdown(timestamptz, timestamptz) TO authenticated;

-- 이제 집계가 utm_source 를 읽으므로 인덱스 재추가(R3에서 unused 로 drop 했던 것 — 기간+소스 복합).
CREATE INDEX IF NOT EXISTS idx_page_views_utmsrc_created
  ON public.page_views (utm_source, created_at);

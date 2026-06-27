-- [CL-ANONVISIT-RPC-20260627-234657] 익명 방문 집계 RPC 3종 (사용자 적용)
--
-- 스타일: 기존 admin_visit_* 와 동일 — SECURITY DEFINER + has_role(admin) 게이트(비관리자 빈셋) +
--   search_path 고정 + anon REVOKE / authenticated GRANT + is_synthetic=false(거버넌스, p_include_synthetic dev 옵트인).
-- 소스: anon_page_views(20260627234656). page_views(로그인) 와 별개의 '전체 방문(익명 포함)' 집계.

-- (1) 일자별 트래픽 추이 {day, views, sessions}
-- [CL-AUDIT2-R6-TZ-20260628] 일경계는 서비스 로컬(Asia/Seoul) 기준 — 클라이언트 page_views 추이(로컬 startOfDay)와
--   동일 일경계로 정렬(F11: UTC vs 로컬 불일치 제거). 라벨은 클라가 로컬-자정 파싱으로 안전 렌더(F10).
CREATE OR REPLACE FUNCTION public.admin_anon_traffic_trend(
  p_start timestamptz, p_end timestamptz, p_include_synthetic boolean DEFAULT false)
RETURNS TABLE(day date, views integer, sessions integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (a.created_at AT TIME ZONE 'Asia/Seoul')::date AS day,
         COUNT(*)::int AS views,
         COUNT(DISTINCT a.session_id)::int AS sessions
  FROM public.anon_page_views a
  WHERE public.has_role(auth.uid(), 'admin')
    AND (p_include_synthetic OR a.is_synthetic = false)
    AND a.created_at >= p_start
    AND a.created_at <= p_end
  GROUP BY 1
  ORDER BY 1
$$;
REVOKE ALL ON FUNCTION public.admin_anon_traffic_trend(timestamptz, timestamptz, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_anon_traffic_trend(timestamptz, timestamptz, boolean) TO authenticated;

-- (2) 소스 분포 {source, visits}
CREATE OR REPLACE FUNCTION public.admin_anon_source_breakdown(
  p_start timestamptz, p_end timestamptz, p_include_synthetic boolean DEFAULT false)
RETURNS TABLE(source text, visits integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(a.utm_source, ''), 'unknown') AS source, COUNT(*)::int AS visits
  FROM public.anon_page_views a
  WHERE public.has_role(auth.uid(), 'admin')
    AND (p_include_synthetic OR a.is_synthetic = false)
    AND a.created_at >= p_start
    AND a.created_at <= p_end
  GROUP BY 1
  ORDER BY 2 DESC
$$;
REVOKE ALL ON FUNCTION public.admin_anon_source_breakdown(timestamptz, timestamptz, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_anon_source_breakdown(timestamptz, timestamptz, boolean) TO authenticated;

-- (3) 인기 페이지 {page_path, views}
CREATE OR REPLACE FUNCTION public.admin_anon_top_pages(
  p_start timestamptz, p_end timestamptz, p_limit integer DEFAULT 10, p_include_synthetic boolean DEFAULT false)
RETURNS TABLE(page_path text, views integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.page_path, COUNT(*)::int AS views
  FROM public.anon_page_views a
  WHERE public.has_role(auth.uid(), 'admin')
    AND (p_include_synthetic OR a.is_synthetic = false)
    AND a.created_at >= p_start
    AND a.created_at <= p_end
  GROUP BY 1
  ORDER BY 2 DESC
  LIMIT GREATEST(1, LEAST(p_limit, 100))
$$;
REVOKE ALL ON FUNCTION public.admin_anon_top_pages(timestamptz, timestamptz, integer, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_anon_top_pages(timestamptz, timestamptz, integer, boolean) TO authenticated;

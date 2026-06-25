-- [CL-IMPROVE2-VISITHIST-20260625] 방문 횟수별 유저 수 히스토그램 (개선2, 사용자 적용)
--
-- 배경: 관리자 대시보드에 '정확히 N회 방문한 가입 유저 수'(1·2·…·9·10+) 분포를 막대로 표시.
--   page_views 는 로그인 유저만 user_id 기록 → 본 집계는 로그인 유저의 방문 빈도 분포다(익명 제외).
-- 안전: SECURITY DEFINER + has_role(admin) 게이트(비관리자 빈셋) · search_path 고정 · ADMIN 본인 제외 · 멱등.

CREATE OR REPLACE FUNCTION public.admin_visit_histogram(p_start timestamptz, p_end timestamptz)
RETURNS TABLE(visits integer, user_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH per_user AS (
    SELECT pv.user_id, COUNT(*)::int AS v
    FROM public.page_views pv
    WHERE public.has_role(auth.uid(), 'admin')
      AND pv.user_id IS NOT NULL
      AND pv.user_id IS DISTINCT FROM 'f628fbf6-5f2f-4ca1-86e0-21eb2395bc40'::uuid
      AND pv.created_at >= p_start
      AND pv.created_at <= p_end
    GROUP BY pv.user_id
  )
  SELECT LEAST(v, 10) AS visits, COUNT(*)::int AS user_count  -- 10+ 는 10으로 클램프
  FROM per_user
  GROUP BY LEAST(v, 10)
  ORDER BY 1
$$;
REVOKE ALL ON FUNCTION public.admin_visit_histogram(timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_visit_histogram(timestamptz, timestamptz) TO authenticated;

-- per-user 집계 가속(유저별 방문 수 그룹핑).
CREATE INDEX IF NOT EXISTS idx_page_views_user_created
  ON public.page_views (user_id, created_at);

-- [CL-IMPROVE3-REFJOINS-20260625] 초대(추천 링크) 수락 합류 추이 (개선3, 사용자 적용)
--
-- 배경: '파트너/추천 링크 전달로 들어온 사람'을 카운트. 익명 /invite 방문은 page_views 미기록이라
--   방문-단계 추정은 불가 → '초대 수락 = 협업자 합류'(budget_collaborators row)를 확정 신호로 일자별 집계.
--   각 row 는 초대로 합류한 사람(invited_by ≠ user_id)이므로 본인 소유 예산은 자연 제외.
-- 안전: SECURITY DEFINER + has_role(admin) 게이트(비관리자 빈셋) · search_path 고정 · ADMIN 본인 제외 · 멱등.

CREATE OR REPLACE FUNCTION public.admin_referral_joins(p_start timestamptz, p_end timestamptz)
RETURNS TABLE(day date, joins integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (bc.created_at AT TIME ZONE 'UTC')::date AS day, COUNT(*)::int AS joins
  FROM public.budget_collaborators bc
  WHERE public.has_role(auth.uid(), 'admin')
    AND bc.user_id IS DISTINCT FROM 'f628fbf6-5f2f-4ca1-86e0-21eb2395bc40'::uuid
    AND bc.created_at >= p_start
    AND bc.created_at <= p_end
  GROUP BY 1
  ORDER BY 1
$$;
REVOKE ALL ON FUNCTION public.admin_referral_joins(timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_referral_joins(timestamptz, timestamptz) TO authenticated;

-- 일자별 집계 가속.
CREATE INDEX IF NOT EXISTS idx_budget_collaborators_created
  ON public.budget_collaborators (created_at);

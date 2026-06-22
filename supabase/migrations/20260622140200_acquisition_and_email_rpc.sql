-- [CL-ACQ-EMAIL-RPC-20260622-233012] 유입 집계 RPC + 파트너 이메일 RPC (3단계/4)
--
-- ⚠️ 적용 순서: 20260622140100(profiles.first_source) 이후. (check_function_bodies 가 컬럼 존재를 검증)
-- 안전: 전부 CREATE OR REPLACE(멱등) · SECURITY DEFINER · search_path 고정 · 접근 게이트 내장.

-- ── (개선1) 관리자 유입경로 집계 — 가입자(first_source)별 인원. 개별 PII 미반환(집계만) ──
-- profiles RLS 가 소유자 전용이라 관리자가 타인 프로필을 직접 못 읽음 → 집계 전용 DEFINER RPC.
-- 비관리자가 호출하면 WHERE has_role(admin) 가 거짓 → 빈 결과(권한 누출 0).
CREATE OR REPLACE FUNCTION public.admin_acquisition_breakdown()
RETURNS TABLE(source text, users integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(p.first_source, ''), 'unknown') AS source, COUNT(*)::int AS users
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin')
  GROUP BY 1
  ORDER BY 2 DESC
$$;
REVOKE ALL ON FUNCTION public.admin_acquisition_breakdown() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_acquisition_breakdown() TO authenticated;

-- ── (개선5) 파트너 이메일 + 닉네임 — 동일 예산 협업자에게만 노출(can_edit_budget 게이트) ──
-- 기존 get_budget_participants(display_name 만)는 건드리지 않고 신규 RPC 추가(드리프트/반환타입 충돌 0).
CREATE OR REPLACE FUNCTION public.get_budget_participants_email(p_budget_id uuid)
RETURNS TABLE(user_id uuid, role text, display_name text, email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- 접근 경계: 이 예산을 편집할 수 있는 사람만(소유자/협업자). 그 외 빈 결과.
  IF NOT public.can_edit_budget(p_budget_id, auth.uid()) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT u.uid AS user_id, u.role AS role, pr.display_name, au.email::text AS email
  FROM (
    SELECT b.user_id AS uid, 'owner'::text AS role
      FROM public.budgets b WHERE b.id = p_budget_id
    UNION
    SELECT bc.user_id AS uid, bc.role::text AS role
      FROM public.budget_collaborators bc WHERE bc.budget_id = p_budget_id
  ) u
  LEFT JOIN public.profiles pr ON pr.user_id = u.uid
  LEFT JOIN auth.users au ON au.id = u.uid;
END $$;
REVOKE ALL ON FUNCTION public.get_budget_participants_email(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_budget_participants_email(uuid) TO authenticated;

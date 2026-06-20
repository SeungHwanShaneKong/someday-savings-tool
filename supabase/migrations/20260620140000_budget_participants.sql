-- [CL-COEDIT-PARTICIPANTS-20260620] 공동편집 참여자(오너+협업자) 이름 조회 RPC (최소권한)
--
-- 목적: CollaboratorManager 가 "파트너 (editor)" generic 대신 실제 이름(display_name)을 표시.
-- 문제: profiles SELECT RLS 는 본인 전용(auth.uid()=user_id) → 협업자/오너의 display_name 직접 조회 불가.
-- 해결: SECURITY DEFINER RPC 가 caller 의 편집권(can_edit_budget)을 확인한 뒤에만 해당 예산의
--       참여자(오너 1명 + 협업자들)의 display_name 을 반환. 참여자가 아닌 사용자에겐 빈 결과(이름 노출 0).
-- 안전: 멱등(CREATE OR REPLACE) · anon REVOKE · authenticated 만 EXECUTE · 최소권한(예산 참여자만).
-- 전제: public.can_edit_budget(uuid, uuid) 존재(20260620120000). 미적용 환경에선 이 마이그 적용 전까지
--       클라가 budget_collaborators 폴백으로 동작('파트너' 표시) → 앱 무중단.

CREATE OR REPLACE FUNCTION public.get_budget_participants(p_budget_id uuid)
RETURNS TABLE(user_id uuid, role text, display_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- 오너
  SELECT b.user_id, 'owner'::text AS role, p.display_name
  FROM public.budgets b
  LEFT JOIN public.profiles p ON p.user_id = b.user_id
  WHERE b.id = p_budget_id
    AND public.can_edit_budget(p_budget_id, auth.uid())
  UNION ALL
  -- 협업자
  SELECT bc.user_id, bc.role::text AS role, p.display_name
  FROM public.budget_collaborators bc
  LEFT JOIN public.profiles p ON p.user_id = bc.user_id
  WHERE bc.budget_id = p_budget_id
    AND public.can_edit_budget(p_budget_id, auth.uid())
$$;

REVOKE ALL ON FUNCTION public.get_budget_participants(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_budget_participants(uuid) TO authenticated;

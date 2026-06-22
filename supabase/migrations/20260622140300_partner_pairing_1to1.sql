-- [CL-PARTNER-1TO1-20260622-233012] 전역 1:1 파트너 강제 + 해지(소유자 보관) + 자동공유 (4단계/4)
--
-- 목표(개선6): 한 계정은 동시에 단 1명과만 파트너. 다른 사람과 공동편집하려면 기존 파트너를 먼저 '해지'.
--   해지 시 각 예산은 소유자에게 그대로 남고(소유자 보관) 상대 접근만 끊긴다.
-- 파트너 정의: (내 소유 예산의 협업자) ∪ (내가 협업자인 예산의 소유자) = 상대 사용자 집합. 1:1 = 크기 ≤ 1.
-- 안전: 전부 SECURITY DEFINER(내부에서 auth.uid() 신원 검증) · search_path 고정 · CREATE OR REPLACE 멱등.
--   accept RPC 는 드리프트 방어 위해 시그니처 무관 DROP 후 재생성(기존 20260620120000 패턴 답습).
--   레거시 다중 협업자 데이터는 grandfather(신규 accept 만 1:1 차단).

-- ── 현재 파트너 1인(결정론적) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_partner_of(p_uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT other_uid FROM (
    -- 내가 소유 → 협업자들
    SELECT bc.user_id AS other_uid
      FROM public.budgets b
      JOIN public.budget_collaborators bc ON bc.budget_id = b.id
     WHERE b.user_id = p_uid AND bc.user_id <> p_uid
    UNION
    -- 내가 협업자 → 소유자들
    SELECT b.user_id AS other_uid
      FROM public.budget_collaborators bc
      JOIN public.budgets b ON b.id = bc.budget_id
     WHERE bc.user_id = p_uid AND b.user_id <> p_uid
  ) s
  ORDER BY other_uid
  LIMIT 1
$$;

-- ── 내 파트너(닉네임+이메일) — 클라 표시용. 파트너 없으면 0행 ──
CREATE OR REPLACE FUNCTION public.get_my_partner()
RETURNS TABLE(user_id uuid, display_name text, email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_partner uuid := public.current_partner_of(auth.uid());
BEGIN
  IF v_partner IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT v_partner,
         (SELECT pr.display_name FROM public.profiles pr WHERE pr.user_id = v_partner),
         (SELECT au.email::text FROM auth.users au WHERE au.id = v_partner);
END $$;

-- ── 파트너 해지 — 양방향 협업자 링크만 삭제(예산 본문은 소유자 보관) ──
CREATE OR REPLACE FUNCTION public.release_partner()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_partner uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN json_build_object('ok', false, 'error', 'not_authenticated'); END IF;
  v_partner := public.current_partner_of(v_uid);
  IF v_partner IS NULL THEN RETURN json_build_object('ok', true, 'status', 'no_partner'); END IF;
  -- 내 소유 예산에서 파트너 제거
  DELETE FROM public.budget_collaborators bc
    USING public.budgets b
   WHERE bc.budget_id = b.id AND b.user_id = v_uid AND bc.user_id = v_partner;
  -- 파트너 소유 예산에서 나 제거
  DELETE FROM public.budget_collaborators bc
    USING public.budgets b
   WHERE bc.budget_id = b.id AND b.user_id = v_partner AND bc.user_id = v_uid;
  RETURN json_build_object('ok', true, 'status', 'released', 'partner', v_partner);
END $$;

-- ── 예산을 현재 파트너에게 자동 공유(우리 워크스페이스 일관성) — 소유자만, 파트너 없으면 no-op ──
CREATE OR REPLACE FUNCTION public.share_budget_with_partner(p_budget_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_partner uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN json_build_object('ok', false, 'error', 'not_authenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.budgets WHERE id = p_budget_id AND user_id = v_uid) THEN
    RETURN json_build_object('ok', false, 'error', 'not_owner');
  END IF;
  v_partner := public.current_partner_of(v_uid);
  IF v_partner IS NULL THEN RETURN json_build_object('ok', true, 'status', 'no_partner'); END IF;
  INSERT INTO public.budget_collaborators (budget_id, user_id, invited_by, role)
  VALUES (p_budget_id, v_partner, v_uid, 'editor')
  ON CONFLICT (budget_id, user_id) DO NOTHING;
  RETURN json_build_object('ok', true, 'status', 'shared', 'partner', v_partner);
END $$;

REVOKE ALL ON FUNCTION public.current_partner_of(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_my_partner() FROM anon;
REVOKE ALL ON FUNCTION public.release_partner() FROM anon;
REVOKE ALL ON FUNCTION public.share_budget_with_partner(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_partner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_partner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.share_budget_with_partner(uuid) TO authenticated;

-- ── accept RPC 재작성: 1:1 가드 삽입 (드리프트 방어 = 시그니처 무관 전체 DROP 후 CREATE) ──
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT oid::regprocedure AS sig FROM pg_proc
           WHERE proname='accept_budget_invitation' AND pronamespace='public'::regnamespace
  LOOP EXECUTE 'DROP FUNCTION '||r.sig::text||' CASCADE'; END LOOP;
END $$;
CREATE FUNCTION public.accept_budget_invitation(p_token text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv public.budget_invitations%ROWTYPE;
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_my_partner uuid;
  v_owner_partner uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO inv FROM public.budget_invitations WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  -- 본인이 소유한 예산의 초대는 수락 불가
  IF EXISTS (SELECT 1 FROM public.budgets WHERE id = inv.budget_id AND user_id = v_uid) THEN
    RETURN json_build_object('ok', false, 'error', 'owner_cannot_accept');
  END IF;

  -- 이미 협업자면 멱등 성공 (1:1 가드보다 먼저 — 기존 파트너십 재수락 허용)
  IF EXISTS (SELECT 1 FROM public.budget_collaborators WHERE budget_id = inv.budget_id AND user_id = v_uid) THEN
    RETURN json_build_object('ok', true, 'status', 'already_member', 'budget_id', inv.budget_id);
  END IF;

  -- [CL-PARTNER-1TO1-20260622-233012] 전역 1:1 가드 — 신규 결합에만 적용.
  --  수락자/소유자 중 누구든 '다른 사람'과 이미 paired면 거부(같은 사람과의 다중 예산 결합은 허용).
  v_owner := (SELECT user_id FROM public.budgets WHERE id = inv.budget_id);
  v_my_partner := public.current_partner_of(v_uid);
  v_owner_partner := public.current_partner_of(v_owner);
  IF v_my_partner IS NOT NULL AND v_my_partner <> v_owner THEN
    RETURN json_build_object('ok', false, 'error', 'already_paired');
  END IF;
  IF v_owner_partner IS NOT NULL AND v_owner_partner <> v_uid THEN
    RETURN json_build_object('ok', false, 'error', 'owner_already_paired');
  END IF;

  IF inv.status::text <> 'pending' THEN
    RETURN json_build_object('ok', false, 'error', 'already_' || inv.status::text);
  END IF;

  IF inv.expires_at < now() THEN
    UPDATE public.budget_invitations SET status = 'expired' WHERE id = inv.id;
    RETURN json_build_object('ok', false, 'error', 'expired');
  END IF;

  INSERT INTO public.budget_collaborators (budget_id, user_id, invited_by, role)
  VALUES (inv.budget_id, v_uid, inv.invited_by, inv.role)
  ON CONFLICT (budget_id, user_id) DO NOTHING;

  UPDATE public.budget_invitations SET status = 'accepted', responded_at = now() WHERE id = inv.id;

  RETURN json_build_object('ok', true, 'status', 'accepted', 'budget_id', inv.budget_id, 'role', inv.role);
END $$;
REVOKE ALL ON FUNCTION public.accept_budget_invitation(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_budget_invitation(text) TO authenticated;

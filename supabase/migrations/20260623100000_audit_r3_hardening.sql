-- [CL-AUDIT-R3-DB-20260623-000000] 적대적 감사 R3 — DB 레이어 근본수정 5종 (사용자 적용)
--
-- F1 1:1 페어링 TOCTOU: accept 가 초대행만 잠그고 파트너 상태는 락 없이 읽어, 동시 수락 시 N자 페어링 영구 생성 가능.
--    → 참여 당사자(수락자·소유자) UID 에 advisory xact lock(정렬 순서로 데드락 방지) 후 파트너 재조회 → 직렬화.
-- F2 viewer 비대칭: current_partner_of 가 모든 role 을 파트너로 셈(can_edit_budget 은 editor+). → editor+ 로 통일.
-- F3 유입집계 정합: admin_acquisition_breakdown 이 관리자 본인 프로필을 제외 안 함(타 KPI 는 전부 제외). → admin 제외.
-- F4 해지 후 토큰 잔존: release_partner 가 pending 초대를 안 지워 유출 토큰 재진입 가능. → 양측 pending 초대 만료.
-- perf-P2 무용 인덱스: idx_page_views_utm_source 는 어떤 집계도 읽지 않음(집계는 profiles.first_source). → 제거.
-- 안전: 전부 CREATE OR REPLACE / DROP IF EXISTS 멱등 · SECURITY DEFINER · search_path 고정. 적용 순서 무관(자기완결).

-- ── F2: 파트너 정의를 editor+ 로 통일(viewer 유령 슬롯 제거) ──
CREATE OR REPLACE FUNCTION public.current_partner_of(p_uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT other_uid FROM (
    SELECT bc.user_id AS other_uid
      FROM public.budgets b
      JOIN public.budget_collaborators bc ON bc.budget_id = b.id
     WHERE b.user_id = p_uid AND bc.user_id <> p_uid AND bc.role IN ('owner','editor')
    UNION
    SELECT b.user_id AS other_uid
      FROM public.budget_collaborators bc
      JOIN public.budgets b ON b.id = bc.budget_id
     WHERE bc.user_id = p_uid AND b.user_id <> p_uid AND bc.role IN ('owner','editor')
  ) s
  ORDER BY other_uid
  LIMIT 1
$$;

-- ── F4: 해지 시 양측 pending 초대도 만료(유출 토큰 재진입 차단) ──
CREATE OR REPLACE FUNCTION public.release_partner()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_partner uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN json_build_object('ok', false, 'error', 'not_authenticated'); END IF;
  v_partner := public.current_partner_of(v_uid);
  IF v_partner IS NULL THEN RETURN json_build_object('ok', true, 'status', 'no_partner'); END IF;
  DELETE FROM public.budget_collaborators bc USING public.budgets b
   WHERE bc.budget_id = b.id AND b.user_id = v_uid AND bc.user_id = v_partner;
  DELETE FROM public.budget_collaborators bc USING public.budgets b
   WHERE bc.budget_id = b.id AND b.user_id = v_partner AND bc.user_id = v_uid;
  -- [CL-AUDIT-R3] 양측 소유 예산의 잔존 pending 초대 만료(해지 후 유출 토큰 재진입 차단)
  UPDATE public.budget_invitations bi SET status = 'expired'
    FROM public.budgets b
   WHERE bi.budget_id = b.id AND bi.status = 'pending' AND b.user_id IN (v_uid, v_partner);
  RETURN json_build_object('ok', true, 'status', 'released', 'partner', v_partner);
END $$;

-- ── F3: 유입경로 집계에서 관리자 프로필 제외(타 KPI 와 합계 정합) ──
CREATE OR REPLACE FUNCTION public.admin_acquisition_breakdown()
RETURNS TABLE(source text, users integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(p.first_source, ''), 'unknown') AS source, COUNT(*)::int AS users
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin')
    AND p.user_id NOT IN (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin')
  GROUP BY 1
  ORDER BY 2 DESC
$$;
REVOKE ALL ON FUNCTION public.admin_acquisition_breakdown() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_acquisition_breakdown() TO authenticated;

-- ── F1: accept 에 당사자 advisory lock + 락 후 파트너 재조회(동시 수락 직렬화) ──
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

  IF EXISTS (SELECT 1 FROM public.budgets WHERE id = inv.budget_id AND user_id = v_uid) THEN
    RETURN json_build_object('ok', false, 'error', 'owner_cannot_accept');
  END IF;

  -- 이미 협업자면 멱등 성공(1:1 가드보다 먼저 — 기존 파트너십 재수락 허용)
  IF EXISTS (SELECT 1 FROM public.budget_collaborators WHERE budget_id = inv.budget_id AND user_id = v_uid) THEN
    RETURN json_build_object('ok', true, 'status', 'already_member', 'budget_id', inv.budget_id);
  END IF;

  v_owner := (SELECT user_id FROM public.budgets WHERE id = inv.budget_id);

  -- [CL-AUDIT-R3] TOCTOU 방어: 두 당사자 UID 를 정렬 순서로 advisory xact lock(데드락 방지) →
  --   동일 인물이 관여하는 동시 accept 를 직렬화한 뒤 파트너 상태를 재조회한다.
  PERFORM pg_advisory_xact_lock(hashtextextended(LEAST(v_uid, v_owner)::text, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(GREATEST(v_uid, v_owner)::text, 0));

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

-- ── perf-P2: 어떤 집계도 읽지 않는 인덱스 제거(쓰기 비용만 부과) ──
DROP INDEX IF EXISTS public.idx_page_views_utm_source;

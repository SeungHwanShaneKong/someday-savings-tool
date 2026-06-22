-- [CL-AUDIT-R4-DB-20260623] 적대적 감사 R4 — DB 레이어 보강 3종 (사용자 적용)
--
-- #1 이메일 RPC viewer 노출: get_budget_participants_email 이 모든 role 의 협업자 email 을 반환 →
--    current_partner_of(R3, editor+) 와 정책 불일치. 반환 대상을 editor+ 로 좁혀 viewer 이메일 비노출.
-- #2 first-touch 불변 부재: profiles.first_source/first_referrer/acquisition_at 가 클라 .is(null) 로만 보호 →
--    BEFORE UPDATE 트리거로 '한 번 기록되면 불변' 서버 강제(budgets_guard_owner 동일 패턴). KPI 무결성.
-- #13 profiles.created_at 인덱스 부재: admin 기간 쿼리(.gte/.lte/.lt created_at) Seq Scan → 인덱스 추가.
-- 안전: 전부 CREATE OR REPLACE / IF NOT EXISTS 멱등 · SECURITY DEFINER · search_path 고정. 정상 클라 무손실.

-- ── #1: 파트너 이메일 RPC — editor+ 만 반환(viewer 이메일 비노출, current_partner_of 와 정합) ──
CREATE OR REPLACE FUNCTION public.get_budget_participants_email(p_budget_id uuid)
RETURNS TABLE(user_id uuid, role text, display_name text, email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
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
      FROM public.budget_collaborators bc
     WHERE bc.budget_id = p_budget_id AND bc.role IN ('owner','editor')  -- viewer 이메일 비노출(정책 정합)
  ) u
  LEFT JOIN public.profiles pr ON pr.user_id = u.uid
  LEFT JOIN auth.users au ON au.id = u.uid;
END $$;
REVOKE ALL ON FUNCTION public.get_budget_participants_email(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_budget_participants_email(uuid) TO authenticated;

-- ── #2: first-touch 귀속 컬럼 불변 가드(한 번 기록되면 변경 불가) ──
CREATE OR REPLACE FUNCTION public.profiles_guard_first_touch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- OLD 가 이미 기록돼 있으면 NEW 가 무엇이든 OLD 로 고정(클라 .is(null) 우회·KPI 왜곡 차단). 정상 클라는 NULL 행만 write 라 무손실.
  IF OLD.first_source   IS NOT NULL THEN NEW.first_source   := OLD.first_source;   END IF;
  IF OLD.first_referrer IS NOT NULL THEN NEW.first_referrer := OLD.first_referrer; END IF;
  IF OLD.acquisition_at IS NOT NULL THEN NEW.acquisition_at := OLD.acquisition_at; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_profiles_guard_first_touch ON public.profiles;
CREATE TRIGGER trg_profiles_guard_first_touch
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_first_touch();

-- ── #13: profiles.created_at 인덱스(admin 기간 쿼리 Seq Scan 완화) ──
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at);

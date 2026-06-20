-- [CL-COEDIT-MODE-20260620-120000] 신랑·신부 공동편집 토대 — 협업자 편집 RLS + accept RPC + 실시간
--
-- 목표: 협업자(editor)가 공유 예산의 budget_items 를 읽기/쓰기 가능하게 하고(블로커 해소),
--       초대 수락 RPC(멱등·token-only)와 실시간(REPLICA IDENTITY + publication)을 활성화한다.
-- 안전: 전부 멱등(IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS). 기존 소유자 정책은
--       건드리지 않음(추가형). RLS 정책은 OR 결합이라 협업자 정책 추가가 소유자 접근을 제거하지 않음.
-- ⚠️ STEP 0: budget_collaborators/budget_invitations/enum/accept RPC 는 라이브에 이미 존재할 수 있음(드리프트).
--    아래는 멱등 안전망이며, 적용 전 브랜치 DB에서 선검증 권장.

-- ── enum 안전망 ──────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'collaborator_role') THEN
    CREATE TYPE public.collaborator_role AS ENUM ('owner','editor','viewer');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
    CREATE TYPE public.invitation_status AS ENUM ('pending','accepted','declined','expired');
  END IF;
END $$;

-- ── 테이블 안전망 (라이브에 있으면 no-op) ───────────────────
CREATE TABLE IF NOT EXISTS public.budget_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL,
  role public.collaborator_role NOT NULL DEFAULT 'editor',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (budget_id, user_id)
);
ALTER TABLE public.budget_collaborators ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.budget_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),  -- 256-bit
  role public.collaborator_role NOT NULL DEFAULT 'editor',
  status public.invitation_status NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_invitations ENABLE ROW LEVEL SECURITY;
-- 드리프트 보강: 라이브 테이블에 누락 가능한 컬럼 보장(accept RPC/refresh 가 참조). 있으면 no-op.
ALTER TABLE public.budget_invitations ADD COLUMN IF NOT EXISTS status public.invitation_status NOT NULL DEFAULT 'pending';
ALTER TABLE public.budget_invitations ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days');
ALTER TABLE public.budget_invitations ADD COLUMN IF NOT EXISTS responded_at timestamptz;

-- ── 헬퍼: 편집 권한 = 소유자 OR (협업자 AND role ∈ owner/editor) ──
-- ⚠️ 드리프트 충돌 회피: is_budget_collaborator 는 라이브에 이미 존재할 수 있어 CREATE OR REPLACE 가
--    시그니처/반환타입 충돌→전체 롤백 위험. 그래서 **재생성하지 않고**, 정책은 신규 can_edit_budget 만 사용.
--    can_edit_budget 도 옛 시그니처가 있으면 먼저 제거 후 생성(반환타입 충돌 차단).
-- (can_edit_budget 는 정책들이 의존 → DROP 불가. 시그니처 동일하므로 CREATE OR REPLACE 안전.)
CREATE OR REPLACE FUNCTION public.can_edit_budget(p_budget_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.budgets WHERE id = p_budget_id AND user_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.budget_collaborators
    WHERE budget_id = p_budget_id AND user_id = p_user_id AND role IN ('owner','editor')
  )
$$;

-- ── budget_items: 협업자 정책 추가 (블로커 해소, 소유자 정책은 그대로 OR 결합) ──
DROP POLICY IF EXISTS "Collaborators can view shared budget items" ON public.budget_items;
CREATE POLICY "Collaborators can view shared budget items"
  ON public.budget_items FOR SELECT TO authenticated
  USING (public.can_edit_budget(budget_id, auth.uid()));

DROP POLICY IF EXISTS "Collaborators can insert shared budget items" ON public.budget_items;
CREATE POLICY "Collaborators can insert shared budget items"
  ON public.budget_items FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_budget(budget_id, auth.uid()));

DROP POLICY IF EXISTS "Collaborators can update shared budget items" ON public.budget_items;
CREATE POLICY "Collaborators can update shared budget items"
  ON public.budget_items FOR UPDATE TO authenticated
  USING (public.can_edit_budget(budget_id, auth.uid()))
  WITH CHECK (public.can_edit_budget(budget_id, auth.uid()));

DROP POLICY IF EXISTS "Collaborators can delete shared budget items" ON public.budget_items;
CREATE POLICY "Collaborators can delete shared budget items"
  ON public.budget_items FOR DELETE TO authenticated
  USING (public.can_edit_budget(budget_id, auth.uid()));

-- ── budgets: 협업자 UPDATE(예산명/예식일 공동수정). SELECT 는 기존 정책 유지. DELETE 는 소유자 전용 유지 ──
DROP POLICY IF EXISTS "Collaborators can update shared budgets" ON public.budgets;
CREATE POLICY "Collaborators can update shared budgets"
  ON public.budgets FOR UPDATE TO authenticated
  USING (public.can_edit_budget(id, auth.uid()))
  WITH CHECK (public.can_edit_budget(id, auth.uid()));

-- ── budget_collaborators 정책 (소유자 관리 + 본인 조회/탈퇴) ──
DROP POLICY IF EXISTS "Budget owners manage collaborators" ON public.budget_collaborators;
CREATE POLICY "Budget owners manage collaborators"
  ON public.budget_collaborators FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.budgets b WHERE b.id = budget_collaborators.budget_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.budgets b WHERE b.id = budget_collaborators.budget_id AND b.user_id = auth.uid()));

DROP POLICY IF EXISTS "Collaborators can view own membership" ON public.budget_collaborators;
CREATE POLICY "Collaborators can view own membership"
  ON public.budget_collaborators FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Collaborators can leave" ON public.budget_collaborators;
CREATE POLICY "Collaborators can leave"
  ON public.budget_collaborators FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── budget_invitations 정책 (소유자만 관리; 초대받은 사람 SELECT 없음 = 이메일 열거 방지) ──
DROP POLICY IF EXISTS "Owners manage invitations" ON public.budget_invitations;
CREATE POLICY "Owners manage invitations"
  ON public.budget_invitations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.budgets b WHERE b.id = budget_invitations.budget_id AND b.user_id = auth.uid()))
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.budgets b WHERE b.id = budget_invitations.budget_id AND b.user_id = auth.uid())
    AND budget_invitations.invited_by = auth.uid()
  );

-- ── accept RPC (멱등·token-only·FOR UPDATE 락·owner 거부·만료 처리) ──
-- ⚠️ 드리프트 방어: 라이브에 옛 accept_budget_invitation 이 **다른 반환타입**으로 존재하면
--    CREATE OR REPLACE 가 "cannot change return type" 로 실패 → 전체 마이그레이션 롤백.
--    따라서 모든 가능한 시그니처를 먼저 DROP(타입 매칭, 반환타입 무관)한다.
-- 시그니처 무관 전체 제거(옛 버전이 varchar/uuid 등 어떤 타입이어도 확실히 드롭)
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

  -- 이미 협업자면 멱등 성공
  IF EXISTS (SELECT 1 FROM public.budget_collaborators WHERE budget_id = inv.budget_id AND user_id = v_uid) THEN
    RETURN json_build_object('ok', true, 'status', 'already_member', 'budget_id', inv.budget_id);
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

-- ── 실시간: 전체 행 페이로드 + publication 등록 (우리 모드 동기화용) ──
ALTER TABLE public.budget_items REPLICA IDENTITY FULL;
ALTER TABLE public.budgets REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='budget_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_items;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='budgets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.budgets;
  END IF;
END $$;

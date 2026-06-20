-- [CL-SEC-HARDEN-R2-20260621] 2차 보안 하드닝 — 항목 절취 차단 · 실시간 DELETE 유출 축소 · 공유링크 만료
--
-- 멱등(CREATE OR REPLACE / DROP IF EXISTS / IF NOT EXISTS / 가드). 20260620120000·20260124055724·20260208081423
-- 이후 실행 전제. 비가역/원격 적용이므로 브랜치 DB 선검증 권장(rules/security.md).

-- ── #2 budget_items.budget_id 불변 가드 (editor 가 공유 항목을 자기 예산으로 절취하는 IDOR 차단) ──
-- UPDATE 정책(소유자·협업자 모두)이 budget_id 컬럼 불변성을 강제하지 않아, can_edit_budget 이 공유예산 A·개인예산 B
-- 둘 다 true 인 editor 가 `update budget_items set budget_id=<B> where id=<A의 항목>` 한 줄로 항목을 영구 이전할 수 있었다
-- (USING=구행 A editor 통과, WITH CHECK=신행 B owner 통과). round-1 budgets_guard_owner 와 동일 패턴의
-- BEFORE UPDATE 트리거로 모든 UPDATE 경로(소유자 정책 포함)를 한 곳에서 차단. 정상 클라는 budget_id 를 보내지 않아 무손실.
CREATE OR REPLACE FUNCTION public.budget_items_guard_budget()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.budget_id IS DISTINCT FROM OLD.budget_id THEN
    RAISE EXCEPTION 'budget_id reassignment forbidden';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS budget_items_guard_budget ON public.budget_items;
-- 트리거명이 'update_budget_items_updated_at'(있으면)보다 알파벳 앞 → 차단이 타임스탬프 갱신보다 먼저 실행
CREATE TRIGGER budget_items_guard_budget
  BEFORE UPDATE ON public.budget_items
  FOR EACH ROW EXECUTE FUNCTION public.budget_items_guard_budget();

-- ── #3 실시간 DELETE 유출 축소 (REPLICA IDENTITY FULL → DEFAULT, 미사용 budgets publication 제거) ──
-- postgres_changes 의 DELETE 는 RLS 가 적용되지 않아 해당 table/filter 구독자 전원에게 prior 행을 브로드캐스트한다
-- (Supabase 문서화된 한계). REPLICA IDENTITY FULL 이면 삭제 행 전체(amount/notes/예식일/user_id)가 실린다.
-- 클라(useRealtimeBudget)는 DELETE 시 old.id 만 사용하고 INSERT/UPDATE 머지는 new 레코드만 참조하므로
-- DEFAULT(PK)로 환원해도 기능 무손실이며 DELETE 페이로드가 {id}로 축소되어 콘텐츠 유출이 제거된다.
ALTER TABLE public.budget_items REPLICA IDENTITY DEFAULT;
ALTER TABLE public.budgets REPLICA IDENTITY DEFAULT;
-- budgets 는 어떤 클라이언트도 실시간 구독하지 않음(순수 공격표면) → publication 에서 제거
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='budgets') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.budgets;
  END IF;
END $$;

-- ── #4 공유 링크(shared_budgets) 만료 도입 (영구 베어러 토큰 → 90일 만료) ──
-- shared_budgets 에 expires_at 이 없어 한 번 발급된 익명 공유 링크가 소유자가 수동 비활성화하기 전까지 영구히
-- 모든 budget_items(amount/notes)를 anon 에 노출했다. 형제 budget_invitations(7일 만료)와 달리 시간 게이트 부재.
ALTER TABLE public.shared_budgets ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE public.shared_budgets ALTER COLUMN expires_at SET DEFAULT (now() + interval '90 days');
-- 기존 행은 "생성시각 + 90일"로 백필(마이그레이션 시각 아님 → 오래된 링크는 곧 만료)
UPDATE public.shared_budgets SET expires_at = created_at + interval '90 days' WHERE expires_at IS NULL;

-- RPC 시간 게이트 추가(시그니처·반환컬럼·grant 동일 → CREATE OR REPLACE 안전, DROP 불요)
CREATE OR REPLACE FUNCTION public.get_shared_budget_items_by_token(p_share_token text)
RETURNS TABLE(
  budget_id uuid,
  budget_owner_id uuid,
  category text,
  sub_category text,
  amount numeric,
  is_paid boolean,
  notes text,
  quantity integer,
  unit_price numeric,
  custom_name text,
  is_custom boolean,
  cost_split text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    bi.budget_id,
    b.user_id AS budget_owner_id,
    bi.category,
    bi.sub_category,
    bi.amount,
    bi.is_paid,
    bi.notes,
    bi.quantity,
    bi.unit_price,
    bi.custom_name,
    bi.is_custom,
    bi.cost_split
  FROM public.budget_items bi
  INNER JOIN public.shared_budgets sb ON sb.budget_id = bi.budget_id
  INNER JOIN public.budgets b ON b.id = bi.budget_id
  WHERE sb.share_token = p_share_token
    AND sb.is_active = true
    AND (sb.expires_at IS NULL OR sb.expires_at > now());
$$;

-- [CL-SEC-COEDIT-HARDEN-20260621] 공동편집 보안 하드닝 — 협업자 소유권 탈취(IDOR/권한상승) 차단.
--
-- 배경(취약): 20260620120000 의 "Collaborators can update shared budgets" 정책은 budgets UPDATE 를
--   can_edit_budget() 만으로 게이트하고 컬럼 제약이 없다. budgets.user_id(소유권 포인터)는 쓰기 가능하므로
--   editor 협업자가 콘솔 1줄 `supabase.from('budgets').update({user_id:<자신>}).eq('id',<예산>)` 로
--   소유권을 탈취할 수 있었다. USING 은 구(舊) 행 기준(공격자=협업자→통과), WITH CHECK 는 신(新) 행 기준
--   (user_id=공격자 → can_edit_budget=true(이제 소유자)→통과). 결과: 원 소유자의 SELECT 정책
--   (auth.uid()=user_id)이 더 이상 매칭되지 않고 협업자 행도 없어 자신의 예산·전체 항목에서 영구 잠금.
--   정적 SPA(서버 신뢰 경계 없음)라 RLS 가 유일한 방어선 → critical.
--
-- 방어(이중):
--   (1) [권위] BEFORE UPDATE 트리거: 현재 소유자가 아니면 user_id 재지정 자체를 차단(RAISE).
--       can_edit_budget 의 OR-멤버십 우회와 무관하게 동작하는 최종 가드.
--   (2) [심층방어] 협업자 UPDATE 정책 WITH CHECK 에 user_id 불변 핀 추가.
--
-- 멱등: CREATE OR REPLACE / DROP ... IF EXISTS. 20260620120000 이후 실행되어 해당 정책이 존재함을 전제.
-- 적용 전 브랜치 DB 선검증 권장(rules/security.md).

-- ── (1) 권위적 가드: 소유권(user_id) 재지정은 현재 소유자만 가능 ──
CREATE OR REPLACE FUNCTION public.budgets_guard_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- 소유자 본인(auth.uid() = 구 소유자)만 user_id 변경 허용. 그 외(협업자 등)는 차단.
  IF NEW.user_id IS DISTINCT FROM OLD.user_id AND auth.uid() IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'ownership reassignment forbidden';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS budgets_guard_owner ON public.budgets;
-- 트리거명이 'update_budgets_updated_at' 보다 알파벳 앞이라 먼저 실행(차단이 타임스탬프 갱신보다 우선).
CREATE TRIGGER budgets_guard_owner
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.budgets_guard_owner();

-- ── (2) 심층방어: 협업자 UPDATE 정책에 user_id 불변 핀(서브쿼리는 MVCC상 구 user_id 반환) ──
DROP POLICY IF EXISTS "Collaborators can update shared budgets" ON public.budgets;
CREATE POLICY "Collaborators can update shared budgets"
  ON public.budgets FOR UPDATE TO authenticated
  USING (public.can_edit_budget(id, auth.uid()))
  WITH CHECK (
    public.can_edit_budget(id, auth.uid())
    AND user_id = (SELECT b.user_id FROM public.budgets b WHERE b.id = budgets.id)
  );

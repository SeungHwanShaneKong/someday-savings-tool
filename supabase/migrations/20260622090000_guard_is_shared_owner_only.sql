-- [CL-AUDIT-ISSHARED-GUARD-20260622] budgets.is_shared 를 소유자 전용 불변 컬럼으로 핀.
--
-- 배경(취약, Med): 20260621110000 이 추가한 budgets.is_shared 는 "생성 시점 소유자 의도"(개인/우리 탭 귀속)
--   컬럼인데, 협업자 UPDATE 정책("Collaborators can update shared budgets", 20260620120000)이 컬럼을
--   제약하지 않고 budgets_guard_owner 트리거(20260621090000)는 user_id 만 핀한다. 따라서 accepted editor
--   협업자가 콘솔 한 줄 `supabase.from('budgets').update({is_shared:...}).eq('id',<예산>)` 으로 오너의
--   탭 귀속 플래그를 변조 가능했다(CWE-639). 정상 클라이언트는 UPDATE 시 is_shared 를 보내지 않으므로 비파괴.
--
-- 해결(근본): 권위적 트리거 budgets_guard_owner 를 확장해 is_shared 변경도 '구 소유자'만 허용.
--   (user_id 가드와 동일 패턴 — 단일 권위 지점에 통합, 정책 변경 불필요.)

CREATE OR REPLACE FUNCTION public.budgets_guard_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- 소유자 본인(auth.uid() = 구 소유자)만 user_id 변경 허용.
  IF NEW.user_id IS DISTINCT FROM OLD.user_id AND auth.uid() IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'ownership reassignment forbidden';
  END IF;
  -- [CL-AUDIT-ISSHARED-GUARD-20260622] is_shared(소유자 의도)도 소유자만 변경 가능. 협업자 변조 차단.
  IF NEW.is_shared IS DISTINCT FROM OLD.is_shared AND auth.uid() IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'is_shared change forbidden for non-owner';
  END IF;
  RETURN NEW;
END $$;

-- 트리거는 20260621090000 에서 이미 생성됨(BEFORE UPDATE). 함수 본문만 교체하면 즉시 반영(멱등).

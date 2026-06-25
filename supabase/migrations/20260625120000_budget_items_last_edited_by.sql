-- [CL-EDIT5-EDITOR-20260625] budget_items 편집자 기록 (개선5 근본수정, 사용자 적용)
--
-- 배경: '내가 부재중 파트너 변경분' 강조가 updated_at>lastSeen 휴리스트만 써서 편집자를 구분 못 함 →
--   (b) 내 편집이 '파트너 변경'으로 오표시, (a) 강조 신뢰성 저하. 근본수정 = '누가 마지막으로 편집했나'를 기록.
-- 트리거가 auth.uid() 를 권위적으로 기록(클라 위변조 불가). 신규 컬럼이라 기존 컬럼불변 가드(user_id/budget_id/
--   is_shared)·set_updated_at 트리거와 충돌 없음(병렬 동작). 멱등.

ALTER TABLE public.budget_items
  ADD COLUMN IF NOT EXISTS last_edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- BEFORE INSERT/UPDATE: 편집자 = 현재 인증 사용자. (service_role/auth 없음 → null, 클라 편집 경로엔 항상 채워짐.)
CREATE OR REPLACE FUNCTION public.set_budget_item_editor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  NEW.last_edited_by = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_item_editor ON public.budget_items;
CREATE TRIGGER trg_set_item_editor
  BEFORE INSERT OR UPDATE ON public.budget_items
  FOR EACH ROW EXECUTE FUNCTION public.set_budget_item_editor();

-- 강조 필터 조회 가속(선택): updated_at 단조 비교는 이미 PK/budget_id 인덱스로 충분 → 별도 인덱스 불요.

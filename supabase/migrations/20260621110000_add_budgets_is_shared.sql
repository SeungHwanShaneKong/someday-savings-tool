-- [CL-COEDIT-OPTADD-20260621] budgets.is_shared — '우리'(공동) 탭 귀속 영구 플래그
--
-- 배경(버그): 옵션 추가가 항상 '협업자 0 = 개인'으로 생성돼, '우리' 탭에서 추가해도 개인 탭으로 빠짐.
--   budgets 에는 공유/개인 구분 컬럼이 없었고 isShared 는 협업자 유무로만 계산됐기 때문(협업자 0인
--   '우리' 예산을 표현 불가). 생성 시점의 워크스페이스 모드를 영구 보존할 컬럼을 추가한다.
--
-- 의미: is_shared=true 면 소유자의 '우리' 탭에 귀속(협업자 초대 전에도). 로더는
--   isShared = is_shared OR (협업자 존재) 로 계산 → 기존 협업 예산은 비파괴(여전히 '우리'로 표시).
--
-- 안전: 기본 false → 기존 모든 행은 '개인'(협업자 있으면 OR 로 '우리' 유지). 값 설정은 INSERT 시점만.
--   UPDATE 가드 트리거(budgets_guard_owner, 20260621090000)는 user_id 변경만 차단하므로 무충돌.

ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.budgets.is_shared IS
  '[CL-COEDIT-OPTADD-20260621] 생성 시 워크스페이스 모드(우리=true) 귀속. isShared = is_shared OR 협업자존재.';

-- [CL-AUDIT-DISPLAYNAME-CHECK-20260622] profiles.display_name 서버측 길이/문자 검증.
--
-- 배경(취약, Low–Med): NicknameDialog 의 20자 캡은 클라이언트 전용. profiles.display_name 은 bare TEXT 로
--   DB CHECK 가 없어, 직접 API 호출로 초대형(수 MB) 또는 제어문자 닉네임을 저장 가능했고 이는 파트너 화면
--   (BudgetFlow 배지·CollaboratorManager 목록)에 그대로 표출돼 페이로드 비대/UI 스푸핑을 유발(XSS 는 아님 —
--   모든 sink 가 React 텍스트 보간으로 자동 이스케이프). feature_requests.content 의 CHECK 패턴을 동일 적용.
--
-- 해결(근본): DB CHECK 로 길이(≤40) + 제어문자 금지. NOT VALID 로 추가 →
--   기존 행은 재검증하지 않아 무중단, 이후 모든 INSERT/UPDATE 에는 강제 적용(공격 경로 차단).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_display_name_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_display_name_check
      CHECK (
        display_name IS NULL
        OR (char_length(display_name) <= 40 AND display_name !~ '[[:cntrl:]]')
      ) NOT VALID;
  END IF;
END $$;

COMMENT ON CONSTRAINT profiles_display_name_check ON public.profiles IS
  '[CL-AUDIT-DISPLAYNAME-CHECK-20260622] 닉네임 ≤40자·제어문자 금지(클라 20자 캡의 서버측 강제).';

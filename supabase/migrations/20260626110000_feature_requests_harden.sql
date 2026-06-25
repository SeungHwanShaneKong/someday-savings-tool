-- [CL-VULN-R8-FEATREQ-20260626] feature_requests 입력 경계 강화 (개선, 사용자 적용)
--
-- 문제(R8 감사 D3): category 가 무제한 text + 익명 INSERT(WITH CHECK true) → 비정상 거대 페이로드/스팸으로
--   테이블 비대화·관리자 화면 오염 가능(중·저 심각도). content 는 이미 char_length<=500 가드 존재하나 category 는 무방비.
-- 해결(부분, 정직): category 길이 상한 추가. 익명 INSERT 자체는 제품상 의도(비로그인 피드백 수집)라 유지.
-- 멱등: DROP CONSTRAINT IF EXISTS 후 재추가. NOT VALID = 기존 행 재검증 없이(무중단) 신규 INSERT/UPDATE 부터 강제.
--
-- 잔여 리스크(후속 권고): 익명 '대량' 스팸은 RLS 로 제한 불가 → 제출을 Edge Function 경유로 바꿔 IP/세션 레이트리밋
--   또는 hCaptcha/Turnstile 적용이 정석. 현재 마이그는 '필드 크기' 경계만 닫는다.

ALTER TABLE public.feature_requests DROP CONSTRAINT IF EXISTS feature_requests_category_len;
ALTER TABLE public.feature_requests
  ADD CONSTRAINT feature_requests_category_len
  CHECK (category IS NULL OR char_length(category) <= 40) NOT VALID;

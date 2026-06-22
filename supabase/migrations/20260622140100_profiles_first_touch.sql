-- [CL-ACQ-PROFILE-FT-20260622-233012] 유입경로 분석 토대 (2단계/4) — profiles first-touch 귀속 컬럼
--
-- 배경(개선1): "사용자별" 유입원은 가입자별 최초 방문(first-touch)을 프로필에 1회 귀속해 집계한다.
--   referrer 는 DB 트리거(handle_new_user)에서 알 수 없으므로 클라이언트가 가입 직후 1회 기록한다.
-- 안전: 전부 nullable ADD COLUMN → handle_new_user 트리거(INSERT user_id,display_name) 무영향.
--   profiles RLS(소유자 전용)는 그대로 — 본인만 자기 first_* 를 write. 관리자 집계는 별도 SECURITY DEFINER RPC(3단계).

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_source text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_referrer text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS acquisition_at timestamptz;

-- [CL-DBSWITCH-20260620-133000] function_call_log — 누락 테이블 복구
-- 원인: 이 테이블은 옛 Lovable 메인 프로젝트(tnboeqtdimyxpjzsraro)에 out-of-band(대시보드)로만 생성되어
--   리포 마이그레이션에 없었음 → 새 프로젝트(pnfjwsugsdyzyahrants)에 `db push` 해도 생기지 않음.
-- 사용처: supabase/functions/_shared/log-call.ts 가 모든 Edge Function 호출을 fire-and-forget 로 기록(service_role insert).
--   admin Performance 대시보드(performance-sentinel)가 이 테이블을 읽음. 없으면 텔레메트리가 조용히 0이 됨(비치명적).
-- 멱등: CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS.
-- 롤백: DROP TABLE IF EXISTS public.function_call_log;

CREATE TABLE IF NOT EXISTS public.function_call_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name text NOT NULL,
  duration_ms integer,
  status_code integer,
  user_id uuid,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.function_call_log ENABLE ROW LEVEL SECURITY;

-- 읽기: 관리자만 (성능 대시보드). 쓰기: Edge Function이 service_role 로 insert → RLS 우회 → INSERT 정책 불요.
DROP POLICY IF EXISTS "Admin reads function call log" ON public.function_call_log;
CREATE POLICY "Admin reads function call log"
  ON public.function_call_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_function_call_log_created_at
  ON public.function_call_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_function_call_log_function_name
  ON public.function_call_log(function_name);

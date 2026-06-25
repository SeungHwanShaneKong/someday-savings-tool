-- [CL-VULN-R8-AIQUOTA-20260626] AI 일일 한도: 변조내성 + 원자 예약 (개선, 사용자 적용)
--
-- 문제(R8 감사):
--   D1) 한도 카운트를 ai_conversations(소유자가 FOR ALL RLS 로 DELETE 가능) 행수로 산정 → 사용자가 자기 행을 DELETE 해
--       오늘 카운터를 0으로 리셋 → 일일 한도 무력화 → OpenAI 비용 DoS.
--   D2) count-then-act(비원자)라 동시 N요청이 같은 count 를 읽고 전부 통과 → 한도 N배 초과(TOCTOU).
-- 해결: 한도 진실원을 '사용자가 손댈 수 없는' service_role 전용 ai_usage 카운터로 분리 + 원자 증가 RPC(reserve-before-call).
--   ai_conversations 는 대화 로깅 전용으로 남김(사용자가 자기 대화 삭제해도 한도에 영향 없음 → 채팅 UX 보존).
-- 멱등: IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.

CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id   uuid    NOT NULL,
  feature   text    NOT NULL,
  usage_day date    NOT NULL,
  n         integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, feature, usage_day)
);
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- 소유자는 본인 사용량 '조회'만 가능. INSERT/UPDATE/DELETE 정책 없음 → authenticated/anon 쓰기·변조 불가(=카운터 위조 차단).
DROP POLICY IF EXISTS "ai_usage_select_own" ON public.ai_usage;
CREATE POLICY "ai_usage_select_own" ON public.ai_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 원자 예약: 증가 '후' 카운트를 반환. 호출부는 반환값 > p_limit 이면 429. 동시 요청은 행 잠금으로 직렬화 → 정확히 limit 만 통과.
-- SECURITY DEFINER + search_path 고정. Edge(service_role)만 호출(PUBLIC REVOKE) → 사용자가 직접 호출해 카운터 조작 불가.
CREATE OR REPLACE FUNCTION public.reserve_ai_quota(p_user_id uuid, p_feature text, p_limit integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_n integer;
BEGIN
  INSERT INTO public.ai_usage (user_id, feature, usage_day, n)
  VALUES (p_user_id, p_feature, (now() AT TIME ZONE 'UTC')::date, 1)
  ON CONFLICT (user_id, feature, usage_day)
    DO UPDATE SET n = public.ai_usage.n + 1
  RETURNING n INTO v_n;
  RETURN v_n;
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_ai_quota(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_ai_quota(uuid, text, integer) TO service_role;

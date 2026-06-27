-- [CL-AUDIT2-R1-CAP-20260628] 익명 방문 글로벌 일일 하드캡(원자) — 적대 감사 F1 근본수정 (사용자 적용)
--
-- 배경: track-visit 의 유일 abuse 게이트가 클라 조작 가능 X-Forwarded-For + per-isolate Map 이라 스푸핑/희석으로
--   무력했다 → 무인증 클라가 anon_page_views 에 무제한 행 삽입(쓰기 증폭·지표 오염·저장 폭증) 가능.
-- 해결: DB 원장으로 '일별 총 insert'를 원자적으로 제한(reserve-before-insert). Edge 가 매 기록 직전 RPC 로 예약하고
--   반환값 > 캡이면 기록을 생략 → 일일 글로벌 상한을 하드 보장(reserve_ai_quota·partner_notifications 하드캡 패턴 동형).
-- 일경계: Asia/Seoul(서비스 로컬, anon_page_views 집계 RPC 와 동일 기준).

CREATE TABLE IF NOT EXISTS public.anon_visit_daily_counter (
  day   date PRIMARY KEY,
  count integer NOT NULL DEFAULT 0
);
ALTER TABLE public.anon_visit_daily_counter ENABLE ROW LEVEL SECURITY;
-- RLS 정책 0개 + REVOKE = anon/authenticated 직접 접근 불가. 증가는 DEFINER RPC(service_role 경유)만.
REVOKE ALL ON public.anon_visit_daily_counter FROM anon, authenticated;

-- 원자 예약: 오늘(KST) 카운트를 +1 하고 '증가 후 값'을 반환. 단일 INSERT..ON CONFLICT DO UPDATE 문장으로 동시성 안전.
CREATE OR REPLACE FUNCTION public.reserve_anon_visit(p_max integer)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.anon_visit_daily_counter AS c (day, count)
  VALUES ((now() AT TIME ZONE 'Asia/Seoul')::date, 1)
  ON CONFLICT (day) DO UPDATE SET count = c.count + 1
  RETURNING c.count INTO v_count;
  RETURN v_count;
END;
$$;
-- service_role(Edge)만 호출 — anon/authenticated/PUBLIC 차단(클라가 카운터를 못 건드림).
REVOKE ALL ON FUNCTION public.reserve_anon_visit(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_anon_visit(integer) TO service_role;

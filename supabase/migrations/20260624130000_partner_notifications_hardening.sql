-- [CL-VULN-V2-RATELIMIT-ATOMIC-20260624] partner_notifications 일별 원자 레이트리밋 (개선2 하드닝, 사용자 적용)
--
-- 문제(R-vuln V2): notify-partner 가 'SELECT count → 발송 → INSERT'(check-then-act)라 동시 invoke·다탭·재시도 시
--   여러 요청이 모두 count=0 을 보고 중복 발송 → per(sender,recipient) 하루 1회·글로벌 캡이 모두 우회됨(스팸/비용).
-- 근본수정: (sender_id, recipient_id, notify_day, kind) '부분 유니크 인덱스' + Edge 의 reserve-before-send.
--   Edge 가 발송 전에 notify_day(UTC date)를 명시해 INSERT(예약)하고, 유니크 위반(23505)은 rate_limited 로 흡수.
--   → 동시 N개 요청 중 정확히 1건만 예약 성공 → 1건만 발송. 발송 실패해도 예약 유지(fail-closed, 재발송 루프 차단).
-- 멱등: ADD COLUMN IF NOT EXISTS / CREATE UNIQUE INDEX IF NOT EXISTS.
-- 주: 생성열(GENERATED ALWAYS AS ((created_at AT TIME ZONE 'UTC')::date))은 표현식이 IMMUTABLE 이 아니어서
--   Postgres 가 거부한다 → 일반 date 컬럼으로 두고 Edge 가 UTC 일자를 직접 기록한다.

ALTER TABLE public.partner_notifications
  ADD COLUMN IF NOT EXISTS notify_day date;

-- 기존 행(있다면) 백필 — 신규 기능이라 보통 빈 테이블(no-op). created_at 기준 UTC 일자.
UPDATE public.partner_notifications
  SET notify_day = (created_at AT TIME ZONE 'UTC')::date
  WHERE notify_day IS NULL;

-- per (sender, recipient, day, kind) 하루 1건 강제. NULL notify_day(레거시)는 부분 인덱스에서 제외.
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_notif_pair_day
  ON public.partner_notifications (sender_id, recipient_id, notify_day, kind)
  WHERE notify_day IS NOT NULL;

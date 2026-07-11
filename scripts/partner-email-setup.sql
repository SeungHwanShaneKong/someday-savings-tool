-- [CL-EMAIL-SETUP-20260711-211500] 파트너 이메일 알림(콕찌르기 포함) DB 준비 — 원클릭 멱등 SQL
--
-- 사용법: Supabase 대시보드 → SQL Editor → 전체 붙여넣기 → Run.
--   https://supabase.com/dashboard/project/pnfjwsugsdyzyahrants/sql/new
-- 안전: 아래 두 마이그레이션(20260624110000 + 20260624130000)을 그대로 합친 것으로,
--   전부 IF NOT EXISTS / DROP POLICY IF EXISTS 라 **이미 적용됐어도 재실행 무해(멱등)**.
--   실행 후 "Success. No rows returned" 가 나오면 정상.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- (1/2) = supabase/migrations/20260624110000_partner_notifications.sql (원문 그대로)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_id uuid REFERENCES public.budgets(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'partner_edit_2min',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_notifications ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회(운영 관측). 일반 사용자/anon 은 SELECT 불가 = 발송 이력/이메일 관계 비노출.
DROP POLICY IF EXISTS "Admins read partner_notifications" ON public.partner_notifications;
CREATE POLICY "Admins read partner_notifications"
  ON public.partner_notifications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
-- INSERT 정책 없음 → authenticated/anon 직접 insert 불가. Edge Function 의 service_role 키만 기록(RLS 우회).

CREATE INDEX IF NOT EXISTS idx_partner_notifications_pair_created
  ON public.partner_notifications (sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_partner_notifications_created
  ON public.partner_notifications (created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- (2/2) = supabase/migrations/20260624130000_partner_notifications_hardening.sql (원문 그대로)
-- ─────────────────────────────────────────────────────────────────────────────

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

-- ─────────────────────────────────────────────────────────────────────────────
-- 적용 확인(선택): 아래 SELECT 가 notify_day 컬럼과 uq_partner_notif_pair_day 인덱스를 반환하면 완료.
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='partner_notifications' AND column_name='notify_day';
-- SELECT indexname FROM pg_indexes
--   WHERE schemaname='public' AND tablename='partner_notifications' AND indexname='uq_partner_notif_pair_day';

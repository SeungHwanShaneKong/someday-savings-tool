-- [CL-COEDIT-NOTIFY-20260623-230113] 파트너 편집 알림 로그 + 레이트리밋 토대 (개선2, 사용자 적용)
--
-- notify-partner Edge Function 이 발송 1건마다 1행 기록. 레이트리밋 근거:
--   ① per (sender,recipient) 하루 1회 ② 글로벌 하루 ≤100통. Edge(service_role)가 insert/count.
-- 안전: RLS enable + SELECT admin-only(이메일 열거 방지). insert 는 service_role(RLS 우회)만. 멱등.

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

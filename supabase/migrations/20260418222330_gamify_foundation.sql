-- [CL-GAMIFY-INT-20260418-222329] Gamification Foundation Schema
-- 4개 기능(Streak · Passport · Score Card · Leaderboard)이 공용하는 기반 스키마
-- 기존 테이블 RLS·구조 변경 없음. 모든 신규 컬럼/테이블은 안전한 DEFAULT 지정.
--
-- 롤백:
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS gamification_state;
--   DROP TABLE IF EXISTS public.user_earned_badges;
--   DROP TABLE IF EXISTS public.badge_definitions;
--   DROP FUNCTION IF EXISTS public.get_cohort_percentile(UUID, TEXT);

-- ─────────────────────────────────────────────────────────────
-- 1) profiles에 gamification_state JSONB 컬럼 추가
--    모든 신규 사용자 및 기존 사용자 자동 적용 (DEFAULT '{}'::jsonb)
--    실제 값은 lazy 초기화 (첫 업데이트 시 채워짐) → 대량 UPDATE 불필요
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gamification_state JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.gamification_state IS
  '[CL-GAMIFY-INT-20260418-222329] 게이미피케이션 상태. Keys: '
  'total_points:int, level:int, login_streak_days:int, checklist_streak_days:int, '
  'last_login_date:YYYY-MM-DD, last_checklist_date:YYYY-MM-DD, '
  'freeze_tokens:int (default 2), cohort_opted_in:bool (default false), '
  'last_score_card_generated_at:timestamp, unlocked_badge_slugs:text[], '
  'opt_in_phases:text[] (default all).';

-- JSONB 내부 키 인덱싱 (자주 조회되는 순위 계산용)
CREATE INDEX IF NOT EXISTS idx_profiles_total_points
  ON public.profiles ((gamification_state->>'total_points'));
CREATE INDEX IF NOT EXISTS idx_profiles_login_streak
  ON public.profiles ((gamification_state->>'login_streak_days'));

-- ─────────────────────────────────────────────────────────────
-- 2) badge_definitions: 관리자 큐레이션, read-only for users
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.badge_definitions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  name_ko       TEXT NOT NULL,
  description   TEXT NOT NULL,
  icon_emoji    TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('starter','planner','saver','ai_ace','legendary')),
  rarity        TEXT NOT NULL CHECK (rarity IN ('common','rare','legendary')),
  points_reward INTEGER NOT NULL DEFAULT 10 CHECK (points_reward >= 0 AND points_reward <= 10000),
  unlock_rule   JSONB NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads active badges" ON public.badge_definitions;
CREATE POLICY "Anyone reads active badges"
  ON public.badge_definitions
  FOR SELECT
  USING (is_active = true);

-- INSERT/UPDATE/DELETE는 정책 없음 → service_role 전용 (seed 마이그레이션에서 수행)

COMMENT ON TABLE public.badge_definitions IS
  '[CL-GAMIFY-INT-20260418-222329] 뱃지 카탈로그 (admin 큐레이션). 사용자 읽기만 허용.';

-- ─────────────────────────────────────────────────────────────
-- 3) user_earned_badges: 사용자별 획득 뱃지
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_earned_badges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id   UUID NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_earned_badges_user_earned_at
  ON public.user_earned_badges (user_id, earned_at DESC);

ALTER TABLE public.user_earned_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own earned badges" ON public.user_earned_badges;
CREATE POLICY "Users view own earned badges"
  ON public.user_earned_badges
  FOR SELECT
  USING (auth.uid() = user_id);

-- 본인 뱃지 INSERT 허용 (클라이언트에서 rule-engine 통과 시 기록 가능)
-- 서버측 검증이 추가 필요 시 Edge Function으로 전환
DROP POLICY IF EXISTS "Users insert own earned badges" ON public.user_earned_badges;
CREATE POLICY "Users insert own earned badges"
  ON public.user_earned_badges
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.user_earned_badges IS
  '[CL-GAMIFY-INT-20260418-222329] 사용자별 획득 뱃지 기록 (UNIQUE user_id × badge_id).';

-- ─────────────────────────────────────────────────────────────
-- 4) Cohort percentile RPC — 개인정보 안전 집계
--    현재는 signature + stub. 실제 집계는 Phase 4에서 구현.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_cohort_percentile(
  p_user_id UUID,
  p_metric TEXT
) RETURNS TABLE(percentile INTEGER, cohort_size INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 권한 검증: 호출자의 auth.uid()가 p_user_id와 일치해야 함
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'permission denied: can only query own cohort';
  END IF;

  -- metric 허용값 검증
  IF p_metric NOT IN ('checklist_progress','budget_execution','snapshot_count','ai_queries') THEN
    RAISE EXCEPTION 'invalid metric: %', p_metric;
  END IF;

  -- Phase 4에서 실제 집계 구현 예정 — 현재는 stub
  -- cohort_size < 50 이면 percentile 미노출 (privacy)
  RETURN QUERY SELECT 50::INTEGER AS percentile, 0::INTEGER AS cohort_size;
END;
$$;

REVOKE ALL ON FUNCTION public.get_cohort_percentile(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cohort_percentile(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.get_cohort_percentile IS
  '[CL-GAMIFY-INT-20260418-222329] 코호트 percentile 집계. Phase 4에서 실구현. '
  'SECURITY DEFINER + auth.uid 검증 + metric whitelist로 개인정보 보호.';

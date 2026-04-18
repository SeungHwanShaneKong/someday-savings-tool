-- [CL-GAMIFY-INT-20260418-222329] Phase 1 Streak Milestone Badges
-- 5개 로그인 streak 마일스톤 트로피 (7/14/30/100/365일)
--
-- 롤백: DELETE FROM public.badge_definitions WHERE slug LIKE 'streak_login_%';

INSERT INTO public.badge_definitions
  (slug, name_ko, description, icon_emoji, category, rarity, points_reward, unlock_rule, display_order)
VALUES
  (
    'streak_login_7',
    '일주일 연속',
    '7일 연속 로그인을 달성했어요! 웨딩 준비의 기초 체력을 만들고 있습니다.',
    '🥉',
    'planner',
    'common',
    30,
    '{"type":"login_streak_days","threshold":7}'::jsonb,
    100
  ),
  (
    'streak_login_14',
    '2주 연속',
    '14일 연속 로그인! 꾸준함이 빛나는 순간입니다.',
    '🥈',
    'planner',
    'common',
    70,
    '{"type":"login_streak_days","threshold":14}'::jsonb,
    101
  ),
  (
    'streak_login_30',
    '한 달 개근',
    '30일 연속 로그인 달성! 웨딩셈 성실 회원 등극.',
    '🥇',
    'planner',
    'rare',
    150,
    '{"type":"login_streak_days","threshold":30}'::jsonb,
    102
  ),
  (
    'streak_login_100',
    '백일 기념',
    '100일 연속 로그인! 결혼 준비 파워 유저로서의 증표.',
    '💎',
    'legendary',
    'legendary',
    500,
    '{"type":"login_streak_days","threshold":100}'::jsonb,
    103
  ),
  (
    'streak_login_365',
    '1년 개근',
    '365일 연속 로그인! 웨딩셈의 전설이 된 분입니다.',
    '🌟',
    'legendary',
    'legendary',
    2000,
    '{"type":"login_streak_days","threshold":365}'::jsonb,
    104
  )
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE public.badge_definitions IS
  '[CL-GAMIFY-INT-20260418-222329] Phase 1 seeds: 5 login streak milestones added.';

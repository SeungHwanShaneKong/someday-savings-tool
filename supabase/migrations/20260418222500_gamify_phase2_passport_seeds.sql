-- [CL-GAMIFY-INT-20260418-222329] Phase 2 Passport — 15개 뱃지 seed
-- 카테고리 5종 (Starter · Planner · Saver · AI Ace · Legendary)
-- 롤백: DELETE FROM public.badge_definitions WHERE slug IN ('passport_*' list)

INSERT INTO public.badge_definitions
  (slug, name_ko, description, icon_emoji, category, rarity, points_reward, unlock_rule, display_order)
VALUES
  -- ─── Starter (3개) ───
  (
    'starter_first_budget',
    '첫 예산 생성',
    '웨딩 예산 계정을 처음 만들었어요. 시작이 반이에요!',
    '🎯',
    'starter',
    'common',
    20,
    '{"type":"first_budget"}'::jsonb,
    1
  ),
  (
    'starter_first_checklist',
    '첫 체크리스트 완료',
    '체크리스트 첫 항목을 완료했어요. 실행하는 힘이 보여요.',
    '✅',
    'starter',
    'common',
    20,
    '{"type":"first_checklist_completed"}'::jsonb,
    2
  ),
  (
    'starter_first_snapshot',
    '첫 스냅샷 저장',
    '예산 스냅샷을 처음 저장했어요. 변화를 기록하는 습관이 시작됐습니다.',
    '📸',
    'starter',
    'common',
    30,
    '{"type":"first_snapshot"}'::jsonb,
    3
  ),
  -- ─── Planner (4개) ───
  (
    'planner_check_10',
    '10개 달성',
    '체크리스트 10개를 완료했어요. 좋은 속도!',
    '🚀',
    'planner',
    'common',
    50,
    '{"type":"checklist_total_done","threshold":10}'::jsonb,
    10
  ),
  (
    'planner_check_25',
    '25개 달성',
    '체크리스트 25개 완료. 웨딩 준비의 핵심 구간을 지나고 있어요.',
    '⭐',
    'planner',
    'rare',
    100,
    '{"type":"checklist_total_done","threshold":25}'::jsonb,
    11
  ),
  (
    'planner_check_50',
    '하프 마라톤',
    '체크리스트 50개 완료! 전체 여정의 절반을 이루었어요.',
    '🎊',
    'planner',
    'rare',
    200,
    '{"type":"checklist_total_done","threshold":50}'::jsonb,
    12
  ),
  (
    'planner_check_75',
    '피날레 임박',
    '체크리스트 75개 완료! 거의 다 왔어요. 마지막 스퍼트.',
    '👑',
    'planner',
    'legendary',
    400,
    '{"type":"checklist_total_done","threshold":75}'::jsonb,
    13
  ),
  -- ─── Saver (3개) ───
  (
    'saver_minus_10',
    '절약 입문',
    '국평 대비 10% 절약에 성공했어요. 현명한 소비의 시작.',
    '💰',
    'saver',
    'common',
    40,
    '{"type":"budget_savings_pct","min_savings_pct":10}'::jsonb,
    20
  ),
  (
    'saver_minus_20',
    '알뜰 플래너',
    '국평 대비 20% 절약 달성. 웨딩 예산을 똑소리 나게 관리 중!',
    '💎',
    'saver',
    'rare',
    120,
    '{"type":"budget_savings_pct","min_savings_pct":20}'::jsonb,
    21
  ),
  (
    'saver_minus_30',
    '예산 마스터',
    '국평 대비 30% 절약! 최상급 재무 관리 능력.',
    '🏆',
    'saver',
    'legendary',
    300,
    '{"type":"budget_savings_pct","min_savings_pct":30}'::jsonb,
    22
  ),
  -- ─── AI Ace (3개) ───
  (
    'ai_curious_1',
    'AI와 첫 대화',
    'AI Q&A 챗봇을 처음 사용했어요. 궁금증은 곧 성장의 씨앗.',
    '🤖',
    'ai_ace',
    'common',
    15,
    '{"type":"ai_queries_total","threshold":1}'::jsonb,
    30
  ),
  (
    'ai_curious_10',
    'AI 단짝',
    'AI Q&A 10회 달성. AI를 제대로 활용하는 파워 유저.',
    '🧠',
    'ai_ace',
    'rare',
    80,
    '{"type":"ai_queries_total","threshold":10}'::jsonb,
    31
  ),
  (
    'ai_curious_50',
    'AI 절친',
    'AI Q&A 50회 달성! AI와 함께 웨딩을 기획한 전문가.',
    '🎓',
    'ai_ace',
    'legendary',
    250,
    '{"type":"ai_queries_total","threshold":50}'::jsonb,
    32
  ),
  -- ─── Legendary (2개) ───
  (
    'legendary_d7_action',
    'D-7 액션 히어로',
    '결혼식 7일 전에도 열심히 준비 중! 진정한 결단력.',
    '🦸',
    'legendary',
    'legendary',
    500,
    '{"type":"days_before_wedding_action","max_days_before":7}'::jsonb,
    40
  ),
  (
    'legendary_d0_hero',
    '결혼식 당일 전설',
    'D-day 당일 앱 사용! 행복한 하루가 되시길 응원합니다.',
    '💍',
    'legendary',
    'legendary',
    1000,
    '{"type":"days_before_wedding_action","max_days_before":0}'::jsonb,
    41
  )
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE public.badge_definitions IS
  '[CL-GAMIFY-INT-20260418-222329] Phase 1+2 seeds: 5 streak milestones + 15 Passport badges = 20 total.';

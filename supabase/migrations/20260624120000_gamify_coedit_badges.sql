-- [CL-GAMIFY-COEDIT-20260623-230113] 공동편집 게이미피케이션 뱃지 2종 (개선2·3, 사용자 적용)
-- 롤백: DELETE FROM public.badge_definitions WHERE slug IN ('coedit_duo_caller','coedit_in_sync');
-- rule-engine 이 신규 rule type(coedit_nudges_sent / partner_reviews)을 평가(클라 types.ts/rule-engine.ts 동반).

INSERT INTO public.badge_definitions
  (slug, name_ko, description, icon_emoji, category, rarity, points_reward, unlock_rule, display_order)
VALUES
  (
    'coedit_duo_caller',
    '파트너 소환사',
    '함께 편집하며 파트너를 불러왔어요. 둘이 같이 만드는 예산이 빛나요.',
    '📣',
    'planner',
    'rare',
    30,
    '{"type":"coedit_nudges_sent","threshold":1}'::jsonb,
    50
  ),
  (
    'coedit_in_sync',
    '동기화',
    '파트너가 바꾼 항목을 5번 확인했어요. 호흡이 척척 맞아요.',
    '🔗',
    'planner',
    'rare',
    30,
    '{"type":"partner_reviews","threshold":5}'::jsonb,
    51
  )
ON CONFLICT (slug) DO NOTHING;

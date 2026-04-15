-- [CL-CHECKLIST-9PERIOD-20260412-130000]
-- 기존 5단계 period(D-12~10m, D-9~7m, D-6~4m, D-3~2m, D-1m~D)를
-- 9단계 period(D-12~10m, D-10~8m, D-8~6m, D-6~5m, D-5~4m, D-4~3m, D-3~2m, D-2~1m, D-1~0)로 자동 매핑
-- 전략: title 기반 세밀 분류 + 기본값은 기간 중간값으로 대체

UPDATE public.user_checklist_items
SET period = CASE
  -- D-12~10m: 그대로 유지 (동일 라벨)
  WHEN period = 'D-12~10m' THEN 'D-12~10m'

  -- D-9~7m → D-10~8m (대부분, 큰 업체 라인업) 또는 D-8~6m (혼수/신혼여행 리서치)
  WHEN period = 'D-9~7m' AND title ILIKE '%혼수 목록%' THEN 'D-8~6m'
  WHEN period = 'D-9~7m' AND title ILIKE '%신혼여행지%' THEN 'D-8~6m'
  WHEN period = 'D-9~7m' AND title ILIKE '%예물 알아보기%' THEN 'D-8~6m'
  WHEN period = 'D-9~7m' AND title ILIKE '%가전%' THEN 'D-8~6m'
  WHEN period = 'D-9~7m' AND title ILIKE '%가구%' THEN 'D-8~6m'
  WHEN period = 'D-9~7m' THEN 'D-10~8m'

  -- D-6~4m: 3단계로 세분화
  -- 웨딩 촬영/부케/드레스 셀렉/신혼집 → D-6~5m
  WHEN period = 'D-6~4m' AND (
    title ILIKE '%촬영%' OR
    title ILIKE '%부케%' OR
    title ILIKE '%드레스 셀렉%' OR
    title ILIKE '%신혼집%'
  ) THEN 'D-6~5m'
  -- 항공/숙소/예산 중간 점검/청첩장 스타일 탐색 → D-5~4m
  WHEN period = 'D-6~4m' AND (
    title ILIKE '%항공%' OR
    title ILIKE '%숙소%' OR
    title ILIKE '%예산 중간%' OR
    title ILIKE '%청첩장 스타일%'
  ) THEN 'D-5~4m'
  -- 예물/예단/한복/혼수/청첩장 제작/모바일 청첩장/본식 드레스 → D-4~3m
  WHEN period = 'D-6~4m' AND (
    title ILIKE '%예물%' OR
    title ILIKE '%예단%' OR
    title ILIKE '%한복%' OR
    title ILIKE '%혼수%' OR
    title ILIKE '%청첩장 제작%' OR
    title ILIKE '%청첩장 디자인%' OR
    title ILIKE '%모바일 청첩장%' OR
    title ILIKE '%본식 드레스 셀렉%' OR
    title ILIKE '%식전 영상%' OR
    title ILIKE '%답례품 알아보기%' OR
    title ILIKE '%아버지 예복%'
  ) THEN 'D-4~3m'
  -- 그 외 D-6~4m 항목은 중간값 D-5~4m로
  WHEN period = 'D-6~4m' THEN 'D-5~4m'

  -- D-3~2m: 피팅/리허설/입주/답례품 주문/예식장 최종 미팅/본식 스냅 미팅 → D-2~1m
  WHEN period = 'D-3~2m' AND (
    title ILIKE '%피팅%' OR
    title ILIKE '%리허설%' OR
    title ILIKE '%입주%' OR
    title ILIKE '%답례품 주문%' OR
    title ILIKE '%예식장 최종 미팅%' OR
    title ILIKE '%본식 스냅 사전%' OR
    title ILIKE '%혼주 의상%' OR
    title ILIKE '%신혼여행 최종%'
  ) THEN 'D-2~1m'
  -- 그 외 D-3~2m 항목은 유지 (하객 리스트/청첩장 발송/식순 섭외/가방순이/청첩장 모임/예산 최종 점검)
  WHEN period = 'D-3~2m' THEN 'D-3~2m'

  -- D-1m~D → D-1~0 (모두 마지막 단계로 병합)
  WHEN period = 'D-1m~D' THEN 'D-1~0'

  ELSE period
END
WHERE period IN ('D-12~10m', 'D-9~7m', 'D-6~4m', 'D-3~2m', 'D-1m~D');

-- 마이그레이션 감사용 코멘트
COMMENT ON COLUMN public.user_checklist_items.period IS
  'Period values migrated from 5-tier to 9-tier structure on 2026-04-12 [CL-CHECKLIST-9PERIOD-20260412-130000]';

-- 검증용 뷰 (선택): 마이그레이션 후 period 분포 확인
-- SELECT period, COUNT(*) FROM public.user_checklist_items GROUP BY period ORDER BY period;

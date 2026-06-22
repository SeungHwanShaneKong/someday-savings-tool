-- [CL-ACQ-PAGEVIEWS-20260622-233012] 유입경로 분석 토대 (1단계/4) — page_views 소스 컬럼
--
-- 배경(개선1): 관리자 대시보드 "사용자별 유입경로"를 위해 referrer/UTM 를 수집한다.
--   현재 page_views 에는 소스 컬럼이 전혀 없어(가입 귀속도 last-touch 분포도 불가) 수집부터 신설.
-- 안전: 순수 ADD COLUMN(nullable) — 기존 insert/duration update 경로 불변, 데이터 의미 보존. IF NOT EXISTS 멱등.
--   과거 행은 referrer/utm_source = NULL(수집 시작일 이전) → 대시보드에서 'unknown'/수집시작일 명시로 처리.

ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS referrer text;
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS utm_source text;

-- 채널 분포 집계(GROUP BY utm_source) 가속용 인덱스
CREATE INDEX IF NOT EXISTS idx_page_views_utm_source ON public.page_views (utm_source);

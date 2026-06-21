-- [CL-AUDIT-ADMIN-INDEX-20260622] 관리자 KPI 시계열 쿼리용 인덱스 — page_views / budget_items.created_at
--
-- 배경(성능, Low·기존): 관리자 대시보드(useAdminKPI)는 page_views 를
--   .neq('user_id',ADMIN).gte('created_at',..).lte(..).order('created_at') 패턴으로 5종 조회하고
--   budget_items 도 created_at 정렬 페이지네이션한다. 두 테이블에 created_at/user_id 인덱스가 없어
--   Postgres 가 Seq Scan + Sort 를 수행 → 행수 증가 시 서버 응답시간이 선형 악화(30초 자동갱신이 반복 부과).
--   관리자 전용(RLS admin-only) 표면이라 보안/외부 부하는 아니며, 데이터 성장 대비 서버측 근본 완화.
--
-- 안전: 순수 인덱스 추가(데이터/스키마 의미 불변). IF NOT EXISTS 로 멱등.
--   대용량 운영 후기에 적용 시 쓰기 잠금을 피하려면 CONCURRENTLY 권장(별도 실행, 트랜잭션 밖).

CREATE INDEX IF NOT EXISTS idx_page_views_created_at
  ON public.page_views (created_at);

-- admin 제외 + 기간 + 정렬을 커버하는 복합 인덱스(활성지표 5종 쿼리)
CREATE INDEX IF NOT EXISTS idx_page_views_user_created
  ON public.page_views (user_id, created_at);

-- budget_items 도 created_at 기준 페이지네이션/집계
CREATE INDEX IF NOT EXISTS idx_budget_items_created_at
  ON public.budget_items (created_at);

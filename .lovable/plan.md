
# 관리자 KPI 대시보드 전면 재구축

## 개요
현재의 간단한 관리자 대시보드를 이미지에 표시된 15개 핵심 KPI 지표 기반의 운영 대시보드로 전면 교체합니다. 데모 데이터 모드와 실제 데이터 모드를 모두 지원하며, 기간 필터, 상태 배지, 5개 트렌드 차트, Top 페이지, KPI 정의 테이블을 포함합니다.

## 주요 기능

### 1. 헤더 영역
- 뒤로가기 버튼 + "관리자 KPI 대시보드 (초안)" 제목 + 부제
- "데모 데이터 ON/OFF" 토글 버튼 (cyan 배경)
- "새로고침" 버튼

### 2. 필터 컨트롤 패널
- 기간 선택: 최근 7일 / 최근 30일(기본) / 최근 90일 / 직접 지정
- 세그먼트/플랫폼 드롭다운 (UI만 구현, 향후 확장용)
- 초안 안내 메시지
- 조회 기간 표시

### 3. KPI 카드 15개 (5열 x 3행)
각 카드 구성: KPI ID, 지표명, 현재값, 전기 대비 변화율(%), 설명, 상태 배지(정상/주의/위험/참고)

| ID | 지표명 | 계산식 (실제 데이터 소스) |
|----|--------|--------------------------|
| K01 | 신규 가입자 수 | 기간 내 profiles 생성 수 |
| K02 | DAU | 당일 page_views 고유 user_id 수 |
| K03 | WAU | 최근 7일 page_views 고유 user_id 수 |
| K04 | MAU | 최근 30일 page_views 고유 user_id 수 |
| K05 | Stickiness | DAU / MAU x 100 |
| K06 | D1 리텐션 | 가입 후 1일 재방문 비율 |
| K07 | D7 리텐션 | 가입 후 7일 재방문 비율 |
| K08 | D30 리텐션 | 가입 후 30일 재방문 비율 |
| K09 | 가입->예산 생성(24h) | 가입 후 24시간 내 예산 생성 비율 |
| K10 | 가입->첫 금액 입력(24h) | 가입 후 24시간 내 amount>0 비율 |
| K11 | TTFV 중앙값 | 가입->첫 금액 입력 소요시간 중앙값(분) |
| K12 | 다중 시나리오 사용률 | 예산 2개 이상 사용자 비율 |
| K13 | 공유 링크 생성률 | 활성 사용자 중 shared_budgets 생성 비율 |
| K14 | 스냅샷 사용률 | 활성 사용자 중 budget_snapshots 사용 비율 |
| K15 | 예산 집행률 | is_paid 금액 합 / 전체 금액 합 |

### 4. 상태 배지 임계값 로직
각 KPI에 대해 정상(초록)/주의(노란)/위험(빨간)/참고(회색) 배지를 표시. 임계값은 이미지의 "15개 핵심 지표 정의" 테이블 기준:
- 예: K05 Stickiness: 주의 < 25, 위험 < 20
- 예: K06 D1 리텐션: 주의 < 40, 위험 < 35

### 5. Historical Trend Top 5 차트 (Recharts)
1. **활성 사용자 추이 (DAU/WAU/MAU)** - 3개 라인 차트
2. **온보딩 전환 추이 (가입/생성/입력)** - 3개 바 차트
3. **리텐션 코호트 추이 (D1/D7/D30)** - 3개 라인 차트
4. **핵심 기능 채택률 추이** - 3개 라인 차트
5. **집행률 & TTFV 추이** - 듀얼 Y축 라인 차트

### 6. Top 페이지 섹션
page_views에서 상위 5개 경로를 집계하여 리스트 표시

### 7. 15개 핵심 지표 정의 테이블
ID, 지표명, 계산식, 현재값, 임계 기준을 테이블로 표시

## 기술 상세

### 파일 구조
```
src/pages/Admin.tsx          -- 전면 재작성 (메인 대시보드)
src/hooks/useAdminKPI.tsx    -- 신규: KPI 데이터 페칭 커스텀 훅
src/lib/kpi-definitions.ts   -- 신규: KPI 정의, 임계값, 데모 데이터
```

### 데이터 페칭 전략 (useAdminKPI 훅)
- Supabase에서 profiles, page_views, budgets, budget_items, shared_budgets, budget_snapshots 테이블을 조회
- 기간 필터(startDate, endDate)에 따라 쿼리 필터링
- 이전 기간 대비 변화율 계산 (예: 30일 선택 시 이전 30일과 비교)
- 일별 트렌드 데이터 생성

### RLS 고려사항
- profiles 테이블: 현재 본인만 조회 가능 -> Admin용 `SECURITY DEFINER` 함수 생성 필요
- page_views: 이미 admin SELECT 정책 있음
- budgets, budget_items, shared_budgets, budget_snapshots: admin SELECT 정책 추가 필요

### DB 마이그레이션 필요
Admin이 모든 테이블의 집계 데이터를 조회할 수 있도록 `SECURITY DEFINER` 함수를 생성:
```sql
-- Admin KPI 집계 함수 (RLS 우회)
CREATE OR REPLACE FUNCTION get_admin_kpi_data(p_start_date timestamptz, p_end_date timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- profiles count, page_views aggregation, budgets data 등을 한번에 반환
$function$;
```

또는 더 간단하게: 필요한 테이블들에 admin SELECT RLS 정책 추가:
```sql
-- profiles: admin 조회 허용
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- budgets: admin 조회 허용
CREATE POLICY "Admins can view all budgets"
ON budgets FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- budget_items: admin 조회 허용
CREATE POLICY "Admins can view all budget items"
ON budget_items FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- shared_budgets: admin 조회 허용
CREATE POLICY "Admins can view all shared budgets"
ON shared_budgets FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- budget_snapshots: admin 조회 허용
CREATE POLICY "Admins can view all budget snapshots"
ON budget_snapshots FOR SELECT
USING (has_role(auth.uid(), 'admin'));
```

### 데모 데이터 모드
"데모 데이터 ON" 버튼 토글 시 실제 DB 대신 미리 정의된 데모 데이터(이미지의 수치)를 사용하여 대시보드를 렌더링. 개발/프레젠테이션 용도.

### 반응형 디자인
- 데스크탑: 5열 KPI 카드 그리드
- 태블릿: 3열
- 모바일: 2열
- 차트: 2열 -> 1열 반응형

### 보안
- 기존 useAdmin 훅 + user_roles RLS로 접근 제어 유지
- 모든 데이터 쿼리는 서버 측 RLS 정책으로 보호
- 클라이언트에서 admin이 아닌 경우 즉시 리다이렉트

## 구현 순서
1. DB 마이그레이션: admin용 SELECT RLS 정책 추가 (5개 테이블)
2. `src/lib/kpi-definitions.ts` 생성: KPI 메타데이터, 임계값, 데모 데이터
3. `src/hooks/useAdminKPI.tsx` 생성: 데이터 페칭 및 KPI 계산 로직
4. `src/pages/Admin.tsx` 전면 재작성: 새 대시보드 UI

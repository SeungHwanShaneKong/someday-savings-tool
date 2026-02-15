

# 관리자 대시보드: 실제 데이터만 표시하도록 전면 개선

## 문제 진단

현재 대시보드에는 "데모 데이터"가 혼재되어 있어 실제(fact) 데이터만 보장되지 않습니다.

| 문제 | 위치 | 설명 |
|------|------|------|
| 데모 모드 토글 | Admin.tsx 라인 78, 97-100 | demoMode가 ON이면 가짜 데이터가 표시됨 |
| 하드코딩 데모 Summary | Admin.tsx 라인 58-69 | demoSummaryKPIs에 가짜 숫자가 하드코딩 |
| 데모 KPI/Trend/TopPages | kpi-definitions.ts 라인 96-153 | getDemoKPIValues, getDemoTrendData, getDemoTopPages - 랜덤 가짜 데이터 |
| Trend 차트 고정값 반복 | useAdminKPI.tsx 트렌드 루프 | d1/d7/d30/multiScenario/shareLink/snapshot/executionRate/ttfv가 기간 전체 고정값을 매일 반복 |

## 변경 계획

### 파일 1: `src/pages/Admin.tsx`

**제거 항목:**
- `demoMode` 상태 변수와 토글 버튼 완전 제거
- `demoSummaryKPIs` 하드코딩 객체 제거
- `getDemoKPIValues`, `getDemoTrendData`, `getDemoTopPages` import 및 사용부 제거
- `activeKPIs`, `activeTrend`, `activeTopPages`, `activeSummary` 변수를 실제 데이터만 사용하도록 변경
- 데모 모드 안내 배너(라인 173-177) 제거

**변경 후 데이터 흐름:**
- `kpiValues` -> 직접 사용 (데모 분기 없음)
- `trendData` -> 직접 사용
- `topPages` -> 직접 사용
- `summaryKPIs` -> 직접 사용
- `fetchData` 호출에서 `demoMode` 조건 제거 -- 항상 실제 데이터 fetch

### 파일 2: `src/lib/kpi-definitions.ts`

**제거 항목:**
- `getDemoKPIValues()` 함수 (라인 96-114)
- `getDemoTrendData()` 함수 (라인 116-143)
- `getDemoTopPages()` 함수 (라인 145-153)

나머지 타입 정의, KPI_DEFINITIONS, getKPIStatus, getStatusColor 등은 실제 로직에 필요하므로 유지.

### 파일 3: `src/hooks/useAdminKPI.tsx`

**수정: 트렌드 루프에서 일별 실제값 계산**

현재 문제: `d1`, `d7`, `d30`, `multiScenario`, `shareLink`, `snapshot`, `executionRate`, `ttfv`가 기간 전체에 대해 한 번 계산되고, 그 고정값이 모든 날짜에 반복 삽입됩니다.

수정 방향: 각 트렌드 데이터 포인트에서 해당 날짜까지 누적/해당 날짜 기준으로 실제 계산합니다.

- `d1`, `d7`, `d30` (리텐션): 해당 날짜에 가입한 사용자의 코호트 리텐션을 계산하는 것은 일별 트렌드에서 데이터가 부족하므로, 이 필드들은 일별 트렌드 차트에서 제거하고 KPI 카드에서만 기간 전체 값으로 표시
- `multiScenario`, `shareLink`, `snapshot`, `executionRate`: 해당 날짜 기준 누적값을 계산하거나, 이 역시 기간 전체 값으로만 KPI 카드에 표시
- `ttfv`: 기간 전체 중앙값으로만 KPI 카드에 표시

결론적으로 **Historical Trend 차트 5개 중 일별로 의미 있는 실제 데이터를 생성할 수 없는 차트는 제거**합니다:
- 차트 3 (리텐션 코호트 추이): 일별 코호트 계산 불가 -> 제거
- 차트 4 (핵심 기능 채택률 추이): 일별 계산 불가 -> 제거  
- 차트 5 (집행률 & TTFV 추이): 일별 계산 불가 -> 제거

**유지하는 차트 (실제 일별 데이터 가능):**
- Analytics Insights 3종 (PV, 충성 고객, 체류 시간) -- 이미 일별 실제 계산 로직 존재
- 차트 1 (활성 사용자 추이 DAU/WAU/MAU) -- 이미 일별 실제 계산 로직 존재
- 차트 2 (온보딩 전환 추이 가입/생성/입력) -- signups, budgetCreated는 일별 실제 계산됨, amountEntered는 현재 항상 0이므로 일별 실제 계산 추가

**amountEntered 일별 계산 추가:**
- 트렌드 루프에서 해당 날짜에 생성된 budget_items 중 amount > 0인 건수를 계산

### 트렌드 데이터 정리

`TrendDataPoint` 인터페이스에서 제거할 필드:
- `d1`, `d7`, `d30`, `multiScenario`, `shareLink`, `snapshot`, `executionRate`, `ttfv`

유지할 필드:
- `date`, `dau`, `wau`, `mau`, `signups`, `budgetCreated`, `amountEntered`, `pv`, `loyalCount`, `avgDuration`

## 검증 계획 (3가지 시나리오)

구현 완료 후 다음 3가지 시나리오로 검증합니다:

**시나리오 1: 데모 모드 완전 제거 확인**
- 대시보드 헤더에 "데모 ON/OFF" 버튼이 없는지 확인
- 코드에서 `demoMode`, `getDemoKPIValues` 등의 참조가 없는지 확인

**시나리오 2: 데이터 없는 상태 처리**
- 실제 DB에 데이터가 없을 경우 KPI 카드가 0/빈 상태로 표시되는지 확인
- 차트가 빈 데이터로 깨지지 않는지 확인

**시나리오 3: 실제 데이터 연동**
- page_views 테이블에서 실제 조회하여 PV/충성 고객/체류 시간이 DB 값과 일치하는지 SQL 쿼리로 교차 검증

## 기술 요약

- 변경 파일 3개: `Admin.tsx`, `kpi-definitions.ts`, `useAdminKPI.tsx`
- 데모 데이터 관련 코드 완전 삭제
- 일별 계산 불가능한 트렌드 차트 3개 제거
- amountEntered 일별 실제 계산 로직 추가
- DB 변경 없음



# 관리자 대시보드 시계열 분석 그래프 고도화

## 개요
상단 3종 KPI 위젯(PV, 충성 고객, 체류 시간) 아래에 **"Analytics Insights"** 섹션을 신설하여 3개의 Area Chart로 일별 추이를 시각화합니다. 기존 기간 필터(7/30/90일)에 **YTD(올해 전체)** 옵션을 추가하고, 차트 전용 Segmented Control을 배치합니다.

## 변경 파일

### 1. `src/hooks/useAdminKPI.tsx`
- `TrendDataPoint` 타입 또는 별도 `SummaryTrendPoint` 타입에 3개 필드 추가:
  - `pv`: 해당 일의 총 page_views 수
  - `loyalCount`: 해당 일 기준 최근 7일간 2회+ 방문 고유 사용자 수
  - `avgDuration`: 해당 일의 평균 duration_seconds (초)
- 기존 trend 생성 루프(라인 237-278)에서 이 3개 값을 계산하여 포함
- `prevAvgSessionTime` 계산을 실제 이전 기간 duration_seconds를 fetch하도록 수정 (현재 0으로 고정됨)

### 2. `src/lib/kpi-definitions.ts`
- `TrendDataPoint` 인터페이스에 `pv`, `loyalCount`, `avgDuration` 필드 추가
- 데모 트렌드 데이터에 해당 필드의 샘플 값 추가

### 3. `src/pages/Admin.tsx`
- **PERIOD_OPTIONS**에 YTD 옵션 추가: `{ label: '올해 전체', value: 'ytd' }`
- 기간 계산 로직에서 `ytd` 처리: startDate를 올해 1월 1일로 설정
- **상단 KPI 위젯 아래, 15개 KPI 그리드 위**에 "Analytics Insights" 섹션 추가:

```
[Analytics Insights 헤더]
 ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
 │ 페이지뷰 추이    │ │ 충성 고객 추이    │ │ 평균 체류 시간    │
 │ (Area Chart)    │ │ (Area Chart)    │ │ (Area Chart)    │
 │                 │ │                 │ │                 │
 └─────────────────┘ └─────────────────┘ └─────────────────┘
  데스크톱: 3열 그리드  /  모바일: 1열 스택
```

### 차트 사양

**차트 1: 페이지뷰 추이**
- 타입: AreaChart (그라데이션 fill)
- dataKey: `pv`
- 색상: blue-500 (#3b82f6), fill opacity 0.15
- Y축: 건수
- Tooltip: "날짜: MM/DD, PV: N건"

**차트 2: 충성 고객 추이**
- 타입: AreaChart (그라데이션 fill)
- dataKey: `loyalCount`
- 색상: violet-500 (#8b5cf6), fill opacity 0.15
- Y축: 명
- Tooltip: "날짜: MM/DD, 충성 고객: N명"

**차트 3: 평균 체류 시간 추이**
- 타입: AreaChart (그라데이션 fill)
- dataKey: `avgDuration`
- 색상: amber-500 (#f59e0b), fill opacity 0.15
- Y축: 초 -> mm:ss 포맷 (커스텀 tickFormatter)
- Tooltip: 커스텀 formatter로 mm:ss 표시

### 공통 차트 설정
- `CartesianGrid` strokeDasharray="3 3"
- `XAxis` tick fontSize 12, 날짜 포맷 M/dd
- `Legend` 표시
- `activeDot` r=6
- 높이: h-56 sm:h-64
- 호버: `hover:shadow-md transition-shadow`
- 반응형: `grid-cols-1 sm:grid-cols-3`

### Recharts 추가 import
- `AreaChart`, `Area`, `defs`, `linearGradient`, `stop` 추가

## 구현 순서
1. `src/lib/kpi-definitions.ts` -- TrendDataPoint에 pv/loyalCount/avgDuration 추가 + 데모 데이터 보강
2. `src/hooks/useAdminKPI.tsx` -- trend 생성 루프에서 3개 필드 계산 + prevAvgSessionTime 수정
3. `src/pages/Admin.tsx` -- YTD 필터 추가 + Analytics Insights 섹션(3개 AreaChart) 삽입

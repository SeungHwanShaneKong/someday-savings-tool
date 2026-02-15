

# 관리자 대시보드 사용성 및 데이터 시각화 고도화

## 1. 변경 범위

**파일**: `src/pages/Admin.tsx` (전면 개선)

현재 대시보드의 3가지 핵심 문제를 해결합니다:
- 모바일/태블릿에서 폰트가 너무 작아 가독성 저하
- 정적 카드 나열 방식으로 인터랙션 부재
- 상단에 핵심 요약 KPI(PV, 충성 고객, 체류 시간)가 없음

---

## 2. 반응형 타이포그래피 시스템

현재 `text-[10px]`, `text-xs`, `text-sm` 위주의 폰트 크기를 전면 상향 조정합니다.

| 요소 | 현재 | 개선 후 |
|------|------|---------|
| KPI ID | text-[10px] | text-xs sm:text-sm |
| KPI 지표명 | text-xs | text-sm sm:text-base |
| KPI 현재값 | text-xl | text-2xl sm:text-3xl |
| 변화율 텍스트 | text-[10px] | text-xs sm:text-sm |
| 설명 텍스트 | text-[10px] | text-xs sm:text-sm |
| 상태 배지 | text-[10px] | text-xs |
| 차트 제목 | text-sm | text-base sm:text-lg |
| 헤더 제목 | text-lg | text-xl sm:text-2xl |
| 필터/날짜 | text-xs | text-sm |
| 테이블 셀 | text-xs | text-sm |

줄 간격(line-height)을 `leading-relaxed`(1.625)로 설정하여 텍스트 밀집도 완화.

---

## 3. 상단 3종 KPI 위젯 카드

필터 패널 아래, 15개 KPI 그리드 위에 3개의 대형 요약 카드를 배치합니다.

### 카드 1: 페이지뷰 (PV)
- 아이콘: `BarChart3` (lucide)
- 데이터: 기간 내 총 page_views 수
- 부가 정보: 일간/주간/월간 수치를 소형 텍스트로 표시
- 전기 대비 증감률 표시

### 카드 2: 충성 고객 수
- 아이콘: `Users` (lucide)
- 데이터: 기간 내 재방문(2회 이상 방문) 고유 사용자 수
- 부가 정보: 전체 방문자 중 비율(%)
- 전기 대비 증감률 표시

### 카드 3: 평균 체류 시간
- 아이콘: `Clock` (lucide)
- 데이터: page_views의 duration_seconds 평균을 분:초로 변환
- 부가 정보: 전일 대비 증감 표시
- 전기 대비 증감률 표시

3개 카드는 `grid-cols-1 sm:grid-cols-3` 레이아웃으로 배치하며, 각 카드에 그라데이션 배경과 큰 폰트(text-3xl~4xl)를 적용합니다.

---

## 4. 인터랙티브 UI/UX 요소

### 호버 효과
- KPI 카드: `hover:shadow-lg hover:scale-[1.02] transition-all duration-200`
- 상단 KPI 위젯: `hover:shadow-xl` + 배경 밝기 변화
- Top 페이지 행: `hover:bg-muted/50`

### 툴팁
- 각 KPI 카드에 `Tooltip` 컴포넌트 래핑
- 트리거: KPI 이름 또는 Info 아이콘 호버/터치
- 내용: 계산식(formula) + 임계 기준 설명

### 차트 인터랙션
- Recharts `activeDot` 크기 증가 (r=6)
- 차트 높이를 h-52에서 h-64로 확대
- 차트 폰트 크기 10px에서 12px로 상향

---

## 5. useAdminKPI 훅 확장

기존 훅에 3개의 새로운 계산값을 추가합니다:

```
totalPageViews: number      // 기간 내 총 PV 수
loyalUsers: number          // 재방문(2회+) 고유 사용자 수  
avgSessionTime: number      // 평균 체류 시간 (초)
prevTotalPageViews: number  // 전기 PV (변화율 계산용)
prevLoyalUsers: number      // 전기 충성 고객
prevAvgSessionTime: number  // 전기 평균 체류 시간
```

이미 page_views에서 `duration_seconds`를 가져오고 있으므로 추가 DB 쿼리 없이 계산 가능합니다.

---

## 6. 기술 상세

### 변경 파일
- `src/pages/Admin.tsx` -- 타이포그래피 전면 개선 + 상단 KPI 위젯 3종 추가 + 호버/툴팁 인터랙션
- `src/hooks/useAdminKPI.tsx` -- totalPageViews, loyalUsers, avgSessionTime 계산 추가

### 추가 import
```typescript
import { BarChart3, Users, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
```

### 반응형 그리드
- 상단 KPI 위젯: `grid-cols-1 sm:grid-cols-3`
- 15개 KPI 카드: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5` (모바일 1열로 변경)
- 차트: `grid-cols-1 md:grid-cols-2` (유지)

### 보안
- 기존 useAdmin 훅 + RLS 정책 유지
- 추가 DB 변경 없음 (이미 이전 마이그레이션에서 admin SELECT 정책 적용 완료)


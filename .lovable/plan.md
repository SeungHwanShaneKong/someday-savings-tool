# '축의금 (예상)' 수익 처리 로직 구현

## 개요

현재 '축의금 (예상)' 항목은 다른 비용 항목과 동일하게 합산되고 있습니다. 이를 **수익(income)** 으로 처리하여 총 비용에서 **차감**되도록 모든 합계 계산 로직을 수정합니다.

## 핵심 로직

축의금 항목 판별 조건: `item.category === 'main-ceremony' && item.sub_category === 'expected-gift-money'`

합계 공식 변경: `총 비용 = Σ(일반 항목 amount) - Σ(축의금 항목 amount)`

## 공통 유틸리티 함수 추가

### `src/lib/budget-categories.ts`

수익 항목 판별 헬퍼 함수를 추가하여 모든 파일에서 일관되게 사용:

```typescript
export const isIncomeItem = (category: string, subCategory: string): boolean =>
  category === 'main-ceremony' && subCategory === 'expected-gift-money';

export const calculateNetTotal = (items: { category: string; sub_category: string; amount: number }[]): number =>
  items.reduce((sum, item) =>
    isIncomeItem(item.category, item.sub_category) ? sum - item.amount : sum + item.amount, 0);
```

## 수정 대상 파일 (총 7개)

### 1. `src/hooks/useBudget.tsx` (라인 164)

- `getTotal()`: `calculateNetTotal(items)` 사용
- `getPaidTotal()`, `getPendingTotal()`도 동일하게 수익 항목 차감 적용

### 2. `src/hooks/useMultipleBudgets.tsx` (라인 458)

- `getTotal()`: `calculateNetTotal(items)` 사용

### 3. `src/components/BudgetTable.tsx`

- `getOverallTotal()` 함수에 동일 로직 적용 (존재하는 경우)

### 4. `src/components/BudgetTableMobile.tsx` (라인 169-171)

- `getOverallTotal()`: `calculateNetTotal(items)` 사용

### 5. `src/pages/Summary.tsx` (라인 75-84)

- `getBudgetTotal()`: `calculateNetTotal(budgetItems)` 사용
- `getCategoryTotal()`: 카테고리별 합계는 그대로 유지 (카테고리 내에서는 양수 표시)

### 6. `src/components/BudgetComparisonDashboard.tsx` (라인 51-54)

- `budgetTotals` 계산: `calculateNetTotal(budget.items)` 사용

### 7. `src/pages/SharedBudget.tsx` (라인 82)

- `total` 계산: `calculateNetTotal(data.items)` 사용

### 8. `src/components/BudgetDonutChart.tsx` (라인 20, 29)

- 도넛 차트의 총계 계산에서 축의금을 수익으로 표시
- 차트 데이터에서는 축의금 카테고리 금액을 양수로 표시하되, 중앙 총합은 순비용으로 표시

### 9. `src/components/FloatingTotalBar.tsx`

- 이 컴포넌트는 `total` prop을 받으므로 자체 수정 불필요 (호출부에서 처리)

필요하다면, 관련하여 바꿔야 차트나, 수치들을 내용에 충돌이 없도록 업그레이드해 주세요.

## UI 표시 개선

- 총계 라벨을 "총 예상 비용"에서 상황에 맞게 유지하되, 축의금이 차감된 **순비용**임을 사용자가 인지할 수 있도록 함
- 축의금 항목에 수익 표시 뱃지 또는 마이너스(-) 부호를 추가하여 시각적 구분

## 검증 시나리오 (3회 독립 테스트)

1. **시나리오 1 - BudgetFlow 페이지**: 본식 운영 카테고리에서 축의금 금액 입력 후, FloatingTotalBar의 총 예상 비용이 (다른 항목 합계 - 축의금)으로 표시되는지 확인
2. **시나리오 2 - Summary 페이지**: 여러 예산 옵션의 비교 대시보드에서 각 옵션의 총액이 축의금을 차감한 순비용으로 계산되는지 확인
3. **시나리오 3 - SharedBudget 페이지**: 공유 링크로 접속 시 총 예상 비용이 축의금 차감된 값으로 표시되는지 확인

## 기술적 고려사항

- `calculateNetTotal` 유틸리티를 중앙에 두어 로직 중복 방지
- 카테고리별 소계(getCategoryTotal)는 변경하지 않음 - 본식 운영 카테고리 내에서 축의금은 양수로 표시
- 전체 합계에서만 차감 처리
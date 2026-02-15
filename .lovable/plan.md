

# '축의금 (예상)' 항목 추가 및 자동 계산 로직 구현

## 개요
'본식 운영' 카테고리에서 '식대비'와 '답례품 준비비' 사이에 '축의금 (예상)' 항목을 추가합니다. 이 항목은 기존 '식대비'의 MealCostCalculator와 유사하게 '하객 수 x 1인당 평균 축의금' 방식의 자동 계산 UI를 제공합니다.

## 변경 파일 및 상세 내용

### 1. `src/lib/budget-categories.ts`
- `main-ceremony` 카테고리의 `subCategories` 배열에서 `meal-cost` 바로 뒤, `thank-you-gifts` 바로 앞에 새 항목 삽입:
```typescript
{ id: 'expected-gift-money', name: '축의금 (예상)', placeholder: '예상 축의금 수입' }
```

### 2. `src/lib/average-costs.ts`
- `main-ceremony` 섹션에 평균 비용 데이터 추가:
```typescript
'expected-gift-money': { amount: 10000000, note: '200명 기준, 1인당 5만원' }
```

### 3. `src/components/BudgetTable.tsx` (데스크탑 테이블)
- `renderItemRow` 함수 내 `isMealCostItem` 체크 로직 옆에 축의금 항목 감지 변수 추가:
```typescript
const isGiftMoneyItem = category.id === 'main-ceremony' && subCat.id === 'expected-gift-money';
```
- 비용 컬럼에서 `isMealCostItem`과 동일한 패턴으로 Users 아이콘 + Popover 계산기를 렌더링. Popover 내용:
  - **하객 수 (명)**: 숫자 입력
  - **1인당 평균 축의금 (원)**: 숫자 입력
  - **실시간 계산 미리보기**: `하객수 x 1인당 축의금 = 총액`
  - **적용 버튼**: `handlePerPersonSave` 호출
- 기존 `isMealCostItem` 조건을 `(isMealCostItem || isGiftMoneyItem)`으로 확장하여 동일한 Popover 로직을 공유하되, 라벨만 다르게 표시:
  - 식대비: "인원수 계산" / "1인당 비용"
  - 축의금: "축의금 계산" / "1인당 평균 축의금"

### 4. `src/components/BudgetTableMobile.tsx` (모바일 테이블)
- 데스크탑과 동일한 패턴으로 `isGiftMoneyItem` 감지 및 계산기 Popover 추가
- 모바일 `isMealCostItem` 조건을 `(isMealCostItem || isGiftMoneyItem)`으로 확장

### 5. `src/components/CategoryStep.tsx` (BudgetFlow 단계별 입력)
- 변경 불필요: 기존 로직이 `category.subCategories`를 순회하므로 자동으로 새 항목이 표시됨

## 합계 로직 영향
- 축의금은 **수입** 항목이지만, 현재 시스템에는 수입/지출 구분이 없으므로 다른 항목과 동일하게 금액으로 관리됨
- 사용자가 메모란에 "수입" 등을 기재하여 구분할 수 있음
- 총계에는 다른 항목과 동일하게 합산됨 (기존 `getOverallTotal()` 로직 변경 불필요)

## 기존 데이터 호환성
- 기존 사용자의 budget에는 `expected-gift-money` 항목이 없음
- `BudgetTable`의 `getCategoryItems()`는 `category.subCategories`를 순회하며 `getItem()`으로 매칭하므로, 해당 항목이 DB에 없으면 단순히 표시되지 않음
- 신규 예산 생성 시 `useMultipleBudgets`의 `createNewBudget()`이 `BUDGET_CATEGORIES`를 순회하여 자동으로 새 항목을 초기화함
- 기존 사용자에게는 "항목 추가" 버튼으로 커스텀 항목을 추가하는 것과 동일한 흐름으로, 해당 카테고리에 자동으로 빈 행이 나타남 (단, 기존 budget에 대해서는 수동으로 추가해야 함)

## 기술적 제약 및 고려사항
- Popover 라벨을 항목 유형에 따라 동적으로 변경하여 컨텍스트에 맞는 UX 제공
- `unit_price`와 `quantity` 필드는 이미 DB 스키마에 존재하므로 마이그레이션 불필요
- 포맷팅: 기존 `formatKoreanWon()` 및 `₩{amount.toLocaleString()}` 패턴 그대로 사용


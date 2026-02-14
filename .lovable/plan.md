
# 태블릿 화면 커피 FAB 버튼 중첩 해결

## 문제 분석

현재 `BudgetFlow.tsx`의 main 영역에 `pb-24 sm:pb-6`이 적용되어 있음. Tailwind의 `sm:` 브레이크포인트는 640px부터 적용되므로, 태블릿(768px~1024px)에서도 `pb-6`으로 줄어들어 FAB 버튼과 하단 총계 카드가 겹침.

FAB 버튼은 `fixed z-50 bottom-[calc(1.25rem+env(safe-area-inset-bottom))]`로 모든 화면에서 우하단에 고정되어 있으므로, 데스크탑(lg: 1024px+)에서만 여백을 줄여야 함.

## 수정 사항

### 1. `src/pages/BudgetFlow.tsx`
- `pb-24 sm:pb-6` -> `pb-24 lg:pb-6`으로 변경
- 태블릿(640px~1023px)까지 pb-24 유지, 데스크탑(1024px+)부터 pb-6 적용

### 2. `src/components/BudgetTableMobile.tsx`
- 이미 추가된 `h-16` spacer는 모바일 전용 컴포넌트이므로 그대로 유지 (태블릿에서는 데스크탑 BudgetTable이 렌더링됨)

## 검증 계획

구현 후 3가지 시나리오로 브라우저 테스트 실시:
1. iPad (834x1194) - 세로 모드에서 스크롤 최하단 FAB 겹침 확인
2. iPad 가로 (1194x834) - 가로 모드에서 레이아웃 확인
3. Galaxy Tab (820x1180) - Android 태블릿 시뮬레이션

## 기술 상세

변경은 단 1줄: `sm:pb-6` -> `lg:pb-6`. `isMobile` 훅은 768px 미만에서 true를 반환하므로, 768px~1023px 태블릿에서는 데스크탑 `BudgetTable`이 렌더링되지만 FAB은 여전히 표시됨. 따라서 이 범위에서도 하단 여백이 필요함.


# 모바일 레이아웃 최적화 및 UI 시각 효과 강화

## 과업 1: 커피 FAB과 예산 총계 영역 중첩 해결

### 문제 분석
- `CoffeeDonationFab`은 `fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-3 z-50`으로 화면 우하단에 고정
- `BudgetTableMobile`의 총계 카드는 스크롤 흐름의 마지막에 위치 (스크롤 최하단에서 FAB과 겹침)
- 두 요소의 높이가 유사하여 스크롤 최하단에서 총계 금액이 FAB 뒤에 가려짐

### 해결 방법

#### 1-1. `src/components/BudgetTableMobile.tsx` - 총계 카드 하단 여백 추가
- 총계 카드 아래에 FAB 높이만큼의 여백(spacer)을 추가하여 스크롤 최하단에서도 총계가 FAB 위로 완전히 노출되도록 함
- `pb-20` (80px) 정도의 하단 패딩을 최외곽 컨테이너에 적용

#### 1-2. `src/pages/BudgetFlow.tsx` - main 영역 하단 여백
- `main` 태그에 모바일에서 FAB을 고려한 `pb-24` 하단 패딩 추가
- 데스크탑에서는 기존 여백 유지

#### 1-3. `src/components/CoffeeDonationModal.tsx` - FAB 위치 미세 조정 (선택적)
- FAB의 `bottom` 값을 약간 높여 총계 카드와의 간격을 더 확보

---

## 과업 2: 식대비 입력 버튼 시각화 강화

### 대상 요소
- `BudgetTableMobile.tsx` 내 식대비 항목의 `Users` 아이콘 버튼 (인원수 계산 팝오버 트리거)

### 변경 사항

#### 2-1. `src/components/BudgetTableMobile.tsx` - 식대비 버튼 디자인 강화
- 현재: `variant="outline"` + 기본 스타일의 작은 아이콘 버튼
- 변경:
  - 배경을 `bg-primary text-white` (고대비 파란색)으로 변경
  - `shadow-md` 추가로 입체감 부여
  - `animate-pulse` 변형의 부드러운 glow 효과 적용 (한 번만 표시하고 값 입력 후 중단)
  - 버튼 크기를 `h-8 w-8`에서 약간 키우고 `rounded-lg`로 변경
  - 터치/탭 시 `active:scale-95` 피드백 추가
  - 라벨 텍스트 "식대 계산" 추가하여 아이콘만 있을 때보다 용도가 명확하도록 함

#### 2-2. Tailwind 커스텀 애니메이션 (기존 `tailwind.config.ts` 활용)
- 새로운 `glow-pulse` 키프레임 추가: `box-shadow`가 부드럽게 확장/축소되는 효과
- 식대비 버튼에 금액 미입력 상태일 때만 애니메이션 활성화 (입력 완료 시 정적 상태로 전환)

---

## 수정 파일 요약

| 파일 | 변경 내용 |
|------|----------|
| `src/pages/BudgetFlow.tsx` | main 영역에 모바일 하단 여백 `pb-24` 추가 |
| `src/components/BudgetTableMobile.tsx` | 총계 카드 아래 spacer 추가 + 식대비 버튼 고대비 디자인 및 glow 애니메이션 |
| `tailwind.config.ts` | `glow-pulse` 키프레임/애니메이션 추가 |

---

## 기술 상세

### 하단 여백 계산 로직
```text
FAB 높이: ~48px (py-3 + 텍스트)
Safe area 여백: ~20px + env(safe-area-inset-bottom)
필요 총 여백: ~96px (pb-24)
```

### 식대비 버튼 glow 효과
```text
@keyframes glow-pulse:
  0%, 100%: box-shadow: 0 0 0 0 rgba(0, 100, 255, 0.4)
  50%: box-shadow: 0 0 12px 4px rgba(0, 100, 255, 0.2)
  
조건: item.amount === 0 일 때만 animate-glow-pulse 적용
      금액 입력 완료 시 애니메이션 자동 중단
```

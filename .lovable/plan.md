

# Preview 모드 완전 인증 우회

## 문제
- Preview 환경에서 Google OAuth가 지원되지 않아 로그인 실패
- 페이지 가드는 이미 우회했지만, `/auth` 페이지에서 로그인 버튼을 누르면 에러 발생
- 또한 `useMultipleBudgets`/`useBudget` 훅에서 `if (!user) return;`으로 데이터 로딩을 스킵하므로 빈 화면이 표시될 수 있음

## 변경 내용

### 1. `src/pages/Auth.tsx` - Preview 모드에서 자동 리다이렉트
- Preview 모드 감지 시 로그인 페이지를 보여주지 않고, 즉시 `/budget`으로 리다이렉트
```typescript
import { isPreviewMode } from '@/lib/utils';

// 기존 user 체크 직후 추가
if (!loading && !user && isPreviewMode()) {
  return <Navigate to="/budget" replace />;
}
```

### 2. `src/pages/BudgetFlow.tsx` - Preview 모드에서 데모 데이터 로딩
- `user`가 null이고 `isPreviewMode()`일 때, 빈 상태 대신 기본 카테고리 구조의 빈 예산 UI를 표시
- 이미 auth 가드 우회는 적용되어 있으므로, 데이터가 비어있더라도 페이지 자체는 접근 가능
- 현재 구조상 `useMultipleBudgets`가 user 없이는 fetch하지 않으므로, "새 예산 만들기" 등의 빈 상태 UI가 자연스럽게 표시됨

### 3. `src/pages/Landing.tsx` - Preview 모드에서 CTA 버튼 경로 변경 (선택적)
- "시작하기" 버튼이 `/auth`로 이동하는 경우, Preview 모드에서는 `/budget`으로 직접 이동하도록 변경

## 영향 범위
- Preview 모드에서는 인증 없이 UI 탐색 가능 (데이터는 RLS로 보호되어 빈 상태)
- 프로덕션 환경에는 전혀 영향 없음
- 기존 `isPreviewMode()` 헬퍼 함수 재활용




# Preview 환경 인증 우회 구현

## 개요
Preview URL(`id-preview--*.lovable.app`)에서만 로그인 없이 모든 페이지에 접근할 수 있도록 인증 체크를 우회합니다. Published URL(`someday-savings-tool.lovable.app`)에서는 기존 인증 로직이 그대로 유지됩니다.

## 구현 방법

### 1. Preview 환경 감지 유틸리티 추가 (`src/lib/utils.ts`)
```typescript
export function isPreviewEnvironment(): boolean {
  return window.location.hostname.includes('id-preview--');
}
```

### 2. 인증 우회가 필요한 3개 파일 수정

| 파일 | 현재 동작 | 변경 내용 |
|------|----------|----------|
| `src/pages/BudgetFlow.tsx` (139행) | `!user` 시 `/auth`로 리다이렉트 | Preview면 리다이렉트 스킵 |
| `src/pages/Summary.tsx` (97행) | `!user` 시 `/auth`로 리다이렉트 | Preview면 리다이렉트 스킵 |
| `src/pages/Admin.tsx` (56행) | `!user` 시 `/auth`로 navigate | Preview면 navigate 스킵 + `isAdmin=true` 강제 |

각 파일에서 인증 체크 조건에 `&& !isPreviewEnvironment()` 를 추가합니다.

### 3. Admin 페이지 특수 처리
Admin은 인증뿐 아니라 `isAdmin` 권한 체크도 있으므로, Preview 환경에서는 두 조건 모두 스킵하도록 처리합니다.

### 4. useMultipleBudgets 훅 호환성
`user`가 null일 때 데이터 로딩이 실패할 수 있으므로, Preview에서 user가 없을 때에도 데모/빈 상태로 정상 렌더링되는지 확인이 필요합니다.

## 검증 계획 (3회 시나리오 테스트)
1. **시나리오 A**: 비로그인 상태에서 `/budget` 직접 접근 → 페이지가 렌더링되는지 확인
2. **시나리오 B**: 비로그인 상태에서 `/summary` 직접 접근 → 페이지가 렌더링되는지 확인
3. **시나리오 C**: 비로그인 상태에서 `/admin` 직접 접근 → 대시보드가 렌더링되는지 확인

## 보안 고려
- `isPreviewEnvironment()`는 클라이언트 사이드 체크이므로 UI 접근만 허용
- DB 쿼리는 여전히 RLS 정책에 의해 보호됨 (user가 없으면 데이터 조회 불가)
- Published 환경에서는 일체 영향 없음


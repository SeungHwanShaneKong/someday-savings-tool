

# Preview 환경에서 인증 없이 모든 페이지 접근 허용

## 개요
Preview 환경(lovable.app 도메인)에서는 로그인 없이 모든 페이지(/budget, /summary, /admin)로 자유롭게 이동할 수 있도록 인증 가드를 조건부로 비활성화합니다.

## 변경 내용

### 1. `src/lib/utils.ts` - Preview 환경 감지 헬퍼 추가
```typescript
export const isPreviewMode = () => {
  return window.location.hostname.includes('preview') 
    && window.location.hostname.includes('lovable.app');
};
```

### 2. `src/pages/BudgetFlow.tsx` - 인증 가드 조건부 해제
기존:
```typescript
if (!authLoading && !user) {
  return <Navigate to="/auth" replace />;
}
```
변경:
```typescript
if (!authLoading && !user && !isPreviewMode()) {
  return <Navigate to="/auth" replace />;
}
```

### 3. `src/pages/Summary.tsx` - 동일 패턴 적용
인증 체크에 `&& !isPreviewMode()` 조건 추가

### 4. `src/pages/Admin.tsx` - 동일 패턴 적용
`useEffect` 내 인증/권한 체크에 `isPreviewMode()` 조건 추가:
```typescript
useEffect(() => {
  if (isPreviewMode()) return; // Preview에서는 체크 스킵
  if (!authLoading && !user) { navigate('/auth'); return; }
  if (!adminLoading && !isAdmin) { navigate('/'); return; }
}, [user, authLoading, isAdmin, adminLoading, navigate]);
```

### 5. `src/hooks/useMultipleBudgets.tsx` / `src/hooks/useBudget.tsx` - 데이터 로딩
- Preview 모드에서 `user`가 null이면 데이터 fetch를 스킵하므로, 페이지는 보이지만 데이터는 비어있을 수 있음
- 이는 예상된 동작이며, 데모 데이터나 빈 상태 UI가 표시됨

## 보안 고려사항
- `isPreviewMode()`는 Lovable preview 도메인(`*-preview--*.lovable.app`)에서만 true 반환
- 프로덕션 배포(`someday-savings-tool.lovable.app`)에서는 기존 인증 로직 그대로 유지
- RLS 정책은 서버 측에서 여전히 적용되므로 데이터 보안에는 영향 없음


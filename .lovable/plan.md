
# 관리자 버튼 조건부 노출 구현

## 변경 사항

**파일**: `src/pages/BudgetFlow.tsx`

"요약 보기" 버튼(line 267)과 `<LogoutButton />`(line 268) 사이에 관리자 버튼을 조건부로 삽입합니다.

## 구현 방식

1. `useAuth` 훅에서 `user` 객체를 가져옴 (이미 import 되어 있을 가능성 확인 필요)
2. `user?.email === 'seunghwan.kong@gmail.com'` 조건으로 버튼을 조건부 렌더링
3. 클릭 시 `/admin` 경로로 이동
4. 로딩 중 깜빡임 방지를 위해 `loading` 상태도 함께 체크

## 기술 상세

### 추가할 import (필요시)
```typescript
import { useAuth } from '@/hooks/useAuth';
import { Shield } from 'lucide-react';
```

### 삽입 위치 (line 267 뒤, line 268 앞)
```tsx
{!loading && user?.email === 'seunghwan.kong@gmail.com' && (
  <Button
    onClick={() => navigate('/admin')}
    variant="outline"
    size="sm"
    className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
  >
    <Shield className="h-3.5 w-3.5" />
    <span className="hidden sm:inline">관리자</span>
    <span className="sm:hidden">관리</span>
  </Button>
)}
```

### 보안 참고
- 클라이언트 측 이메일 비교는 UI 가시성 제어 전용
- 실제 관리자 페이지(`/admin`)의 데이터 접근 권한은 기존 `useAdmin` 훅 + `user_roles` 테이블의 서버 측 RLS 정책으로 보호됨
- DOM에서 완전히 제거하는 조건부 렌더링 방식 사용 (`display: none` 아님)

### 검증 기준
- `seunghwan.kong@gmail.com` 로그인 시: 요약 보기 우측에 관리자 버튼 노출
- 다른 이메일 로그인 시: 버튼 미노출
- 로그아웃 상태: 버튼 미노출

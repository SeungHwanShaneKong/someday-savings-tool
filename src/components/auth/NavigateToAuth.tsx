// [CL-LOGIN-GATE-20260709-233447 | by:frontend-engineer]
// NavigateToAuth — 게이트 페이지 공용 /auth 리다이렉트.
// 원래 목적지(returnTo = pathname + search)를 라우터 state 로 전달해, 로그인 완료 후
// Auth.tsx 가 살균(sanitizeReturnTo) 후 원위치로 복귀시킨다. Auth.tsx 와 한 쌍의 계약.
import { Navigate, useLocation } from 'react-router-dom';

export function NavigateToAuth() {
  const location = useLocation();
  return (
    <Navigate
      to="/auth"
      replace
      state={{ returnTo: location.pathname + location.search }}
    />
  );
}

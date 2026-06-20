// [CL-COEDIT-E2E-20260620-130000] OAuth 복귀 후 초대 재개 워처
//
// 미로그인 상태로 /invite/:token 진입 → 토큰 stash → 구글 로그인 → /auth 복귀.
// user 가 null→set 으로 전이하면 보존된 토큰을 consume 해 /invite/:token 으로 재이동한다.
// ※ App(Router+AuthProvider 내부)에 마운트. useAuth 코어 무수정 — 순수 추가형.
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { consumeInviteToken, safeSessionStorage } from '@/lib/collab/invite-resume';

export function InviteResumeWatcher() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const handledRef = useRef(false);

  useEffect(() => {
    if (!user || handledRef.current) return;
    const token = consumeInviteToken(safeSessionStorage(), Date.now());
    if (token) {
      handledRef.current = true;
      navigate(`/invite/${token}`, { replace: true });
    }
  }, [user, navigate]);

  return null;
}

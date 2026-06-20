// [CL-COEDIT-E2E-20260620-130000] 공동 예산 초대 수락 페이지 (/invite/:token)
//
// 흐름(완성된 src/lib/collab/invite-resume.ts 사용):
//  - 토큰 형식 불량 → 에러 UI
//  - 미로그인 → 토큰 stash 후 구글 로그인 → OAuth 복귀(/auth) → InviteResumeWatcher 가 /invite/:token 재진입
//  - 로그인됨 → accept_budget_invitation RPC → 결과 분기(수락/이미멤버/오너/만료/무효)
// ※ 추가형 — useAuth 코어 무수정. signInWithGoogle 만 호출.
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/hooks/useSEO';
import {
  decideInviteAction,
  stashInviteToken,
  normalizeAcceptResult,
  safeSessionStorage,
} from '@/lib/collab/invite-resume';
import { WORKSPACE_MODE_KEY } from '@/lib/collab/workspace';

type Phase = 'checking' | 'accepting' | 'error';

export default function AcceptInvite() {
  const { token } = useParams();
  const { user, loading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>('checking');
  const [errorMsg, setErrorMsg] = useState('');
  const ranRef = useRef(false);

  useSEO({ title: '공동 예산 초대 - 웨딩셈', description: '파트너의 공동 예산 초대를 수락합니다.', path: '/invite' });

  useEffect(() => {
    if (loading) return; // 인증 상태 확정 대기
    if (ranRef.current) return; // 1회만 실행
    ranRef.current = true;

    const action = decideInviteAction(token, !!user);

    if (action.kind === 'invalid') {
      setErrorMsg('유효하지 않은 초대 링크예요.');
      setPhase('error');
      return;
    }

    if (action.kind === 'login-required') {
      // 토큰 보존 후 구글 로그인 → 복귀 시 InviteResumeWatcher 가 재개
      stashInviteToken(action.token, safeSessionStorage(), Date.now());
      void signInWithGoogle();
      return; // 이동 중 — 'checking' 유지
    }

    // 로그인됨 → 수락
    setPhase('accepting');
    void (async () => {
      try {
        // [CL-COEDIT-QA200-FIX-20260620] rpc 가 {data,error} 대신 reject(throw)해도(네트워크 예외 등)
        // 무한 로딩에 고착되지 않도록 try/catch 로 감싸 에러 UI 로 전환한다.
        const { data, error } = await supabase.rpc('accept_budget_invitation', { p_token: action.token });
        const outcome = normalizeAcceptResult(data, error);
        switch (outcome.status) {
          case 'accepted':
          case 'already_member':
            toast({ title: '공동 예산에 참여했어요! 👫', description: '이제 파트너와 함께 편집할 수 있어요.' });
            try { localStorage.setItem(WORKSPACE_MODE_KEY, 'shared'); } catch { /* noop */ }
            navigate('/budget', { replace: true });
            break;
          case 'owner':
            toast({ title: '본인이 만든 예산이에요', description: '내 예산에서 바로 관리할 수 있어요.' });
            navigate('/budget', { replace: true });
            break;
          case 'expired':
            setErrorMsg('만료된 초대 링크예요. 파트너에게 새 링크를 요청하세요.');
            setPhase('error');
            break;
          case 'invalid':
            setErrorMsg('이미 사용되었거나 유효하지 않은 초대예요.');
            setPhase('error');
            break;
          default:
            setErrorMsg(outcome.status === 'error' ? outcome.message : '초대 수락에 실패했어요.');
            setPhase('error');
        }
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : '초대 수락 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.');
        setPhase('error');
      }
    })();
  }, [loading, user, token, signInWithGoogle, navigate, toast]);

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-2">초대를 열 수 없어요</h1>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">{errorMsg}</p>
        <Button onClick={() => navigate('/budget', { replace: true })}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> 내 예산으로 가기
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">
        {phase === 'accepting' ? '공동 예산에 참여하는 중...' : '초대를 확인하는 중...'}
      </p>
    </div>
  );
}

// [CL-COEDIT-E2E-20260620-130000] 공동 예산 초대 수락 페이지 (/invite/:token)
//
// 흐름(완성된 src/lib/collab/invite-resume.ts 사용):
//  - 토큰 형식 불량 → 에러 UI
//  - 미로그인 → 토큰 stash 후 구글 로그인 → OAuth 복귀(/auth) → InviteResumeWatcher 가 /invite/:token 재진입
//  - 로그인됨 → accept_budget_invitation RPC → 결과 분기(수락/이미멤버/오너/만료/무효)
// ※ 추가형 — useAuth 코어 무수정. signInWithGoogle 만 호출.
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowLeft, ExternalLink, Copy, CheckCircle2 } from 'lucide-react';
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
// [CL-COEDIT-INAPP-INVITE-20260620] 인앱브라우저(카톡 등) OAuth 403(disallowed_useragent) 회피 — 외부 브라우저 탈출
import {
  getBrowserInfo,
  openInExternalBrowserWithFallback,
  copyToClipboard,
  getAppSpecificGuide,
} from '@/lib/kakao-browser';

type Phase = 'checking' | 'accepting' | 'error';

export default function AcceptInvite() {
  const { token } = useParams();
  const { user, loading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>('checking');
  const [errorMsg, setErrorMsg] = useState('');
  const ranRef = useRef(false);
  // [CL-COEDIT-INAPP-INVITE-20260620] 인앱브라우저 탈출/브릿지 상태
  const [browserInfo] = useState(() => getBrowserInfo());
  const [showBridge, setShowBridge] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRetryBreakout = useCallback(() => {
    openInExternalBrowserWithFallback(window.location.href, () => setShowBridge(true));
  }, []);
  const handleCopyUrl = useCallback(async () => {
    const ok = await copyToClipboard(window.location.href);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }, []);

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
      // [CL-COEDIT-INAPP-INVITE-20260620] 카톡 등 인앱브라우저에선 Google OAuth 가 403(disallowed_useragent)로 차단됨.
      // signInWithGoogle 직접 호출 금지 → 동일 초대 URL 을 외부 브라우저로 탈출(토큰은 URL 에 보존돼 재진입 시 정상 로그인).
      if (browserInfo.isInAppBrowser) {
        openInExternalBrowserWithFallback(window.location.href, () => setShowBridge(true));
        return; // 탈출 중 — 'checking' 유지. 자동 탈출 실패 시 브릿지 UI 노출.
      }
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

  // [CL-COEDIT-INAPP-INVITE-20260620] 인앱브라우저 자동 탈출 실패 시 수동 브릿지 UI (Auth.tsx 패턴 미러)
  if (showBridge && browserInfo.isInAppBrowser) {
    const guide = getAppSpecificGuide(browserInfo.detectedApp, browserInfo.isIOS, browserInfo.isAndroid);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-8 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <ExternalLink className="w-10 h-10 text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-2">외부 브라우저에서 열어주세요</h1>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          {browserInfo.detectedApp ? `${browserInfo.detectedApp} 내` : '현재'} 브라우저에서는 Google 로그인이 차단돼요.
          <br />
          아래 방법으로 {browserInfo.isIOS ? 'Safari' : 'Chrome'}에서 초대 링크를 열어주세요.
        </p>
        <div className="w-full max-w-sm space-y-3 mb-6">
          <Button onClick={handleRetryBreakout} className="w-full h-12">
            <ExternalLink className="w-4 h-4 mr-2" /> 외부 브라우저로 열기
          </Button>
          <Button variant="outline" onClick={handleCopyUrl} className="w-full h-12 border-2 border-primary/30">
            {copied ? (
              <><CheckCircle2 className="w-4 h-4 mr-2 text-primary" /> 복사완료! 브라우저에 붙여넣기</>
            ) : (
              <><Copy className="w-4 h-4 mr-2" /> 초대 링크 복사</>
            )}
          </Button>
        </div>
        <div className="bg-muted/50 rounded-xl p-4 text-left w-full max-w-sm">
          <p className="text-sm font-medium text-foreground mb-3">
            📱 {browserInfo.detectedApp ? `${browserInfo.detectedApp}에서` : '직접'} 여는 방법
          </p>
          <ol className="text-sm text-muted-foreground space-y-2">
            {guide.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

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

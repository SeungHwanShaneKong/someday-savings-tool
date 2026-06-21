// [CL-FEEDBACK-DAILY-20260621] 하루 1회 은은한 피드백 권유 — 글로벌 마운트(App.tsx).
// '의견 보내기'가 묻혀 피드백이 안 들어오는 문제 → 자연스러운 1회 토스트로 유도(과빈도 금지=피로 방지).
// 토스트만 띄우고(비침습), 탭하면 기존 FeatureRequestSheet 오픈. 신규 사용자/온보딩 중엔 미노출.
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { hasSeenOnboarding } from '@/lib/onboarding';
import { shouldShowFeaturePrompt, markFeaturePromptShown } from '@/lib/feature-request-gate';
import { FeatureRequestSheet } from './FeatureRequestSheet';

// 자연스러운 시점: 예산/체크리스트에서 잠시 머문 뒤(작업 중인 engaged 사용자).
const TRIGGER_ROUTES = ['/budget', '/checklist'];
const DELAY_MS = 6000;

export function FeatureRequestPrompt() {
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const firedRef = useRef(false); // 세션당 1회

  useEffect(() => {
    if (firedRef.current) return;
    if (!TRIGGER_ROUTES.includes(location.pathname)) return;
    if (!hasSeenOnboarding()) return; // 신규 사용자 피로 방지
    const userKey = user?.id ?? 'anon';
    if (!shouldShowFeaturePrompt(userKey)) return;

    const t = setTimeout(() => {
      if (firedRef.current) return;
      firedRef.current = true;
      markFeaturePromptShown(userKey); // 탭하든 안하든 당일 1회로 소진
      toast({
        title: '어떤 기능이 있으면 좋을까요? 💡',
        description: '30초면 의견을 남길 수 있어요.',
        action: (
          <ToastAction altText="의견 남기기" onClick={() => setOpen(true)}>
            의견 남기기
          </ToastAction>
        ),
      });
    }, DELAY_MS);
    return () => clearTimeout(t);
  }, [location.pathname, user?.id, toast]);

  return <FeatureRequestSheet open={open} onOpenChange={setOpen} />;
}

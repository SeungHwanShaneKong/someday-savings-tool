/**
 * [CL-AI-EXTNAV-OVERLAY-20260418-205622] AI 외부 이동 오버레이 상태 관리 훅
 * - startNavigation({url, title}) 호출 → 오버레이 노출 → 400ms 후 window.location.href
 * - Safety timeout 8초: 네트워크 무응답 시 자동 해제 + 에러 토스트
 * - visibilitychange: 뒤로가기 후 탭 복귀 시 오버레이 유령화 방지
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/hooks/use-toast';

const NAV_DELAY_MS = 400;
const SAFETY_TIMEOUT_MS = 8000;

interface StartNavigationOptions {
  url: string;
  title: string;
}

interface UseAIExternalNavigationResult {
  isActive: boolean;
  overlayProps: {
    open: boolean;
    title: string;
  };
  startNavigation: (opts: StartNavigationOptions) => void;
}

export function useAIExternalNavigation(): UseAIExternalNavigationResult {
  const [isActive, setIsActive] = useState(false);
  const [title, setTitle] = useState('');
  const timersRef = useRef<number[]>([]);
  const isActiveRef = useRef(false);

  // 타이머 일괄 정리
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  // 오버레이 비활성화 (safety / 복귀 시)
  const deactivate = useCallback(() => {
    clearTimers();
    isActiveRef.current = false;
    setIsActive(false);
    setTitle('');
  }, [clearTimers]);

  // 외부 이동 트리거
  const startNavigation = useCallback(
    ({ url, title: nextTitle }: StartNavigationOptions) => {
      // 중복 클릭 가드 (ref로 stale closure 회피)
      if (isActiveRef.current) return;

      isActiveRef.current = true;
      setIsActive(true);
      setTitle(nextTitle);

      // 400ms 후 실제 네비게이션 — Entry 애니메이션 노출 보장
      const navTimer = window.setTimeout(() => {
        window.location.href = url;
      }, NAV_DELAY_MS);
      timersRef.current.push(navTimer);

      // 8초 safety: 네트워크 무응답 시 해제 + 토스트
      const safetyTimer = window.setTimeout(() => {
        deactivate();
        toast({
          title: '연결이 지연되고 있어요',
          description: '네트워크 상태를 확인한 뒤 다시 시도해주세요',
          variant: 'destructive',
        });
      }, SAFETY_TIMEOUT_MS);
      timersRef.current.push(safetyTimer);
    },
    [deactivate],
  );

  // 탭 복귀 감지 — 뒤로가기 후 오버레이 유령화 방지
  useEffect(() => {
    if (!isActive) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        deactivate();
      }
    };

    const handlePageShow = () => {
      // bfcache에서 복원된 경우도 해제
      deactivate();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [isActive, deactivate]);

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    isActive,
    overlayProps: { open: isActive, title },
    startNavigation,
  };
}

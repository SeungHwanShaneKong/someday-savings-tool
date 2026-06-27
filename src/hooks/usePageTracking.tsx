import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
// [CL-ACQ-CLASSIFY-20260622-233012] 유입경로(개선1): first-touch 보관 + last-touch 소스 기록 + 가입 귀속
import { classifySource, getOrSetFirstTouch, readFirstTouch, normalizeReferrer } from '@/lib/analytics/acquisition';

// Generate or retrieve session ID
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

// [CL-ACQ-PAGEVIEWS-20260622-233012] page_views 컬럼 미배포(42703) 판별 → 소스 컬럼 없이 재시도(분석 마비 방지)
function isMissingAcquisitionColumn(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  return e.code === '42703' || /referrer|utm_source/i.test(e.message ?? '');
}

export function usePageTracking() {
  const location = useLocation();
  // [CL-AUDIT2-R2-AUTHGATE-20260628] loading 도 구독 — 익명/인증 분기를 'user 확정' 시점에 판정(F2).
  const { user, loading: authLoading } = useAuth();
  const pageEntryTime = useRef<number>(Date.now());
  const currentPath = useRef<string>(location.pathname);

  // [CL-ACQ-CLASSIFY-20260622-233012] 최초 방문 유입원 1회 보관(익명 포함, 로컬만 — DB 익명행 0, 프라이버시).
  useEffect(() => {
    getOrSetFirstTouch();
  }, []);

  // [CL-ACQ-PROFILE-FT-20260622-233012] 가입자 first-touch 귀속(사용자당 1회). first_source 가 NULL 인 행만 갱신(덮어쓰기 0).
  useEffect(() => {
    if (!user?.id) return;
    const ft = readFirstTouch();
    if (!ft) return;
    const flag = `wedsem_ft_synced_${user.id}`;
    try {
      if (localStorage.getItem(flag)) return;
    } catch {
      /* noop */
    }
    void supabase
      .from('profiles')
      .update({ first_source: ft.source, first_referrer: ft.referrer, acquisition_at: ft.ts })
      .eq('user_id', user.id)
      .is('first_source', null)
      // [CL-AUDIT-R3-FTSYNC-20260623-000000] 성공(error 없음)일 때만 synced 플래그 설정 →
      //   RLS/네트워크 실패 시 플래그 미설정 → 다음 마운트에서 재시도(귀속 영구 유실 방지).
      //   단 컬럼 미배포(42703)는 영구 실패이므로 그때만 플래그를 박아 무한 재시도 차단.
      .then(({ error }) => {
        const code = (error as { code?: string } | null)?.code;
        if (!error || code === '42703') {
          try {
            localStorage.setItem(flag, '1');
          } catch {
            /* noop */
          }
        }
      });
  }, [user?.id]);

  useEffect(() => {
    // Only track authenticated users to prevent anonymous session correlation
    if (!user?.id) return;

    const sessionId = getSessionId();

    // Track page view
    const trackPageView = async () => {
      try {
        const base = {
          user_id: user.id,
          page_path: location.pathname,
          session_id: sessionId,
          duration_seconds: 0,
        };
        // [CL-ACQ-PAGEVIEWS-20260622-233012] last-touch 소스 동반 기록. 컬럼 미배포(42703) → 소스 없이 재시도(분석 유지).
        const c = classifySource();
        const { error } = await supabase
          .from('page_views')
          // [CL-AUDIT-R3-REFNORM-20260623-000000] origin 만 저장(PII/bloat 방지)
          .insert({ ...base, referrer: normalizeReferrer(typeof document !== 'undefined' ? document.referrer : ''), utm_source: c.source });
        if (error && isMissingAcquisitionColumn(error)) {
          await supabase.from('page_views').insert(base);
        }
      } catch (err) {
        // Silent fail for analytics
        console.debug('Analytics tracking failed:', err);
      }
    };

    // Update duration when leaving page
    const updateDuration = async () => {
      const duration = Math.floor((Date.now() - pageEntryTime.current) / 1000);
      if (duration > 0 && currentPath.current) {
        try {
          // We'll update the most recent page view for this session/path
          await supabase
            .from('page_views')
            .update({ duration_seconds: duration })
            .eq('session_id', sessionId)
            .eq('page_path', currentPath.current)
            .order('created_at', { ascending: false })
            .limit(1);
        } catch (err) {
          console.debug('Analytics duration update failed:', err);
        }
      }
    };

    // Track new page
    trackPageView();
    pageEntryTime.current = Date.now();
    currentPath.current = location.pathname;

    // Update duration on unmount or route change
    return () => {
      updateDuration();
    };
  }, [location.pathname, user?.id]);

  // [CL-ANONVISIT-CLIENT-20260627-234656] 익명 방문 1회 기록 — Edge 'track-visit' 릴레이(서버 검증/캡/레이트리밋).
  //   page_views 는 여전히 익명 0행(프라이버시 보존). 익명행은 anon_page_views 에만(user_id/IP/PII 없음).
  //   로그인 유저는 위 인증 경로가 처리 → 여기서 제외(이중기록 방지). fire-and-forget(분석 비차단·무음 실패).
  // [CL-AUDIT2-R2-AUTHGATE-20260628] authLoading 동안엔 발사 보류 — 인증 미확정(초기 user=null) 윈도우에서
  //   로그인 유저를 익명으로 오집계하던 결함(F2) 차단. 인증 확정 후 정확히 한 경로만 실행.
  useEffect(() => {
    if (authLoading || user?.id) return; // 인증 미확정 보류 + 가입자는 기존 page_views 경로
    const c = classifySource();
    void supabase.functions
      .invoke('track-visit', {
        body: {
          page_path: location.pathname,
          session_id: getSessionId(), // 비영구 랜덤 UUID(sessionStorage) — 사용자 상관 불가
          referrer: normalizeReferrer(typeof document !== 'undefined' ? document.referrer : ''),
          utm_source: c.source,
        },
      })
      .catch((err) => console.debug('Anon visit tracking failed:', err));
  }, [location.pathname, user?.id, authLoading]);
}

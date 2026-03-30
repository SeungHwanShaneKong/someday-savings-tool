/**
 * [CL-HONEYMOON-REDESIGN-20260316] AI 큐레이션 로딩 화면
 * API 호출 → 성공 시 결과 전환, 실패 시 폴백
 */

import { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import type { TravelProfile } from '@/lib/honeymoon-profile';
import type { AICurationResult, CurateProfile } from '@/hooks/useHoneymoonPlanner';

interface LoadingStepProps {
  profile: TravelProfile;
  // [CL-TOP100-DESTINATIONS-20260325] travelProfile 추가 (프리필터링용)
  onCurate: (profile: CurateProfile, travelProfile?: TravelProfile) => Promise<void>;
  curationResult: AICurationResult | null;
  curateError: string | null;
  onResults: (results: AICurationResult) => void;
  onFallback: (results: AICurationResult) => void;
  buildLocalFallback: (profile: TravelProfile) => AICurationResult;
}

export function LoadingStep({
  profile,
  onCurate,
  curationResult,
  curateError,
  onResults,
  onFallback,
  buildLocalFallback,
}: LoadingStepProps) {
  const calledRef = useRef(false);

  // API 호출 (1회만)
  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const curateProfile: CurateProfile = {
      dominantStyle: profile.dominantStyle,
      styleScores: profile.styleScores,
      budgetMin: profile.budgetRange.min,
      budgetMax: profile.budgetRange.max,
      nightsMin: profile.nights.min,
      nightsMax: profile.nights.max,
      departureMonth: profile.departureMonth ?? undefined,
    };

    // [CL-TOP100-DESTINATIONS-20260325] travelProfile 전달 → 프리필터링
    onCurate(curateProfile, profile);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 결과 수신 → 전환
  useEffect(() => {
    if (curationResult) {
      // 약간의 딜레이로 자연스러운 전환
      const timer = setTimeout(() => onResults(curationResult), 500);
      return () => clearTimeout(timer);
    }
  }, [curationResult, onResults]);

  // 에러 → 폴백
  useEffect(() => {
    if (curateError) {
      const fallback = buildLocalFallback(profile);
      const timer = setTimeout(() => onFallback(fallback), 500);
      return () => clearTimeout(timer);
    }
  }, [curateError, profile, buildLocalFallback, onFallback]);

  // [CL-MECE-TEST-20260330] 30초 타임아웃: API 무응답 시 로컬 폴백으로 전환
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!curationResult && !curateError) {
        const fallback = buildLocalFallback(profile);
        onFallback(fallback);
      }
    }, 30000);
    return () => clearTimeout(timeout);
  }, [curationResult, curateError, profile, buildLocalFallback, onFallback]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-20 text-center">
      <div className="relative mb-8">
        <Sparkles className="w-16 h-16 text-primary animate-float" />
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl animate-pulse" />
      </div>

      <h2 className="text-heading text-foreground mb-3">
        AI가 딱 맞는 여행지를
        <br />
        찾고 있어요
      </h2>

      <p className="text-sm text-muted-foreground mb-2">
        {profile.profileEmoji} {profile.profileLabel} 스타일에 맞는
        <br />
        여행지를 분석하고 있어요...
      </p>

      {/* [CL-REMOVE-OLD-PLANNER-20260325] 소요 시간 안내 + 폴백 고지 */}
      {!curateError && (
        <p className="text-xs text-muted-foreground/60 mb-6">
          약 30초 정도 걸려요
        </p>
      )}
      {curateError && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-6">
          AI가 바쁘니 추천을 직접 준비했어요
        </p>
      )}

      {/* Animated dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// [HONEYMOON-UPGRADE-2026-03-07] 새 컴포넌트 통합
// [CL-HONEYMOON-REDESIGN-20260316] 온보딩 게이트 + AI 큐레이션
// [CL-HONEYMOON-JOURNEY-20260405-180000] 가이드 플로우 (Results → Compare → Plan)
// [CL-PLAN-ADD-DEST-NOMAP-20260405-210000] 지도 기능 전면 제거, 완료 화면 추가
import { useRef, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSEO } from '@/hooks/useSEO';
// [CL-REMOVE-OLD-PLANNER-20260325] 큐레이션 전용 훅
import { useHoneymoonPlanner } from '@/hooks/useHoneymoonPlanner';
// [CL-HONEYMOON-REDESIGN-20260316] 온보딩 컴포넌트
import { useHoneymoonOnboarding } from '@/hooks/useHoneymoonOnboarding';
import { OnboardingShell } from '@/components/honeymoon/onboarding/OnboardingShell';
import { WelcomeStep } from '@/components/honeymoon/onboarding/WelcomeStep';
import { WorldCupStep } from '@/components/honeymoon/onboarding/WorldCupStep';
import { BudgetStep } from '@/components/honeymoon/onboarding/BudgetStep';
// [CL-SKIP-SCHEDULE-20260405-220000] ScheduleStep 제거 (budget → loading 직행)
import { LoadingStep } from '@/components/honeymoon/onboarding/LoadingStep';
import { ResultsStep } from '@/components/honeymoon/onboarding/ResultsStep';
// [CL-HONEYMOON-JOURNEY-20260405-180000] 새 가이드 단계
import { CompareStep } from '@/components/honeymoon/onboarding/CompareStep';
import { PlanStep } from '@/components/honeymoon/onboarding/PlanStep';
import { buildLocalFallbackResults } from '@/lib/honeymoon-profile';
// [CL-WORLDCUP-CONNECT-20260330] 월드컵 우승지 연계
import { getDestinationById } from '@/lib/honeymoon-destinations';

export default function Honeymoon() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useSEO({
    title: '신혼여행 추천 - 웨딩셈',
    description: '예산과 일정에 맞는 신혼여행지를 추천해드려요. 인기 여행지 비교와 예약 타임라인 제공.',
    path: '/honeymoon',
  });

  // [CL-HONEYMOON-REDESIGN-20260316] 온보딩 상태
  const onboarding = useHoneymoonOnboarding(user?.id);

  // [CL-IMPROVE-7TASKS-20260330] 페이지 진입 시 항상 월드컵부터 시작
  const initialMountRef = useRef(true);
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      onboarding.resetOnboarding();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // [CL-REMOVE-OLD-PLANNER-20260325] 큐레이션 전용
  const {
    curationResult,
    curateError,
    curateDestinations,
  } = useHoneymoonPlanner();

  // Auth check
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // ── [CL-HONEYMOON-REDESIGN-20260316] 온보딩 플로우 ──
  if (!onboarding.state.isComplete) {
    return (
      <OnboardingShell
        step={onboarding.state.step}
        progress={onboarding.progress}
        onBack={onboarding.goBack}
        onHome={() => navigate('/')} /* [CL-HOME-BTN-ALL-20260403-223000] */
      >
        {onboarding.state.step === 'welcome' && (
          <WelcomeStep
            onStart={() => onboarding.goToStep('worldcup')}
            onSkip={onboarding.completeOnboarding}
          />
        )}
        {onboarding.state.step === 'worldcup' && onboarding.currentMatch && (
          <WorldCupStep
            match={onboarding.currentMatch}
            round={onboarding.state.worldCupRound}
            onSelect={onboarding.selectWorldCupWinner}
          />
        )}
        {/* [CL-SKIP-SCHEDULE-20260405-220000] budget → loading 직행, schedule 제거 */}
        {onboarding.state.step === 'budget' && (
          <BudgetStep
            value={onboarding.state.budget}
            onChange={onboarding.setBudget}
            onNext={() => onboarding.goToStep('loading')}
          />
        )}
        {onboarding.state.step === 'loading' && onboarding.state.profile && (
          <LoadingStep
            profile={onboarding.state.profile}
            onCurate={curateDestinations}
            curationResult={curationResult}
            curateError={curateError}
            onResults={onboarding.setAiResults}
            onFallback={onboarding.setAiResults}
            buildLocalFallback={buildLocalFallbackResults}
          />
        )}
        {onboarding.state.step === 'results' && onboarding.state.profile && onboarding.state.aiResults && (
          <ResultsStep
            profile={onboarding.state.profile}
            results={onboarding.state.aiResults}
            onComplete={() => onboarding.goToStep('compare')}
            onRetry={onboarding.resetOnboarding}
          />
        )}
        {/* [CL-HONEYMOON-JOURNEY-20260405-180000] 비교 단계 — 메인 경험 */}
        {/* [CL-PLAN-ADD-DEST-NOMAP-20260405-210000] onGoToMap 제거 */}
        {onboarding.state.step === 'compare' && onboarding.state.profile && onboarding.state.aiResults && (
          <CompareStep
            results={onboarding.state.aiResults}
            profile={onboarding.state.profile}
            onGoToPlan={() => onboarding.goToStep('plan')}
            onBack={onboarding.goBack}
          />
        )}
        {/* [CL-HONEYMOON-JOURNEY-20260405-180000] 계획+예산 단계 */}
        {/* [CL-PLAN-ADD-DEST-NOMAP-20260405-210000] onGoToMap 제거 */}
        {onboarding.state.step === 'plan' && onboarding.state.profile && onboarding.state.aiResults && (
          <PlanStep
            selectedDestinations={(() => {
              // CompareStep에서 선택된 여행지 (월드컵 Top 4 + AI 추천)
              const ids = new Set<string>();
              const ranking = onboarding.state.profile?.worldCupRanking;
              if (ranking) {
                ids.add(ranking.champion);
                ids.add(ranking.finalist);
                ranking.semiFinalists.forEach(id => ids.add(id));
              }
              onboarding.state.aiResults!.recommendations.forEach(r => {
                if (ids.size < 5) ids.add(r.destinationId);
              });
              return Array.from(ids)
                .map(id => getDestinationById(id))
                .filter(Boolean) as import('@/lib/honeymoon-destinations').Destination[];
            })()}
            profile={onboarding.state.profile}
            onComplete={onboarding.completeOnboarding}
            onBack={onboarding.goBack}
          />
        )}
      </OnboardingShell>
    );
  }

  // ── [CL-PLAN-ADD-DEST-NOMAP-20260405-210000] 완료 화면 (지도 대체) ──
  const championDest = onboarding.state.profile?.worldCupRanking
    ? getDestinationById(onboarding.state.profile.worldCupRanking.champion)
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6 animate-fade-up">
        {/* 성공 아이콘 */}
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>

        {/* 메시지 */}
        <div>
          <h2 className="text-xl font-bold text-foreground">여행 계획이 저장되었어요!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            신혼여행 준비를 시작해볼까요?
          </p>
        </div>

        {/* 프로필 요약 */}
        {onboarding.state.profile && (
          <div className="bg-card rounded-xl border border-border p-4 text-left animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{onboarding.state.profile.profileEmoji}</span>
              <span className="text-sm font-semibold text-foreground">{onboarding.state.profile.profileLabel}</span>
            </div>
            {championDest && (
              <p className="text-xs text-muted-foreground">
                🏆 우승: {championDest.markerEmoji} {championDest.name}
              </p>
            )}
          </div>
        )}

        {/* CTAs */}
        <div className="space-y-3 pt-2 animate-fade-up" style={{ animationDelay: '0.15s' }}>
          <Button
            size="lg"
            onClick={() => navigate('/budget')}
            className="w-full rounded-2xl py-5 text-base font-semibold shadow-primary-glow"
          >
            예산 확인하기
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              onboarding.resetOnboarding();
            }}
            className="w-full rounded-2xl py-4 text-sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            다시 테스트하기
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="w-full text-xs text-muted-foreground"
          >
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
}

// [HONEYMOON-UPGRADE-2026-03-07] 새 컴포넌트 통합
// [CL-HONEYMOON-REDESIGN-20260316] 온보딩 게이트 + AI 큐레이션
import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, MapIcon, MapPin, Sparkles, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useHoneymoonMap } from '@/hooks/useHoneymoonMap';
import { useIsMobile } from '@/hooks/use-mobile';
import { HoneymoonMap } from '@/components/honeymoon/HoneymoonMap';
import { FilterSliders } from '@/components/honeymoon/FilterSliders';
import { ComparisonCards } from '@/components/honeymoon/ComparisonCards';
import { BookingTimeline } from '@/components/honeymoon/BookingTimeline';
import { RecommendationPanel } from '@/components/honeymoon/RecommendationPanel';
import { ItineraryPanel } from '@/components/honeymoon/ItineraryPanel';
import { ItineraryCostCalculator } from '@/components/honeymoon/ItineraryCostCalculator';
import { ItineraryExport } from '@/components/honeymoon/ItineraryExport';
import { useSEO } from '@/hooks/useSEO';
// [CL-REMOVE-OLD-PLANNER-20260325] 큐레이션 전용 훅
import { useHoneymoonPlanner } from '@/hooks/useHoneymoonPlanner';
// [CL-HONEYMOON-REDESIGN-20260316] 온보딩 컴포넌트
import { useHoneymoonOnboarding } from '@/hooks/useHoneymoonOnboarding';
import { OnboardingShell } from '@/components/honeymoon/onboarding/OnboardingShell';
import { WelcomeStep } from '@/components/honeymoon/onboarding/WelcomeStep';
import { WorldCupStep } from '@/components/honeymoon/onboarding/WorldCupStep';
import { BudgetStep } from '@/components/honeymoon/onboarding/BudgetStep';
import { ScheduleStep } from '@/components/honeymoon/onboarding/ScheduleStep';
import { LoadingStep } from '@/components/honeymoon/onboarding/LoadingStep';
import { ResultsStep } from '@/components/honeymoon/onboarding/ResultsStep';
import { buildLocalFallbackResults } from '@/lib/honeymoon-profile';

export default function Honeymoon() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();

  useSEO({
    title: '신혼여행 추천 - 웨딩셈',
    description: '예산과 일정에 맞는 신혼여행지를 추천해드려요. 인기 여행지 비교와 예약 타임라인 제공.',
    path: '/honeymoon',
  });

  // [CL-HONEYMOON-REDESIGN-20260316] 온보딩 상태
  const onboarding = useHoneymoonOnboarding(user?.id);

  const {
    viewState,
    setViewState,
    filters,
    updateFilter,
    resetFilters,
    scoredDestinations,
    selectedIds,
    selectedDestinations,
    toggleSelection,
    reorderItinerary,
    hoveredId,
    setHoveredId,
    popupDestination,
    setPopupDestination,
    flyTo,
    resetView,
    applyProfile,
  } = useHoneymoonMap();

  // [CL-REMOVE-OLD-PLANNER-20260325] 큐레이션 전용
  const {
    curationResult,
    curateError,
    curateDestinations,
  } = useHoneymoonPlanner();

  // [HONEYMOON-UPGRADE-2026-03-07] 캡처용 ref + 스코어 맵
  const captureRef = useRef<HTMLDivElement>(null);
  const scoreMap = useMemo(
    () => new Map(scoredDestinations.map(({ destination, score }) => [destination.id, score])),
    [scoredDestinations]
  );

  // Check if any destinations match filters
  const hasFilterResults = scoredDestinations.some(({ score }) => score > 0.5);

  // [CL-HONEYMOON-REDESIGN-20260316] 온보딩 완료 후 프로필 적용
  const [profileApplied, setProfileApplied] = useState(false);
  useEffect(() => {
    if (onboarding.state.isComplete && onboarding.state.profile && !profileApplied) {
      applyProfile(onboarding.state.profile);
      setProfileApplied(true);
    }
  }, [onboarding.state.isComplete, onboarding.state.profile, profileApplied, applyProfile]);

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
        {onboarding.state.step === 'budget' && (
          <BudgetStep
            value={onboarding.state.budget}
            onChange={onboarding.setBudget}
            onNext={() => onboarding.goToStep('schedule')}
          />
        )}
        {onboarding.state.step === 'schedule' && (
          <ScheduleStep
            nightsMin={onboarding.state.nightsMin}
            nightsMax={onboarding.state.nightsMax}
            onNightsChange={onboarding.setNightsRange}
            departureMonth={onboarding.state.departureMonth}
            onDepartureMonthChange={onboarding.setDepartureMonth}
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
            onComplete={onboarding.completeOnboarding}
            onRetry={onboarding.resetOnboarding}
          />
        )}
      </OnboardingShell>
    );
  }

  // ── 기존 지도 페이지 (UNCHANGED except header additions) ──
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-14 max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/')} /* [CL-HOME-BTN-20260315-140000] */
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="홈으로"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-sm sm:text-base font-semibold text-foreground whitespace-nowrap">
              허니문
            </h1>
            <Badge
              variant="outline"
              className="animate-shimmer bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/20 px-1.5 py-0.5 flex-shrink-0"
            >
              <Sparkles className="w-3 h-3 mr-0.5 text-primary" aria-hidden="true" />
              <span className="text-[10px] font-medium text-primary">AI</span>
            </Badge>
            {/* [CL-HONEYMOON-REDESIGN-20260316] 프로필 배지 — 모바일: 이모지만, 데스크탑: 전체 */}
            {onboarding.state.profile && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 flex-shrink-0">
                <span>{onboarding.state.profile.profileEmoji}</span>
                <span className="hidden sm:inline ml-1">{onboarding.state.profile.profileLabel}</span>
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* [CL-HONEYMOON-REDESIGN-20260316] 다시 테스트 */}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 px-2"
              onClick={() => {
                onboarding.resetOnboarding();
                setProfileApplied(false);
              }}
              aria-label="성향 테스트 다시하기"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">다시 테스트</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 px-2"
              onClick={resetView}
              aria-label="지도 초기화"
            >
              <MapIcon className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">전체보기</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main layout */}
      {isMobile ? (
        // Mobile: stacked layout
        <div className="flex-1 flex flex-col">
          {/* Map */}
          <div className="h-[50vh] min-h-[300px] relative animate-fade-up">
            <HoneymoonMap
              viewState={viewState}
              onViewStateChange={setViewState}
              scoredDestinations={scoredDestinations}
              selectedIds={selectedIds}
              hoveredId={hoveredId}
              popupDestination={popupDestination}
              onMarkerClick={flyTo}
              onMarkerHover={setHoveredId}
              onPopupClose={() => setPopupDestination(null)}
              onToggleSelection={toggleSelection}
            />
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
            <div className="animate-fade-up" style={{ animationDelay: '0.05s' }}>
              <FilterSliders
                filters={filters}
                onUpdate={updateFilter}
                onReset={resetFilters}
                profileApplied={profileApplied}
              />
            </div>

            {/* Empty state when no filter results */}
            {!hasFilterResults && (
              <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-up" style={{ animationDelay: '0.1s' }}>
                <MapPin className="w-12 h-12 text-muted-foreground/40 mb-4" aria-hidden="true" />
                <p className="text-muted-foreground font-medium">조건에 맞는 여행지가 없어요</p>
                <p className="text-sm text-muted-foreground/60 mt-1">필터를 조정해보세요</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={resetFilters}>
                  필터 초기화
                </Button>
              </div>
            )}

            {/* Recommendation Panel */}
            <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
              <RecommendationPanel
                scoredDestinations={scoredDestinations}
                selectedIds={selectedIds}
                onFlyTo={flyTo}
                onToggleSelection={toggleSelection}
              />
            </div>

            {/* [HONEYMOON-UPGRADE-2026-03-07] 여행 일정 패널 */}
            <div className="animate-fade-up" style={{ animationDelay: '0.15s' }} ref={captureRef}>
              <ItineraryPanel
                destinations={selectedDestinations}
                selectedIds={selectedIds}
                onReorder={reorderItinerary}
                onRemove={toggleSelection}
              />
              {selectedDestinations.length > 0 && (
                <div className="mt-2">
                  <ItineraryExport destinations={selectedDestinations} captureRef={captureRef} />
                </div>
              )}
            </div>

            {selectedDestinations.length > 0 && (
              <div className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
                <ComparisonCards
                  destinations={selectedDestinations}
                  scores={scoreMap}
                  onRemove={toggleSelection}
                />
              </div>
            )}

            {/* [HONEYMOON-UPGRADE-2026-03-07] 비용 합산기 */}
            {selectedDestinations.length > 0 && (
              <div className="animate-fade-up" style={{ animationDelay: '0.25s' }}>
                <ItineraryCostCalculator destinations={selectedDestinations} />
              </div>
            )}

            {popupDestination && (
              <div className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
                <BookingTimeline destination={popupDestination} />
              </div>
            )}
          </div>
        </div>
      ) : (
        // Desktop: 2-panel layout
        <div className="flex-1 flex max-w-7xl mx-auto w-full">
          {/* Left Panel: Map + Filters (60%) */}
          <div className="w-[60%] flex flex-col p-4 gap-4">
            <div className="flex-1 rounded-xl overflow-hidden border border-border shadow-toss-sm min-h-[400px] animate-fade-up">
              <HoneymoonMap
                viewState={viewState}
                onViewStateChange={setViewState}
                scoredDestinations={scoredDestinations}
                selectedIds={selectedIds}
                hoveredId={hoveredId}
                popupDestination={popupDestination}
                onMarkerClick={flyTo}
                onMarkerHover={setHoveredId}
                onPopupClose={() => setPopupDestination(null)}
                onToggleSelection={toggleSelection}
              />
            </div>
            <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
              <FilterSliders
                filters={filters}
                onUpdate={updateFilter}
                onReset={resetFilters}
                profileApplied={profileApplied}
              />
            </div>

            {/* Empty state when no filter results — desktop */}
            {!hasFilterResults && (
              <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-up" style={{ animationDelay: '0.15s' }}>
                <MapPin className="w-10 h-10 text-muted-foreground/40 mb-3" aria-hidden="true" />
                <p className="text-muted-foreground font-medium">조건에 맞는 여행지가 없어요</p>
                <p className="text-sm text-muted-foreground/60 mt-1">필터를 조정해보세요</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={resetFilters}>
                  필터 초기화
                </Button>
              </div>
            )}
          </div>

          {/* Right Panel: Recommendation + Itinerary + Comparison (40%) */}
          <div className="w-[40%] flex flex-col p-4 pl-0 gap-4 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
            {/* Recommendation Panel */}
            <div className="animate-fade-up" style={{ animationDelay: '0.05s' }}>
              <RecommendationPanel
                scoredDestinations={scoredDestinations}
                selectedIds={selectedIds}
                onFlyTo={flyTo}
                onToggleSelection={toggleSelection}
              />
            </div>

            {/* [HONEYMOON-UPGRADE-2026-03-07] 여행 일정 패널 */}
            <div className="animate-fade-up" style={{ animationDelay: '0.1s' }} ref={captureRef}>
              <ItineraryPanel
                destinations={selectedDestinations}
                selectedIds={selectedIds}
                onReorder={reorderItinerary}
                onRemove={toggleSelection}
              />
              {selectedDestinations.length > 0 && (
                <div className="mt-2">
                  <ItineraryExport destinations={selectedDestinations} captureRef={captureRef} />
                </div>
              )}
            </div>

            {/* Comparison Cards */}
            {selectedDestinations.length > 0 && (
              <div className="animate-fade-up" style={{ animationDelay: '0.15s' }}>
                <ComparisonCards
                  destinations={selectedDestinations}
                  scores={scoreMap}
                  onRemove={toggleSelection}
                />
              </div>
            )}

            {/* [HONEYMOON-UPGRADE-2026-03-07] 비용 합산기 */}
            {selectedDestinations.length > 0 && (
              <div className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
                <ItineraryCostCalculator destinations={selectedDestinations} />
              </div>
            )}

            {/* Booking Timeline */}
            {popupDestination && (
              <div className="animate-fade-up" style={{ animationDelay: '0.25s' }}>
                <BookingTimeline destination={popupDestination} />
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

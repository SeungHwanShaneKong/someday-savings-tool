// [HONEYMOON-UPGRADE-2026-03-07] 새 컴포넌트 통합
import { useState, useRef, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, MapIcon, MapPin, Sparkles } from 'lucide-react';
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
// [AGENT-TEAM-9-20260307] P3 신혼여행 기획 에이전트
import { useHoneymoonPlanner } from '@/hooks/useHoneymoonPlanner';
import { HoneymoonPlannerPanel } from '@/components/planning/HoneymoonPlannerPanel';

export default function Honeymoon() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();

  useSEO({
    title: '신혼여행 추천 - 웨딩셈',
    description: '예산과 일정에 맞는 신혼여행지를 추천해드려요. 인기 여행지 비교와 예약 타임라인 제공.',
    path: '/honeymoon',
  });

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
  } = useHoneymoonMap();

  // [AGENT-TEAM-9-20260307] P3 신혼여행 기획 에이전트
  const { plan: honeymoonPlan, loading: plannerLoading, error: plannerError, planTrip } = useHoneymoonPlanner();
  const [plannerOpen, setPlannerOpen] = useState(false);

  // [HONEYMOON-UPGRADE-2026-03-07] 캡처용 ref + 스코어 맵
  const captureRef = useRef<HTMLDivElement>(null);
  const scoreMap = useMemo(
    () => new Map(scoredDestinations.map(({ destination, score }) => [destination.id, score])),
    [scoredDestinations]
  );

  // Check if any destinations match filters
  const hasFilterResults = scoredDestinations.some(({ score }) => score > 0.5);

  // Auth check
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

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
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-foreground">
              허니문 큐레이션
            </h1>
            <Badge
              variant="outline"
              className="animate-shimmer bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/20 px-2 py-0.5"
            >
              <Sparkles className="w-3 h-3 mr-1 text-primary" aria-hidden="true" />
              <span className="text-[11px] font-medium text-primary">AI</span>
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={resetView}
            aria-label="지도 초기화"
          >
            <MapIcon className="w-4 h-4 mr-1" />
            전체보기
          </Button>
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
            {/* [AGENT-TEAM-9-20260307] P3 AI 여행 플래너 버튼 */}
            <button
              onClick={() => {
                planTrip(5000000, 7, ['동남아', '유럽'], '휴양');
                setPlannerOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 text-sm font-medium hover:from-emerald-100 hover:to-teal-100 transition-all active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              AI 여행 플래너
            </button>

            <div className="animate-fade-up" style={{ animationDelay: '0.05s' }}>
              <FilterSliders
                filters={filters}
                onUpdate={updateFilter}
                onReset={resetFilters}
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
            {/* [AGENT-TEAM-9-20260307] P3 AI 여행 플래너 버튼 (desktop) */}
            <button
              onClick={() => {
                planTrip(5000000, 7, ['동남아', '유럽'], '휴양');
                setPlannerOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 text-sm font-medium hover:from-emerald-100 hover:to-teal-100 transition-all active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              AI 여행 플래너
            </button>

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

      {/* [AGENT-TEAM-9-20260307] P3 신혼여행 기획 패널 */}
      <HoneymoonPlannerPanel
        plan={honeymoonPlan}
        loading={plannerLoading}
        error={plannerError}
        open={plannerOpen}
        onOpenChange={setPlannerOpen}
      />
    </div>
  );
}

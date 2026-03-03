import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, MapIcon, MapPin, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useAIChat } from '@/hooks/useAIChat';
import { useHoneymoonMap } from '@/hooks/useHoneymoonMap';
import { useIsMobile } from '@/hooks/use-mobile';
import { HoneymoonMap } from '@/components/honeymoon/HoneymoonMap';
import { FilterSliders } from '@/components/honeymoon/FilterSliders';
import { ComparisonCards } from '@/components/honeymoon/ComparisonCards';
import { BookingTimeline } from '@/components/honeymoon/BookingTimeline';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { useSEO } from '@/hooks/useSEO';

export default function Honeymoon() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();

  useSEO({
    title: '신혼여행 - 웨딩셈',
    description: '예산과 일정에 맞는 신혼여행지를 AI가 추천해드려요. 인기 여행지 비교와 예약 타임라인 제공.',
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
    hoveredId,
    setHoveredId,
    popupDestination,
    setPopupDestination,
    flyTo,
    resetView,
  } = useHoneymoonMap();

  const {
    messages,
    isLoading,
    sendMessage,
    messagesEndRef,
  } = useAIChat({
    feature: 'honeymoon',
    context: {
      selectedDestinations: selectedDestinations.map((d) => d.name),
      filters: {
        maxBudget: filters.maxBudget,
        nights: `${filters.minNights}~${filters.maxNights}`,
        concepts: filters.concepts,
      },
    },
  });

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
            onClick={() => navigate('/budget')}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="허니문 나가기"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-foreground">
              AI 허니문 큐레이션
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

            {selectedDestinations.length > 0 && (
              <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
                <ComparisonCards
                  destinations={selectedDestinations}
                  onRemove={toggleSelection}
                />
              </div>
            )}

            {popupDestination && (
              <div className="animate-fade-up" style={{ animationDelay: '0.15s' }}>
                <BookingTimeline destination={popupDestination} />
              </div>
            )}

            {/* Chat */}
            <div className="bg-card rounded-xl border border-border overflow-hidden h-[400px] animate-fade-up" style={{ animationDelay: '0.2s' }}>
              <div className="px-3 py-2 border-b border-border bg-muted/30">
                <h3 className="text-xs font-semibold">🤖 AI 허니문 어드바이저</h3>
              </div>
              <ChatContainer
                messages={messages}
                isLoading={isLoading}
                onSend={sendMessage}
                messagesEndRef={messagesEndRef}
                placeholder="허니문에 대해 물어보세요..."
                welcomeMessage="어떤 스타일의 신혼여행을 꿈꾸세요? 예산, 기간, 선호하는 컨셉을 알려주시면 맞춤 추천해 드릴게요! 🏝️"
                className="h-[calc(100%-36px)]"
              />
            </div>
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

          {/* Right Panel: Chat + Comparison (40%) */}
          <div className="w-[40%] flex flex-col p-4 pl-0 gap-4">
            {/* Chat */}
            <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden min-h-[300px] animate-fade-up" style={{ animationDelay: '0.05s' }}>
              <div className="px-3 py-2 border-b border-border bg-muted/30">
                <h3 className="text-xs font-semibold">🤖 AI 허니문 어드바이저</h3>
              </div>
              <ChatContainer
                messages={messages}
                isLoading={isLoading}
                onSend={sendMessage}
                messagesEndRef={messagesEndRef}
                placeholder="허니문에 대해 물어보세요..."
                welcomeMessage="어떤 스타일의 신혼여행을 꿈꾸세요? 예산, 기간, 선호하는 컨셉을 알려주시면 맞춤 추천해 드릴게요! 🏝️"
                className="h-[calc(100%-36px)]"
              />
            </div>

            {/* Comparison Cards */}
            {selectedDestinations.length > 0 && (
              <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
                <ComparisonCards
                  destinations={selectedDestinations}
                  onRemove={toggleSelection}
                />
              </div>
            )}

            {/* Booking Timeline */}
            {popupDestination && (
              <div className="animate-fade-up" style={{ animationDelay: '0.15s' }}>
                <BookingTimeline destination={popupDestination} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

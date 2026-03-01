import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAIChat } from '@/hooks/useAIChat';
import { useHoneymoonMap } from '@/hooks/useHoneymoonMap';
import { useIsMobile } from '@/hooks/use-mobile';
import { HoneymoonMap } from '@/components/honeymoon/HoneymoonMap';
import { FilterSliders } from '@/components/honeymoon/FilterSliders';
import { ComparisonCards } from '@/components/honeymoon/ComparisonCards';
import { BookingTimeline } from '@/components/honeymoon/BookingTimeline';
import { ChatContainer } from '@/components/chat/ChatContainer';

export default function Honeymoon() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();

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

  // Auth check
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-14 max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/budget')}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground">
            ✈️ AI 허니문 큐레이션
          </h1>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={resetView}
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
          {/* Map (50vh) */}
          <div className="h-[45vh] relative">
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
            <FilterSliders
              filters={filters}
              onUpdate={updateFilter}
              onReset={resetFilters}
            />

            {selectedDestinations.length > 0 && (
              <ComparisonCards
                destinations={selectedDestinations}
                onRemove={toggleSelection}
              />
            )}

            {popupDestination && (
              <BookingTimeline destination={popupDestination} />
            )}

            {/* Chat */}
            <div className="bg-card rounded-xl border border-border overflow-hidden h-[400px]">
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
            <div className="flex-1 rounded-xl overflow-hidden border border-border shadow-toss-sm min-h-[400px]">
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
            <FilterSliders
              filters={filters}
              onUpdate={updateFilter}
              onReset={resetFilters}
            />
          </div>

          {/* Right Panel: Chat + Comparison (40%) */}
          <div className="w-[40%] flex flex-col p-4 pl-0 gap-4">
            {/* Chat */}
            <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden min-h-[300px]">
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
              <ComparisonCards
                destinations={selectedDestinations}
                onRemove={toggleSelection}
              />
            )}

            {/* Booking Timeline */}
            {popupDestination && (
              <BookingTimeline destination={popupDestination} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

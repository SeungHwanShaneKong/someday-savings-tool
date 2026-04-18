// [FIX-20260418-031800] 미사용 지도 컴포넌트 컴파일 안정화 폴백
// 허니문 지도 기능이 외부화된 이후에도 파일 자체는 타입체커 대상이므로,
// maplibre 의존성 없이 안전하게 빌드되는 로컬 폴백 UI로 유지한다.
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatKoreanWon } from '@/lib/budget-categories';
import { useIsMobile } from '@/hooks/use-mobile';
import { MapPin, Plane, Sparkles } from 'lucide-react';
import type { Destination } from '@/lib/honeymoon-destinations';
import type { MapViewState } from '@/hooks/useHoneymoonMap';

interface ScoredDestination {
  destination: Destination;
  score: number;
}

interface HoneymoonMapProps {
  viewState: MapViewState;
  onViewStateChange: (vs: MapViewState) => void;
  // [CL-MAP-WORLDCUP-FIX-20260330] 프로그래밍 flyTo 전용
  flyToTarget: MapViewState | null;
  onFlyToComplete: () => void;
  scoredDestinations: ScoredDestination[];
  selectedIds: string[];
  hoveredId: string | null;
  popupDestination: Destination | null;
  onMarkerClick: (destination: Destination) => void;
  onMarkerHover: (id: string | null) => void;
  onPopupClose: () => void;
  onToggleSelection: (id: string) => void;
}

export function HoneymoonMap({
  viewState,
  onViewStateChange: _onViewStateChange,
  flyToTarget: _flyToTarget,
  onFlyToComplete: _onFlyToComplete,
  scoredDestinations,
  selectedIds,
  hoveredId,
  popupDestination,
  onMarkerClick,
  onMarkerHover,
  onPopupClose: _onPopupClose,
  onToggleSelection,
}: HoneymoonMapProps) {
  const isMobile = useIsMobile();

  const visibleDestinations = useMemo(() => {
    const threshold = viewState.zoom > 3 ? 0.2 : 0.4;
    return scoredDestinations.filter(({ destination, score }) =>
      score >= threshold || selectedIds.includes(destination.id) || destination.id === hoveredId
    );
  }, [scoredDestinations, selectedIds, hoveredId, viewState.zoom]);

  const topDestinations = visibleDestinations.slice(0, isMobile ? 4 : 6);
  const popupSelected = popupDestination ? selectedIds.includes(popupDestination.id) : false;

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-xl border border-border bg-card">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_55%)]" />
      <div className="relative flex h-full flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Plane className="h-3.5 w-3.5" />
              지도 폴백 모드
            </div>
            <h3 className="mt-3 text-lg font-semibold text-foreground">여행지 비교 미리보기</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              현재 뷰: 경도 {viewState.longitude.toFixed(1)} · 위도 {viewState.latitude.toFixed(1)} · 줌 {viewState.zoom.toFixed(1)}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            상위 {topDestinations.length}개 추천
          </div>
        </div>

        <div className={cn('grid gap-3', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
          {topDestinations.map(({ destination, score }) => {
            const isSelected = selectedIds.includes(destination.id);
            const isHovered = hoveredId === destination.id;

            return (
              <button
                key={destination.id}
                type="button"
                onClick={() => onMarkerClick(destination)}
                onMouseEnter={() => onMarkerHover(destination.id)}
                onMouseLeave={() => onMarkerHover(null)}
                className={cn(
                  'rounded-2xl border p-4 text-left transition-all duration-200',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-[0_10px_30px_-18px_hsl(var(--primary)/0.55)]'
                    : 'border-border bg-background hover:border-primary/40 hover:bg-accent/40',
                  isHovered && 'border-primary/60'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl leading-none">{destination.markerEmoji}</span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{destination.name}</p>
                        <p className="text-xs text-muted-foreground">{destination.nameEn}</p>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {destination.description}
                    </p>
                  </div>
                  <div className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                    {(score * 100).toFixed(0)}점
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2.5 py-1">
                    {formatKoreanWon(destination.budgetRange.min)}~{formatKoreanWon(destination.budgetRange.max)}
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-1">{destination.nights}박</span>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {destination.highlights.slice(0, 2).map((highlight) => (
                      <span key={highlight} className="rounded-full bg-primary/10 px-2 py-1 text-[11px] text-primary">
                        {highlight}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs font-medium text-primary">
                    {isSelected ? '선택됨' : '상세 보기'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {popupDestination && (
          <div className="rounded-2xl border border-primary/20 bg-background/95 p-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl leading-none">{popupDestination.markerEmoji}</span>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{popupDestination.name}</h4>
                    <p className="text-xs text-muted-foreground">{popupDestination.nameEn}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{popupDestination.description}</p>
              </div>
              <MapPin className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                {formatKoreanWon(popupDestination.budgetRange.min)}~{formatKoreanWon(popupDestination.budgetRange.max)}
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">{popupDestination.nights}박</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {popupDestination.highlights.map((highlight) => (
                <span key={highlight} className="rounded-full bg-primary/10 px-2 py-1 text-[11px] text-primary">
                  {highlight}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onToggleSelection(popupDestination.id)}
              className={cn(
                'mt-4 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                popupSelected
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {popupSelected ? '✓ 비교 목록에 추가됨' : '비교 목록에 추가'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

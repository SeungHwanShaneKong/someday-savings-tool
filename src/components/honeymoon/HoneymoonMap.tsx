import { useCallback, useState } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/mapbox';
import { cn } from '@/lib/utils';
import { formatKoreanWon } from '@/lib/budget-categories';
import { useIsMobile } from '@/hooks/use-mobile';
import { MapPin } from 'lucide-react';
import type { Destination } from '@/lib/honeymoon-destinations';
import type { MapViewState } from '@/hooks/useHoneymoonMap';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

interface ScoredDestination {
  destination: Destination;
  score: number;
}

interface HoneymoonMapProps {
  viewState: MapViewState;
  onViewStateChange: (vs: MapViewState) => void;
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
  onViewStateChange,
  scoredDestinations,
  selectedIds,
  hoveredId,
  popupDestination,
  onMarkerClick,
  onMarkerHover,
  onPopupClose,
  onToggleSelection,
}: HoneymoonMapProps) {
  const isMobile = useIsMobile();
  const [mapLoaded, setMapLoaded] = useState(false);

  const handleMove = useCallback(
    (evt: { viewState: MapViewState }) => {
      onViewStateChange(evt.viewState);
    },
    [onViewStateChange]
  );

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/30 rounded-xl">
        <div className="text-center p-6">
          <span className="text-4xl">🗺️</span>
          <p className="text-sm text-muted-foreground mt-2">
            지도를 표시하려면 Mapbox 토큰이 필요해요
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            VITE_MAPBOX_ACCESS_TOKEN 환경변수를 설정해주세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Loading skeleton overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-xl">
          <div className="text-center">
            <MapPin className="w-8 h-8 text-primary animate-float mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">지도 로딩 중...</p>
          </div>
        </div>
      )}

      <Map
        {...viewState}
        onMove={handleMove}
        onLoad={() => setMapLoaded(true)}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        reuseMaps
      >
        {!isMobile && <NavigationControl position="top-right" />}

        {/* Destination markers */}
        {scoredDestinations.map(({ destination, score }) => {
          const isSelected = selectedIds.includes(destination.id);
          const isHovered = hoveredId === destination.id;
          const isActive = score > 0.5;

          return (
            <Marker
              key={destination.id}
              longitude={destination.coordinates[0]}
              latitude={destination.coordinates[1]}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onMarkerClick(destination);
              }}
            >
              <div
                onMouseEnter={() => onMarkerHover(destination.id)}
                onMouseLeave={() => onMarkerHover(null)}
                className={cn(
                  'cursor-pointer transition-all duration-300 select-none',
                  !isActive && 'opacity-30 grayscale',
                  isSelected && 'scale-125',
                  isHovered && 'scale-110'
                )}
              >
                {/* Marker bubble */}
                <div
                  className={cn(
                    'relative flex flex-col items-center',
                    isSelected && 'drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-full px-2.5 py-1.5 text-center shadow-md border-2 bg-white',
                      isSelected
                        ? 'border-primary'
                        : isHovered
                          ? 'border-blue-300'
                          : 'border-white'
                    )}
                  >
                    <span className="text-lg leading-none">
                      {destination.markerEmoji}
                    </span>
                    <p className="text-[10px] font-bold text-foreground leading-none mt-0.5">
                      {destination.name}
                    </p>
                    {isActive && (
                      <p className="text-[9px] text-primary font-medium leading-none mt-0.5">
                        {formatKoreanWon(destination.budgetRange.min)}~
                      </p>
                    )}
                  </div>
                  {/* Pin tail */}
                  <div
                    className={cn(
                      'w-2 h-2 rotate-45 -mt-1',
                      isSelected ? 'bg-primary' : 'bg-white'
                    )}
                  />
                </div>
              </div>
            </Marker>
          );
        })}

        {/* Popup */}
        {popupDestination && (
          <Popup
            longitude={popupDestination.coordinates[0]}
            latitude={popupDestination.coordinates[1]}
            anchor="bottom"
            offset={30}
            closeOnClick={false}
            onClose={onPopupClose}
            className="!max-w-xs"
          >
            <div className="p-2 min-w-[180px]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{popupDestination.markerEmoji}</span>
                <div>
                  <h3 className="text-sm font-bold">{popupDestination.name}</h3>
                  <p className="text-[10px] text-gray-500">
                    {popupDestination.nameEn}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                {popupDestination.description}
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-600">
                  {formatKoreanWon(popupDestination.budgetRange.min)}~
                  {formatKoreanWon(popupDestination.budgetRange.max)}
                </span>
                <span className="text-gray-500">
                  {popupDestination.nights}박
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {popupDestination.highlights.map((h) => (
                  <span
                    key={h}
                    className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full"
                  >
                    {h}
                  </span>
                ))}
              </div>
              <button
                onClick={() => onToggleSelection(popupDestination.id)}
                className={cn(
                  'w-full mt-2.5 text-xs py-1.5 rounded-lg font-medium transition-colors',
                  selectedIds.includes(popupDestination.id)
                    ? 'bg-primary text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                )}
              >
                {selectedIds.includes(popupDestination.id)
                  ? '✓ 비교 목록에 추가됨'
                  : '비교 목록에 추가'}
              </button>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}

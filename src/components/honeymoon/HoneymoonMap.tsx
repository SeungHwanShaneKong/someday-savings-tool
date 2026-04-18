// [CL-PERF-DEPS-20260418-230000] 미사용 컴포넌트 — maplibre/react-map-gl 패키지 제거로 import 비활성화
// 이 파일은 허니문 외부화(CL-HONEYMOON-EXTERNAL-20260416) 이후 사용되지 않음
// import Map, { Marker, Popup, NavigationControl, Source, Layer, useMap } from 'react-map-gl/maplibre';
// import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { formatKoreanWon } from '@/lib/budget-categories';
import { useIsMobile } from '@/hooks/use-mobile';
import { MapPin } from 'lucide-react';
import type { Destination } from '@/lib/honeymoon-destinations';
import type { MapViewState } from '@/hooks/useHoneymoonMap';

/** 인천공항 좌표 (비행 아크 출발점) */
const ICN_COORDS: [number, number] = [126.45, 37.47];

/** CARTO Voyager — 프리미엄 무료 벡터 타일 */
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

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

/* ─── 대원항로(Great Circle) 보간 ─── */
function greatCircleArc(
  start: [number, number],
  end: [number, number],
  segments = 64
): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const [lon1, lat1] = [toRad(start[0]), toRad(start[1])];
  const [lon2, lat2] = [toRad(end[0]), toRad(end[1])];

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon1 - lon2) / 2), 2)
      )
    );

  if (d === 0) return [start, end];

  const points: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const f = i / segments;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    points.push([toDeg(Math.atan2(y, x)), toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)))]);
  }
  return points;
}

/**
 * [CL-MAP-WORLDCUP-FIX-20260330] MapController: 프로그래밍 flyTo 전용
 * 사용자 드래그(onMove)와 분리 — flyToTarget이 null이 아닐 때만 flyTo 실행
 */
function MapController({
  flyToTarget,
  onFlyToComplete,
}: {
  flyToTarget: MapViewState | null;
  onFlyToComplete: () => void;
}) {
  const { current: map } = useMap();

  useEffect(() => {
    if (!map || !flyToTarget) return;

    map.flyTo({
      center: [flyToTarget.longitude, flyToTarget.latitude],
      zoom: flyToTarget.zoom,
      pitch: flyToTarget.pitch ?? 20,
      bearing: flyToTarget.bearing ?? 0,
      duration: 2000,
      essential: true,
    });

    // flyTo 시작 후 즉시 클리어하여 중복 호출 방지
    onFlyToComplete();
  }, [map, flyToTarget, onFlyToComplete]);

  return null;
}

export function HoneymoonMap({
  viewState,
  onViewStateChange,
  flyToTarget,
  onFlyToComplete,
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
  const [initialFlyDone, setInitialFlyDone] = useState(false);

  const handleMove = useCallback(
    (evt: { viewState: MapViewState }) => {
      onViewStateChange(evt.viewState);
    },
    [onViewStateChange]
  );

  // [CL-TOP100-DESTINATIONS-20260325] 100개 중 점수 기반 표시 필터링
  const visibleDestinations = useMemo(() => {
    const threshold = viewState.zoom > 3 ? 0.2 : 0.4;
    return scoredDestinations.filter(({ destination, score }) =>
      score >= threshold || selectedIds.includes(destination.id) || destination.id === hoveredId
    );
  }, [scoredDestinations, selectedIds, hoveredId, viewState.zoom]);

  /* ─── 비행 아크 GeoJSON ─── */
  // [CL-TOP100-DESTINATIONS-20260325] 선택 + 상위 5개만 아크 표시
  const arcGeoJSON = useMemo(() => {
    const sorted = [...scoredDestinations].sort((a, b) => b.score - a.score);
    const topIds = new Set(sorted.slice(0, 5).map(s => s.destination.id));
    const arcTargets = scoredDestinations.filter(({ destination }) =>
      selectedIds.includes(destination.id) || topIds.has(destination.id)
    );
    const features = arcTargets.map(({ destination, score }) => {
      const coords = greatCircleArc(ICN_COORDS, destination.coordinates);
      const isSelected = selectedIds.includes(destination.id);
      return {
        type: 'Feature' as const,
        properties: {
          id: destination.id,
          score,
          selected: isSelected,
          opacity: isSelected ? 0.8 : score > 0.5 ? 0.25 : 0.08,
          width: isSelected ? 2.5 : 1.2,
          dashArray: isSelected ? [1, 0] : [4, 4],
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: coords,
        },
      };
    });
    return { type: 'FeatureCollection' as const, features };
  }, [scoredDestinations, selectedIds]);

  // [HONEYMOON-UPGRADE-2026-03-07] 도시 간 여행 경로선 GeoJSON (주황색 점선)
  const itineraryRouteGeoJSON = useMemo(() => {
    if (selectedIds.length < 2) {
      return { type: 'FeatureCollection' as const, features: [] as GeoJSON.Feature[] };
    }
    const selectedDests = selectedIds
      .map((id) => scoredDestinations.find((s) => s.destination.id === id)?.destination)
      .filter((d): d is Destination => d !== undefined);

    const features: GeoJSON.Feature[] = [];
    for (let i = 0; i < selectedDests.length - 1; i++) {
      const from = selectedDests[i];
      const to = selectedDests[i + 1];
      const coords = greatCircleArc(from.coordinates, to.coordinates);
      features.push({
        type: 'Feature',
        properties: { order: i },
        geometry: { type: 'LineString', coordinates: coords },
      });
    }
    return { type: 'FeatureCollection' as const, features };
  }, [selectedIds, scoredDestinations]);

  /* ─── 초기 로딩 후 한 번만 초기 뷰로 flyTo ─── */
  const handleLoad = useCallback(() => {
    setMapLoaded(true);
    if (!initialFlyDone) {
      setInitialFlyDone(true);
    }
  }, [initialFlyDone]);

  return (
    <div className="relative w-full h-full" style={{ touchAction: 'none' }}> {/* [CL-IMPROVE-7TASKS-20260330] 터치 제스처 활성화 */}
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
        initialViewState={{
          longitude: viewState.longitude,
          latitude: viewState.latitude,
          zoom: viewState.zoom,
          pitch: viewState.pitch ?? 20,
          bearing: viewState.bearing ?? 0,
        }}
        onMove={handleMove}
        onLoad={handleLoad}
        mapStyle={MAP_STYLE}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        maxPitch={60}
        reuseMaps
        touchZoomRotate
        touchPitch
        dragPan
        scrollZoom
        doubleClickZoom
      >
        <MapController flyToTarget={flyToTarget} onFlyToComplete={onFlyToComplete} />

        {/* [CL-IMPROVE-7TASKS-20260330] 모바일에서도 줌 버튼 표시 */}
        <NavigationControl position="top-right" showCompass={!isMobile} visualizePitch={false} />

        {/* ─── 비행 아크 라인 ─── */}
        <Source id="flight-arcs" type="geojson" data={arcGeoJSON}>
          <Layer
            id="flight-arcs-layer"
            type="line"
            paint={{
              'line-color': '#3b82f6',
              'line-opacity': ['get', 'opacity'],
              'line-width': ['get', 'width'],
              'line-dasharray': [4, 4],
            }}
            layout={{
              'line-cap': 'round',
              'line-join': 'round',
            }}
          />
        </Source>

        {/* ─── [HONEYMOON-UPGRADE-2026-03-07] 도시 간 여행 경로선 (주황색 점선) ─── */}
        <Source id="itinerary-route" type="geojson" data={itineraryRouteGeoJSON}>
          <Layer
            id="itinerary-route-layer"
            type="line"
            paint={{
              'line-color': '#f97316',
              'line-opacity': 0.8,
              'line-width': 3,
              'line-dasharray': [6, 4],
            }}
            layout={{
              'line-cap': 'round',
              'line-join': 'round',
            }}
          />
        </Source>

        {/* ─── 서울 마커 (출발점) ─── */}
        <Marker longitude={ICN_COORDS[0]} latitude={ICN_COORDS[1]} anchor="center">
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-blue-600 text-white w-6 h-6 flex items-center justify-center text-[10px] font-bold shadow-md border-2 border-white">
              ICN
            </div>
          </div>
        </Marker>

        {/* ─── 여행지 마커 ─── [CL-TOP100-DESTINATIONS-20260325] visibleDestinations 사용 */}
        {visibleDestinations.map(({ destination, score }) => {
          const isSelected = selectedIds.includes(destination.id);
          const isHovered = hoveredId === destination.id;
          const isActive = score > 0.5;
          // [HONEYMOON-UPGRADE-2026-03-07] 선택 순서 번호 (1-based)
          const selectionOrder = isSelected ? selectedIds.indexOf(destination.id) + 1 : 0;

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
                    isSelected && 'drop-shadow-[0_0_12px_hsl(var(--primary)/0.5)]'
                  )}
                >
                  {/* [HONEYMOON-UPGRADE-2026-03-07] 번호 배지 */}
                  {isSelected && selectionOrder > 0 && (
                    <div className="absolute -top-1.5 -left-1.5 z-10 bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md border border-white">
                      {selectionOrder}
                    </div>
                  )}
                  <div
                    className={cn(
                      'rounded-full px-2.5 py-1.5 text-center shadow-md border-2 bg-white transition-all',
                      isSelected
                        ? 'border-primary ring-4 ring-primary/20'
                        : isHovered
                          ? 'border-blue-300 shadow-lg'
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
                      'w-2 h-2 rotate-45 -mt-1 transition-colors',
                      isSelected ? 'bg-primary' : 'bg-white'
                    )}
                  />
                </div>
              </div>
            </Marker>
          );
        })}

        {/* ─── 팝업 ─── */}
        {popupDestination && (
          <Popup
            longitude={popupDestination.coordinates[0]}
            latitude={popupDestination.coordinates[1]}
            anchor="bottom"
            offset={30}
            closeOnClick={false}
            onClose={onPopupClose}
            className="!max-w-xs animate-fade-up"
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

import { useState, useCallback } from 'react';
import {
  DESTINATIONS,
  getMatchScore,
  type Destination,
  type HoneymoonConcept,
  type AccommodationType,
} from '@/lib/honeymoon-destinations';

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch?: number;    // 3D 틸트 (0~60)
  bearing?: number;  // 회전각 (0~360)
}

export interface HoneymoonFilters {
  maxBudget: number;
  minNights: number;
  maxNights: number;
  concepts: HoneymoonConcept[];
  accommodationTypes: AccommodationType[];
}

const DEFAULT_VIEW_STATE: MapViewState = {
  longitude: 100,
  latitude: 15,
  zoom: 1.8,
  pitch: 20,    // 약간의 3D 틸트
  bearing: 0,
};

const DEFAULT_FILTERS: HoneymoonFilters = {
  maxBudget: 15000000,
  minNights: 3,
  maxNights: 14,
  concepts: [],
  accommodationTypes: [],
};

export function useHoneymoonMap() {
  const [viewState, setViewState] = useState<MapViewState>(DEFAULT_VIEW_STATE);
  const [filters, setFilters] = useState<HoneymoonFilters>(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [popupDestination, setPopupDestination] = useState<Destination | null>(
    null
  );

  // Calculate match scores for all destinations
  const scoredDestinations = DESTINATIONS.map((d) => ({
    destination: d,
    score: getMatchScore(d, filters),
  }));

  // Fly to destination — 3D 프리미엄 카메라 이동
  const flyTo = useCallback((destination: Destination) => {
    setViewState({
      longitude: destination.coordinates[0],
      latitude: destination.coordinates[1],
      zoom: 5,
      pitch: 45,       // 3D 클로즈업
      bearing: -17,    // 약간 회전
    });
    setPopupDestination(destination);
  }, []);

  // Toggle destination selection (for comparison)
  const toggleSelection = useCallback(
    (destinationId: string) => {
      setSelectedIds((prev) => {
        if (prev.includes(destinationId)) {
          return prev.filter((id) => id !== destinationId);
        }
        if (prev.length >= 3) {
          // Max 3 for comparison
          return [...prev.slice(1), destinationId];
        }
        return [...prev, destinationId];
      });
    },
    []
  );

  // Update single filter
  const updateFilter = useCallback(
    <K extends keyof HoneymoonFilters>(
      key: K,
      value: HoneymoonFilters[K]
    ) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Reset view — 전체보기
  const resetView = useCallback(() => {
    setViewState(DEFAULT_VIEW_STATE);
    setPopupDestination(null);
  }, []);

  // [HONEYMOON-UPGRADE-2026-03-07] 선택 순서 보존: filter → map 방식으로 변경
  const selectedDestinations = selectedIds
    .map((id) => DESTINATIONS.find((d) => d.id === id))
    .filter((d): d is Destination => d !== undefined);

  // [HONEYMOON-UPGRADE-2026-03-07] 여행 일정 순서 변경 (드래그 정렬용)
  const reorderItinerary = useCallback((newOrder: string[]) => {
    setSelectedIds(newOrder);
  }, []);

  return {
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
  };
}

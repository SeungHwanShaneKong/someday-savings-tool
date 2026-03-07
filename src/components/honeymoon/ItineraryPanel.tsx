// [HONEYMOON-UPGRADE-2026-03-07] 드래그 정렬 가능한 여행 일정 패널
import { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Plane } from 'lucide-react';
import { formatKoreanWon } from '@/lib/budget-categories';
import { cn } from '@/lib/utils';
import type { Destination } from '@/lib/honeymoon-destinations';

interface ItineraryPanelProps {
  destinations: Destination[];
  selectedIds: string[];
  onReorder: (newOrder: string[]) => void;
  onRemove: (id: string) => void;
}

function SortableItem({
  destination,
  index,
  onRemove,
}: {
  destination: Destination;
  index: number;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: destination.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 p-2.5 bg-background rounded-lg border border-border/50 group',
        isDragging && 'opacity-50 shadow-lg z-50'
      )}
    >
      {/* Drag handle */}
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        {...attributes}
        {...listeners}
        aria-label="드래그하여 순서 변경"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Order number */}
      <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
        {index + 1}
      </div>

      {/* Destination info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{destination.markerEmoji}</span>
          <span className="text-sm font-semibold text-foreground truncate">
            {destination.name}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
          <span>{destination.nights}박</span>
          <span>{formatKoreanWon(destination.budgetRange.min)}~</span>
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={() => onRemove(destination.id)}
        className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        aria-label={`${destination.name} 제거`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ItineraryPanel({
  destinations,
  selectedIds,
  onReorder,
  onRemove,
}: ItineraryPanelProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = selectedIds.indexOf(active.id as string);
      const newIndex = selectedIds.indexOf(over.id as string);
      const newOrder = arrayMove(selectedIds, oldIndex, newIndex);
      onReorder(newOrder);
    },
    [selectedIds, onReorder]
  );

  // Totals
  const totalNights = destinations.reduce((sum, d) => sum + d.nights, 0);
  const totalBudgetMin = destinations.reduce((sum, d) => sum + d.budgetRange.min, 0);
  const totalBudgetMax = destinations.reduce((sum, d) => sum + d.budgetRange.max, 0);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-toss transition-all duration-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Plane className="w-4 h-4 text-primary" />
            여행 일정
          </h3>
          <span className="text-[11px] text-muted-foreground">
            {destinations.length}개 도시
          </span>
        </div>
      </div>

      <div className="p-3">
        {destinations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Plane className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">도시를 선택하세요</p>
            <p className="text-[11px] mt-1">추천 카드 또는 지도에서 도시를 추가할 수 있어요</p>
          </div>
        ) : (
          <>
            {/* Sortable list */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={selectedIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1.5">
                  {destinations.map((dest, i) => (
                    <SortableItem
                      key={dest.id}
                      destination={dest}
                      index={i}
                      onRemove={onRemove}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Route connectors visual */}
            {destinations.length >= 2 && (
              <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-muted-foreground">
                {destinations.map((d, i) => (
                  <span key={d.id} className="flex items-center gap-1">
                    <span className="font-medium">{d.name}</span>
                    {i < destinations.length - 1 && <span className="text-orange-400">→</span>}
                  </span>
                ))}
              </div>
            )}

            {/* Totals */}
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">총 일정</span>
                <span className="font-bold text-foreground">{totalNights}박</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-muted-foreground">총 예상 비용</span>
                <span className="font-bold text-primary">
                  {formatKoreanWon(totalBudgetMin)} ~ {formatKoreanWon(totalBudgetMax)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

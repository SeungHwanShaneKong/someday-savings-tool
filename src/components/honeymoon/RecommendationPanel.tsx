import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatKoreanWon } from '@/lib/budget-categories';
import { MapPin, Plus, Check } from 'lucide-react';
import type { Destination } from '@/lib/honeymoon-destinations';

interface ScoredDestination {
  destination: Destination;
  score: number;
}

interface RecommendationPanelProps {
  scoredDestinations: ScoredDestination[];
  selectedIds: string[];
  onFlyTo: (destination: Destination) => void;
  onToggleSelection: (id: string) => void;
}

export function RecommendationPanel({
  scoredDestinations,
  selectedIds,
  onFlyTo,
  onToggleSelection,
}: RecommendationPanelProps) {
  // 점수순 정렬
  const ranked = useMemo(
    () => [...scoredDestinations].sort((a, b) => b.score - a.score),
    [scoredDestinations]
  );

  const activeCount = ranked.filter(({ score }) => score > 0.5).length;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-toss transition-all duration-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <span>🎯</span> 맞춤 추천 결과
          </h3>
          <span className="text-[11px] text-muted-foreground">
            {activeCount}개 매칭
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="divide-y divide-border max-h-[calc(100vh-300px)] overflow-y-auto">
        {ranked.map(({ destination, score }, index) => {
          const isSelected = selectedIds.includes(destination.id);
          const isActive = score > 0.5;
          const isTop = score > 0.7;
          const matchPct = Math.round(score * 100);

          return (
            <div
              key={destination.id}
              className={cn(
                'p-3 transition-all duration-200 hover:bg-muted/30',
                !isActive && 'opacity-40'
              )}
            >
              {/* Rank + Name + Score */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{destination.markerEmoji}</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-foreground">
                        {destination.name}
                      </h4>
                      <span className="text-[10px] text-muted-foreground">
                        {destination.nameEn}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isTop && <span className="text-xs">🔥</span>}
                  <span
                    className={cn(
                      'text-xs font-bold px-2 py-0.5 rounded-full',
                      isTop
                        ? 'bg-primary/15 text-primary'
                        : isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {matchPct}%
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-[11px] text-muted-foreground mb-2 line-clamp-1">
                {destination.description}
              </p>

              {/* Info chips */}
              <div className="flex items-center gap-2 mb-2 text-[11px]">
                <span className="text-muted-foreground">
                  💰 {formatKoreanWon(destination.budgetRange.min)}~{formatKoreanWon(destination.budgetRange.max)}
                </span>
                <span className="text-muted-foreground">
                  📅 {destination.nights}박
                </span>
              </div>

              {/* Highlights */}
              <div className="flex flex-wrap gap-1 mb-2.5">
                {destination.highlights.slice(0, 3).map((h) => (
                  <span
                    key={h}
                    className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full"
                  >
                    {h}
                  </span>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => onFlyTo(destination)}
                  className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg py-1.5 transition-colors"
                >
                  <MapPin className="w-3 h-3" />
                  지도에서 보기
                </button>
                <button
                  onClick={() => onToggleSelection(destination.id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 text-[11px] font-medium rounded-lg py-1.5 transition-colors',
                    isSelected
                      ? 'bg-primary text-white'
                      : 'bg-muted/50 text-foreground hover:bg-muted'
                  )}
                >
                  {isSelected ? (
                    <>
                      <Check className="w-3 h-3" />
                      비교 중
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      비교 추가
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

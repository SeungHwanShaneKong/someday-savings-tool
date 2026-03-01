import { X } from 'lucide-react';
import { formatKoreanWon } from '@/lib/budget-categories';
import { cn } from '@/lib/utils';
import type { Destination } from '@/lib/honeymoon-destinations';

interface ComparisonCardsProps {
  destinations: Destination[];
  onRemove: (id: string) => void;
}

export function ComparisonCards({
  destinations,
  onRemove,
}: ComparisonCardsProps) {
  if (destinations.length === 0) return null;

  // Find max budget for relative bar widths
  const maxBudget = Math.max(...destinations.map((d) => d.budgetRange.max));

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        🔍 여행지 비교 ({destinations.length}개)
      </h3>

      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${destinations.length}, 1fr)` }}>
        {destinations.map((dest) => {
          const totalMin =
            dest.costBreakdown.flight.min +
            dest.costBreakdown.accommodation.min +
            dest.costBreakdown.local.min;
          const totalMax =
            dest.costBreakdown.flight.max +
            dest.costBreakdown.accommodation.max +
            dest.costBreakdown.local.max;

          return (
            <div
              key={dest.id}
              className="relative bg-muted/30 rounded-lg p-3 border border-border/50"
            >
              {/* Remove button */}
              <button
                onClick={() => onRemove(dest.id)}
                className="absolute top-1.5 right-1.5 p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Header */}
              <div className="text-center mb-2.5">
                <span className="text-2xl">{dest.markerEmoji}</span>
                <h4 className="text-sm font-bold text-foreground mt-1">
                  {dest.name}
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  {dest.nights}박
                </p>
              </div>

              {/* Total budget bar */}
              <div className="mb-3">
                <div className="h-6 bg-primary/10 rounded-md relative overflow-hidden">
                  <div
                    className="h-full bg-primary/30 rounded-md transition-all"
                    style={{
                      width: `${(totalMax / maxBudget) * 100}%`,
                    }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-primary">
                    {formatKoreanWon(totalMin)}~
                  </span>
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">✈️ 항공</span>
                  <span className="font-medium">
                    {formatKoreanWon(dest.costBreakdown.flight.min)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">🏨 숙소</span>
                  <span className="font-medium">
                    {formatKoreanWon(dest.costBreakdown.accommodation.min)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">🎯 현지</span>
                  <span className="font-medium">
                    {formatKoreanWon(dest.costBreakdown.local.min)}
                  </span>
                </div>
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-1 mt-2.5">
                {dest.highlights.slice(0, 2).map((h) => (
                  <span
                    key={h}
                    className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

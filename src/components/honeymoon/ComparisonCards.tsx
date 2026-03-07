// [HONEYMOON-UPGRADE-2026-03-07] 레이더 차트 비교 추가
import { useMemo } from 'react';
import { X } from 'lucide-react';
import { formatKoreanWon } from '@/lib/budget-categories';
import { cn } from '@/lib/utils';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend,
} from 'recharts';
import type { Destination } from '@/lib/honeymoon-destinations';

interface ComparisonCardsProps {
  destinations: Destination[];
  scores?: Map<string, number>; // [HONEYMOON-UPGRADE-2026-03-07] 매치 스코어 전달
  onRemove: (id: string) => void;
}

// [HONEYMOON-UPGRADE-2026-03-07] 레이더 차트 색상 팔레트
const RADAR_COLORS = ['#3b82f6', '#f97316', '#22c55e'];

export function ComparisonCards({
  destinations,
  scores,
  onRemove,
}: ComparisonCardsProps) {
  if (destinations.length === 0) return null;

  // Find max budget for relative bar widths
  const maxBudget = Math.max(...destinations.map((d) => d.budgetRange.max));

  // [HONEYMOON-UPGRADE-2026-03-07] 레이더 차트 데이터 계산
  const radarData = useMemo(() => {
    const axes = ['예산', '숙박일수', '컨셉', '비자', '매치점수'];
    const maxNights = Math.max(...destinations.map((d) => d.nights), 1);
    const maxBudgetVal = Math.max(...destinations.map((d) => d.budgetRange.max), 1);

    return axes.map((axis) => {
      const point: Record<string, string | number> = { axis };
      destinations.forEach((d) => {
        let value = 0;
        switch (axis) {
          case '예산':
            // 반전: 저렴할수록 높은 점수
            value = Math.round((1 - d.budgetRange.min / maxBudgetVal) * 100);
            break;
          case '숙박일수':
            value = Math.round((d.nights / maxNights) * 100);
            break;
          case '컨셉':
            value = Math.round((d.concepts.length / 4) * 100);
            break;
          case '비자':
            value = d.visaRequired ? 30 : 100;
            break;
          case '매치점수':
            value = Math.round((scores?.get(d.id) ?? 0.5) * 100);
            break;
        }
        point[d.name] = value;
      });
      return point;
    });
  }, [destinations, scores]);

  return (
    <div className="bg-card rounded-xl border border-border p-4 hover:shadow-toss transition-all duration-200">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        🔍 여행지 비교 ({destinations.length}개)
      </h3>

      {/* [HONEYMOON-UPGRADE-2026-03-07] 레이더 차트 비교 */}
      {destinations.length >= 2 && (
        <div className="mb-4 bg-muted/20 rounded-lg p-3">
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid strokeDasharray="3 3" />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
              {destinations.map((d, i) => (
                <Radar
                  key={d.id}
                  name={d.name}
                  dataKey={d.name}
                  stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
                  fill={RADAR_COLORS[i % RADAR_COLORS.length]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div
        className={cn(
          'grid gap-3',
          destinations.length === 1 && 'grid-cols-1',
          destinations.length === 2 && 'grid-cols-1 sm:grid-cols-2',
          destinations.length >= 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        )}
      >
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
              className="group relative bg-muted/30 rounded-lg p-3 border border-border/50 hover:shadow-toss-sm transition-all duration-200"
            >
              {/* Remove button — visible on hover */}
              <button
                onClick={() => onRemove(dest.id)}
                className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 rounded-full hover:bg-destructive/10"
                aria-label={`${dest.name} 비교에서 제거`}
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Header */}
              <div className="text-center mb-2.5">
                <span className="text-2xl">{dest.markerEmoji}</span>
                <h4 className="text-sm font-bold text-foreground mt-1">
                  {dest.name}
                </h4>
                <p className="text-[11px] text-muted-foreground">
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

// [HONEYMOON-UPGRADE-2026-03-07] 여행 일정 비용 합산기
import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatKoreanWon } from '@/lib/budget-categories';
import { Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Destination } from '@/lib/honeymoon-destinations';

interface ItineraryCostCalculatorProps {
  destinations: Destination[];
}

type BudgetTier = 'economy' | 'standard' | 'luxury';

const TIER_LABELS: Record<BudgetTier, string> = {
  economy: '절약형',
  standard: '표준형',
  luxury: '럭셔리',
};

const TIER_MULTIPLIER: Record<BudgetTier, (min: number, max: number) => number> = {
  economy: (min) => min,
  standard: (min, max) => Math.round((min + max) / 2),
  luxury: (_, max) => max,
};

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f97316'];

export function ItineraryCostCalculator({ destinations }: ItineraryCostCalculatorProps) {
  const [tier, setTier] = useState<BudgetTier>('standard');

  const costs = useMemo(() => {
    const calc = TIER_MULTIPLIER[tier];
    let flight = 0;
    let accommodation = 0;
    let local = 0;

    destinations.forEach((d) => {
      flight += calc(d.costBreakdown.flight.min, d.costBreakdown.flight.max);
      accommodation += calc(d.costBreakdown.accommodation.min, d.costBreakdown.accommodation.max);
      local += calc(d.costBreakdown.local.min, d.costBreakdown.local.max);
    });

    const total = flight + accommodation + local;
    return { flight, accommodation, local, total };
  }, [destinations, tier]);

  const pieData = useMemo(
    () => [
      { name: '항공', value: costs.flight },
      { name: '숙소', value: costs.accommodation },
      { name: '현지', value: costs.local },
    ],
    [costs]
  );

  if (destinations.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-toss transition-all duration-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-primary" />
            총 예상 비용
          </h3>
          <span className="text-lg font-bold text-primary">
            {formatKoreanWon(costs.total)}
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* Tier selector */}
        <div className="flex gap-1 mb-4 p-1 bg-muted/50 rounded-lg">
          {(Object.keys(TIER_LABELS) as BudgetTier[]).map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={cn(
                'flex-1 text-xs py-1.5 rounded-md font-medium transition-all',
                tier === t
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {TIER_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Donut chart + breakdown */}
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={40}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatKoreanWon(value)}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 space-y-2">
            {pieData.map((entry, i) => (
              <div key={entry.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                  <span className="text-muted-foreground">
                    {entry.name === '항공' ? '✈️' : entry.name === '숙소' ? '🏨' : '🎯'} {entry.name}
                  </span>
                </div>
                <span className="font-semibold text-foreground">
                  {formatKoreanWon(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Per-city breakdown */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground mb-1.5">도시별 비용 ({TIER_LABELS[tier]})</p>
          <div className="space-y-1">
            {destinations.map((d) => {
              const calc = TIER_MULTIPLIER[tier];
              const cityTotal =
                calc(d.costBreakdown.flight.min, d.costBreakdown.flight.max) +
                calc(d.costBreakdown.accommodation.min, d.costBreakdown.accommodation.max) +
                calc(d.costBreakdown.local.min, d.costBreakdown.local.max);
              const pct = costs.total > 0 ? Math.round((cityTotal / costs.total) * 100) : 0;

              return (
                <div key={d.id} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1">
                    <span>{d.markerEmoji}</span>
                    <span className="text-foreground font-medium">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/60 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-medium text-foreground w-16 text-right">
                      {formatKoreanWon(cityTotal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

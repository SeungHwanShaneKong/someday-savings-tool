// [HONEYMOON-UPGRADE-2026-03-07] 배지 + 퀵스탯 미니바 + 애니메이션 스코어
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatKoreanWon } from '@/lib/budget-categories';
import { MapPin, Plus, Check } from 'lucide-react';
import { computeBadges, type Destination } from '@/lib/honeymoon-destinations';

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

// [HONEYMOON-UPGRADE-2026-03-07] 원형 프로그레스 SVG 애니메이션 스코어
function AnimatedScore({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score);
  const color = score >= 0.8 ? '#22c55e' : score >= 0.5 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
        <circle
          cx="28" cy="28" r={radius} fill="none"
          stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease-out, stroke 0.3s' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

// [HONEYMOON-UPGRADE-2026-03-07] 비용 미니바 (항공/숙소/현지)
function CostMiniBar({ destination }: { destination: Destination }) {
  const { flight, accommodation, local } = destination.costBreakdown;
  const fMid = (flight.min + flight.max) / 2;
  const aMid = (accommodation.min + accommodation.max) / 2;
  const lMid = (local.min + local.max) / 2;
  const total = fMid + aMid + lMid;
  if (total === 0) return null;

  return (
    <div className="mt-1.5">
      <div className="flex h-1.5 rounded-full overflow-hidden bg-muted/50">
        <div className="bg-blue-400" style={{ width: `${(fMid / total) * 100}%` }} title="항공" />
        <div className="bg-emerald-400" style={{ width: `${(aMid / total) * 100}%` }} title="숙소" />
        <div className="bg-orange-400" style={{ width: `${(lMid / total) * 100}%` }} title="현지" />
      </div>
      <div className="flex justify-between mt-0.5 text-[9px] text-muted-foreground">
        <span>✈️항공 {Math.round((fMid / total) * 100)}%</span>
        <span>🏨숙소 {Math.round((aMid / total) * 100)}%</span>
        <span>🎯현지 {Math.round((lMid / total) * 100)}%</span>
      </div>
    </div>
  );
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
          // [HONEYMOON-UPGRADE-2026-03-07] 배지 계산
          const badges = computeBadges(destination);

          return (
            <div
              key={destination.id}
              className={cn(
                'p-3 transition-all duration-200 hover:bg-muted/30',
                !isActive && 'opacity-40'
              )}
            >
              {/* [HONEYMOON-UPGRADE-2026-03-07] Rank + Name + AnimatedScore */}
              <div className="flex items-start justify-between mb-1.5 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl flex-shrink-0">{destination.markerEmoji}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-foreground">
                        {destination.name}
                      </h4>
                      <span className="text-[10px] text-muted-foreground">
                        {destination.nameEn}
                      </span>
                    </div>
                    {/* [HONEYMOON-UPGRADE-2026-03-07] 스마트 배지 */}
                    {badges.length > 0 && (
                      <div className="flex gap-1 mt-0.5">
                        {badges.map((b) => (
                          <span key={b.label} className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded-full', b.color)}>
                            {b.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <AnimatedScore score={score} />
              </div>

              {/* Description */}
              <p className="text-[11px] text-muted-foreground mb-2 line-clamp-1">
                {destination.description}
              </p>

              {/* Info chips */}
              <div className="flex items-center gap-2 mb-1 text-[11px]">
                <span className="text-muted-foreground">
                  💰 {formatKoreanWon(destination.budgetRange.min)}~{formatKoreanWon(destination.budgetRange.max)}
                </span>
                <span className="text-muted-foreground">
                  📅 {destination.nights}박
                </span>
                <span className="text-muted-foreground">
                  💵 {formatKoreanWon(Math.round(((destination.budgetRange.min + destination.budgetRange.max) / 2) / destination.nights))}/박
                </span>
              </div>

              {/* [HONEYMOON-UPGRADE-2026-03-07] 비용 미니바 */}
              <CostMiniBar destination={destination} />

              {/* Highlights */}
              <div className="flex flex-wrap gap-1 mt-2 mb-2.5">
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

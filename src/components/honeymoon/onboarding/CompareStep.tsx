/**
 * [CL-HONEYMOON-JOURNEY-20260405-180000] 여행지 비교 단계
 * 원칙 1: 비교가 메인 경험, 지도는 보조
 * 월드컵 Top 4 + AI 추천으로 최대 5개 비교
 */

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight, Eye, X, Plus,
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend,
} from 'recharts';
import { formatKoreanWon } from '@/lib/budget-categories';
import { getDestinationById, type Destination } from '@/lib/honeymoon-destinations';
import { DESTINATION_IMAGES } from '@/lib/honeymoon-destination-images';
import { cn } from '@/lib/utils';
import { DestinationDetailSheet } from '@/components/honeymoon/DestinationDetailSheet';
import type { TravelProfile } from '@/lib/honeymoon-profile';
import type { AICurationResult } from '@/hooks/useHoneymoonPlanner';

// [CL-PLAN-ADD-DEST-NOMAP-20260405-210000] onGoToMap 제거
interface CompareStepProps {
  results: AICurationResult;
  profile: TravelProfile;
  onGoToPlan: () => void;
  onBack: () => void;
}

// 레이더 차트 색상
const RADAR_COLORS = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#ec4899'];

// 월드컵 랭크 판정
function getWorldCupRank(
  destId: string,
  ranking?: TravelProfile['worldCupRanking'],
): 'champion' | 'finalist' | 'semi' | 'quarter' | null {
  if (!ranking) return null;
  if (ranking.champion === destId) return 'champion';
  if (ranking.finalist === destId) return 'finalist';
  if (ranking.semiFinalists.includes(destId)) return 'semi';
  if (ranking.quarterFinalists.includes(destId)) return 'quarter';
  return null;
}

const RANK_LABEL: Record<string, string> = {
  champion: '🏆',
  finalist: '🥈',
  semi: '🥉',
  quarter: '🏅',
};

export function CompareStep({ results, profile, onGoToPlan }: CompareStepProps) {
  // 초기 비교 대상: 월드컵 Top 4 + AI 추천으로 최대 5개
  const initialIds = useMemo(() => {
    const ids = new Set<string>();
    const ranking = profile.worldCupRanking;
    if (ranking) {
      ids.add(ranking.champion);
      ids.add(ranking.finalist);
      ranking.semiFinalists.forEach(id => ids.add(id));
    }
    // AI 추천으로 보충 (최대 5개)
    results.recommendations.forEach(r => {
      if (ids.size < 5) ids.add(r.destinationId);
    });
    return Array.from(ids);
  }, [profile.worldCupRanking, results.recommendations]);

  const [compareIds, setCompareIds] = useState<string[]>(initialIds);
  const [detailDest, setDetailDest] = useState<Destination | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);

  const compareDestinations = useMemo(
    () => compareIds.map(id => getDestinationById(id)).filter(Boolean) as Destination[],
    [compareIds],
  );

  const scoreMap = useMemo(() => {
    const m = new Map<string, number>();
    results.recommendations.forEach(r => m.set(r.destinationId, r.matchScore));
    return m;
  }, [results.recommendations]);

  const removeFromCompare = useCallback((id: string) => {
    setCompareIds(prev => prev.filter(x => x !== id));
  }, []);

  const addToCompare = useCallback((id: string) => {
    setCompareIds(prev => {
      if (prev.includes(id) || prev.length >= 5) return prev;
      return [...prev, id];
    });
    setShowAddPanel(false);
  }, []);

  // 레이더 차트 데이터
  const radarData = useMemo(() => {
    if (compareDestinations.length < 2) return [];
    const axes = ['예산', '숙박일수', '컨셉', '비자', '매치점수'];
    const maxNights = Math.max(...compareDestinations.map(d => d.nights), 1);
    const maxBudgetVal = Math.max(...compareDestinations.map(d => d.budgetRange.max), 1);

    return axes.map(axis => {
      const point: Record<string, string | number> = { axis };
      compareDestinations.forEach(d => {
        let value = 0;
        switch (axis) {
          case '예산': value = Math.round((1 - d.budgetRange.min / maxBudgetVal) * 100); break;
          case '숙박일수': value = Math.round((d.nights / maxNights) * 100); break;
          case '컨셉': value = Math.round((d.concepts.length / 4) * 100); break;
          case '비자': value = d.visaRequired ? 30 : 100; break;
          case '매치점수': value = Math.round((scoreMap.get(d.id) ?? 0.5) * 100); break;
        }
        point[d.name] = value;
      });
      return point;
    });
  }, [compareDestinations, scoreMap]);

  // 추가 가능한 여행지 (AI 추천 중 미포함)
  const addableDests = useMemo(() => {
    return results.recommendations
      .filter(r => !compareIds.includes(r.destinationId))
      .map(r => getDestinationById(r.destinationId))
      .filter(Boolean) as Destination[];
  }, [results.recommendations, compareIds]);

  const maxBudget = Math.max(...compareDestinations.map(d => d.budgetRange.max), 1);

  return (
    <div className="flex flex-col items-center w-full py-6">
      <h2 className="text-subheading text-foreground mb-2 animate-fade-up">
        여행지 비교
      </h2>
      <p className="text-xs text-muted-foreground mb-6 animate-fade-up" style={{ animationDelay: '0.05s' }}>
        {compareDestinations.length}개 여행지를 비교하고 있어요
      </p>

      {/* 비교 카드 그리드 */}
      <div className={cn(
        'w-full grid gap-3 mb-4 animate-fade-up',
        compareDestinations.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      )} style={{ animationDelay: '0.1s' }}>
        {compareDestinations.map((dest) => {
          const rank = getWorldCupRank(dest.id, profile.worldCupRanking);
          const imageData = DESTINATION_IMAGES[dest.id];
          const score = scoreMap.get(dest.id);
          const totalMin =
            dest.costBreakdown.flight.min +
            dest.costBreakdown.accommodation.min +
            dest.costBreakdown.local.min;

          return (
            <div
              key={dest.id}
              className={cn(
                'group relative bg-card rounded-xl border border-border/50 overflow-hidden hover:shadow-toss transition-all duration-200',
                rank === 'champion' && 'ring-2 ring-yellow-400/50',
              )}
            >
              {/* 이미지 (작은 히어로) */}
              <div className="relative aspect-[2/1] bg-gradient-to-br from-primary/10 to-muted/30 overflow-hidden">
                {imageData?.url ? (
                  <img
                    src={imageData.thumbUrl.replace('w=100', 'w=400')}
                    alt={dest.name}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-3xl">{dest.markerEmoji}</span>
                  </div>
                )}
                {rank && (
                  <span className="absolute top-2 left-2 text-lg">{RANK_LABEL[rank]}</span>
                )}
                {score && (
                  <Badge className="absolute top-2 right-2 bg-background/80 text-foreground text-[10px]">
                    {Math.round(score * 100)}%
                  </Badge>
                )}
                {/* 제거 버튼 */}
                <button
                  onClick={() => removeFromCompare(dest.id)}
                  className="absolute bottom-2 right-2 p-1 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
                  aria-label={`${dest.name} 제거`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-3">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  {dest.markerEmoji} {dest.name}
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {dest.nights}박 · {dest.concepts.join(' · ')}
                </p>

                {/* 예산 바 */}
                <div className="mt-2 mb-2">
                  <div className="h-5 bg-primary/10 rounded-md relative overflow-hidden">
                    <div
                      className="h-full bg-primary/30 rounded-md transition-all"
                      style={{ width: `${(dest.budgetRange.max / maxBudget) * 100}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary">
                      {formatKoreanWon(totalMin)}~
                    </span>
                  </div>
                </div>

                {/* 하이라이트 */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {dest.highlights.slice(0, 3).map(h => (
                    <span key={h} className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                      {h}
                    </span>
                  ))}
                </div>

                {/* 자세히 보기 */}
                <button
                  onClick={() => { setDetailDest(dest); setDetailOpen(true); }}
                  className="w-full flex items-center justify-center gap-1 text-[11px] text-primary font-medium bg-primary/5 hover:bg-primary/10 rounded-lg py-1.5 transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  자세히 보기
                </button>
              </div>
            </div>
          );
        })}

        {/* 추가 버튼 (5개 미만일 때) */}
        {compareIds.length < 5 && (
          <button
            onClick={() => setShowAddPanel(!showAddPanel)}
            className="flex flex-col items-center justify-center gap-2 min-h-[140px] border-2 border-dashed border-border/50 rounded-xl hover:border-primary/30 hover:bg-primary/[0.02] transition-all text-muted-foreground hover:text-primary"
          >
            <Plus className="w-6 h-6" />
            <span className="text-xs font-medium">여행지 추가</span>
          </button>
        )}
      </div>

      {/* 추가 패널 */}
      {showAddPanel && addableDests.length > 0 && (
        <div className="w-full bg-muted/20 rounded-xl border border-border/50 p-3 mb-4 animate-fade-up">
          <p className="text-xs font-medium text-muted-foreground mb-2">추천 여행지에서 추가</p>
          <div className="flex flex-wrap gap-2">
            {addableDests.slice(0, 6).map(d => (
              <button
                key={d.id}
                onClick={() => addToCompare(d.id)}
                className="flex items-center gap-1.5 text-xs bg-background border border-border/50 rounded-lg px-2.5 py-1.5 hover:border-primary/30 transition-colors"
              >
                <span>{d.markerEmoji}</span>
                <span>{d.name}</span>
                <Plus className="w-3 h-3 text-primary" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 레이더 차트 */}
      {compareDestinations.length >= 2 && (
        <div className="w-full bg-card rounded-xl border border-border p-4 mb-6 animate-fade-up" style={{ animationDelay: '0.15s' }}>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            📊 종합 비교
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid strokeDasharray="3 3" />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
              {compareDestinations.map((d, i) => (
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

      {/* CTAs */}
      <div className="w-full max-w-sm space-y-3 animate-fade-up" style={{ animationDelay: '0.2s' }}>
        <Button
          size="lg"
          onClick={() => onGoToPlan()}
          className="w-full rounded-2xl py-5 text-base font-semibold shadow-primary-glow"
          disabled={compareDestinations.length === 0}
        >
          <ArrowRight className="w-5 h-5 mr-2" />
          여행 일정 만들기
        </Button>

      </div>

      {/* DetailSheet */}
      <DestinationDetailSheet
        destination={detailDest}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        worldCupRank={detailDest ? getWorldCupRank(detailDest.id, profile.worldCupRanking) : null}
        onAddToCompare={addToCompare}
        compareDisabled={compareIds.length >= 5 || (detailDest ? compareIds.includes(detailDest.id) : false)}
      />
    </div>
  );
}

/**
 * [CL-HONEYMOON-REDESIGN-20260316] AI 큐레이션 결과 화면
 * 3개 추천 카드 + BEST 배지 + 완료/재시작 CTA
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MapPin, RotateCcw, ChevronDown } from 'lucide-react';
import { formatKoreanWon } from '@/lib/budget-categories';
import { getDestinationById } from '@/lib/honeymoon-destinations';
import { cn } from '@/lib/utils';
import type { TravelProfile } from '@/lib/honeymoon-profile';
import type { AICurationResult } from '@/hooks/useHoneymoonPlanner';

interface ResultsStepProps {
  profile: TravelProfile;
  results: AICurationResult;
  onComplete: () => void;
  onRetry: () => void;
}

export function ResultsStep({ profile, results, onComplete, onRetry }: ResultsStepProps) {
  // [CL-TOP100-DESTINATIONS-20260325] 모바일에서 상위 3개만 기본, 나머지 토글
  const [showAll, setShowAll] = useState(false);
  const displayRecs = showAll ? results.recommendations : results.recommendations.slice(0, 3);
  const hiddenCount = results.recommendations.length - 3;

  return (
    <div className="flex flex-col items-center w-full py-6">
      {/* Profile badge */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-center mb-6 w-full max-w-sm animate-fade-up">
        <span className="text-3xl">{results.profileEmoji || profile.profileEmoji}</span>
        <p className="text-sm font-bold text-foreground mt-2">
          {results.profileLabel || profile.profileLabel}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {results.profileSummary}
        </p>
      </div>

      {/* Section title */}
      <h2 className="text-subheading text-foreground mb-4">
        맞춤 추천 여행지
      </h2>

      {/* Recommended destinations */}
      <div className="w-full space-y-3 mb-4">
        {displayRecs.map((rec, idx) => {
          const dest = getDestinationById(rec.destinationId);
          if (!dest) return null;

          return (
            <Card
              key={rec.destinationId}
              className={cn(
                'p-4 transition-all duration-200 hover:shadow-toss animate-fade-up',
                idx === 0 && profile.worldCupRanking?.champion === rec.destinationId
                  ? 'border-yellow-400/50 bg-yellow-50/30 dark:bg-yellow-900/10'
                  : idx === 0 && 'border-primary/30 bg-primary/[0.02]',
              )}
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {/* [CL-WORLDCUP-IMG-ALGO-20260405-140000] 월드컵 랭크 배지 */}
                  {(() => {
                    const r = profile.worldCupRanking;
                    if (r?.champion === rec.destinationId) return <Badge className="bg-yellow-500 text-white text-[10px] px-2 py-0.5">🏆 우승</Badge>;
                    if (r?.finalist === rec.destinationId) return <Badge className="bg-gray-400 text-white text-[10px] px-2 py-0.5">🥈 준우승</Badge>;
                    if (r?.semiFinalists.includes(rec.destinationId)) return <Badge className="bg-amber-600 text-white text-[10px] px-2 py-0.5">🥉 4강</Badge>;
                    if (r?.quarterFinalists.includes(rec.destinationId)) return <Badge className="bg-primary/80 text-white text-[10px] px-2 py-0.5">8강</Badge>;
                    if (idx === 0) return <Badge className="bg-primary text-white text-[10px] px-2 py-0.5">BEST</Badge>;
                    return null;
                  })()}
                  <span className="text-xl">{dest.markerEmoji}</span>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {dest.name}
                    </h3>
                    <span className="text-[10px] text-muted-foreground">
                      {dest.nameEn}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-primary">
                    {Math.round(rec.matchScore * 100)}%
                  </span>
                  <p className="text-[9px] text-muted-foreground">매칭</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                {rec.reason}
              </p>

              <div className="flex flex-wrap gap-1 mb-2">
                {rec.highlights.map(h => (
                  <span
                    key={h}
                    className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full"
                  >
                    {h}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>
                  💰 {formatKoreanWon(dest.budgetRange.min)}~{formatKoreanWon(dest.budgetRange.max)}
                </span>
                <span>📅 {dest.nights}박</span>
                {rec.weatherNote && <span>🌤️ {rec.weatherNote}</span>}
              </div>
            </Card>
          );
        })}
      </div>

      {/* [CL-TOP100-DESTINATIONS-20260325] 더보기 토글 */}
      {hiddenCount > 0 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="flex items-center gap-1 text-sm text-primary font-medium mb-6 hover:underline"
        >
          <ChevronDown className="w-4 h-4" />
          추천 {hiddenCount}개 더 보기
        </button>
      )}

      {/* Action buttons */}
      <div className="w-full max-w-sm space-y-3">
        <Button
          size="lg"
          onClick={onComplete}
          className="w-full rounded-2xl py-5 text-base font-semibold shadow-primary-glow"
        >
          <MapPin className="w-5 h-5 mr-2" />
          이 결과로 여행 계획 세우기
        </Button>

        <button
          onClick={onRetry}
          className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          <RotateCcw className="w-4 h-4" />
          처음부터 다시 해보기
        </button>
      </div>
    </div>
  );
}

/**
 * [CL-HONEYMOON-REDESIGN-20260316] AI 큐레이션 결과 화면
 * [CL-HONEYMOON-JOURNEY-20260405-180000] 데이터 강화 + DetailSheet 연결 + CTA 변경
 * 원칙 2: "자세히 보기" → DestinationDetailSheet 직접 연결 (지도 불필요)
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  ArrowRight, RotateCcw, ChevronDown, Eye,
  Shield, ShieldCheck, Calendar, Palmtree, Globe, ShoppingBag, Mountain,
} from 'lucide-react';
import { formatKoreanWon } from '@/lib/budget-categories';
import { getDestinationById, type Destination, type HoneymoonConcept } from '@/lib/honeymoon-destinations';
import { DESTINATION_IMAGES } from '@/lib/honeymoon-destination-images';
import { cn } from '@/lib/utils';
import { DestinationDetailSheet } from '@/components/honeymoon/DestinationDetailSheet';
import type { TravelProfile } from '@/lib/honeymoon-profile';
import type { AICurationResult } from '@/hooks/useHoneymoonPlanner';

interface ResultsStepProps {
  profile: TravelProfile;
  results: AICurationResult;
  onComplete: () => void;   // → goToStep('compare')
  onRetry: () => void;
}

// ── 컨셉 아이콘 매핑 ──
const CONCEPT_ICON: Record<HoneymoonConcept, React.ReactNode> = {
  '휴양': <Palmtree className="w-3 h-3" />,
  '관광': <Globe className="w-3 h-3" />,
  '쇼핑': <ShoppingBag className="w-3 h-3" />,
  '액티비티': <Mountain className="w-3 h-3" />,
};

// ── 월드컵 랭크 판정 ──
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

const RANK_BADGE: Record<string, { label: string; className: string }> = {
  champion: { label: '🏆 우승', className: 'bg-yellow-500 text-white' },
  finalist: { label: '🥈 준우승', className: 'bg-gray-400 text-white' },
  semi:     { label: '🥉 4강', className: 'bg-amber-600 text-white' },
  quarter:  { label: '8강', className: 'bg-primary/80 text-white' },
};

export function ResultsStep({ profile, results, onComplete, onRetry }: ResultsStepProps) {
  const [showAll, setShowAll] = useState(false);
  const [detailDest, setDetailDest] = useState<Destination | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const displayRecs = showAll ? results.recommendations : results.recommendations.slice(0, 3);
  const hiddenCount = results.recommendations.length - 3;

  const openDetail = useCallback((dest: Destination) => {
    setDetailDest(dest);
    setDetailOpen(true);
  }, []);

  // 우승지 히어로 데이터
  const championRec = results.recommendations.find(
    r => profile.worldCupRanking?.champion === r.destinationId
  ) ?? results.recommendations[0];
  const championDest = championRec ? getDestinationById(championRec.destinationId) : null;
  const championImage = championDest ? DESTINATION_IMAGES[championDest.id] : null;
  const [heroImgError, setHeroImgError] = useState(false);
  const hasHeroImage = !!championImage?.url && !heroImgError;

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

      {/* [CL-HONEYMOON-JOURNEY-20260405-180000] 우승지 히어로 카드 */}
      {championDest && championRec && (
        <div
          className="w-full max-w-sm mb-6 rounded-2xl overflow-hidden border-2 border-yellow-400/50 shadow-lg animate-fade-up cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => openDetail(championDest)}
          style={{ animationDelay: '0.05s' }}
        >
          <div className="relative aspect-[16/9] bg-gradient-to-br from-yellow-400/20 to-primary/10">
            {hasHeroImage ? (
              <img
                key={championDest.id}
                src={championImage!.url}
                alt={championDest.name}
                className="w-full h-full object-cover"
                onError={() => setHeroImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-5xl">{championDest.markerEmoji}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <Badge className="absolute top-3 left-3 bg-yellow-500 text-white text-xs px-2.5 py-1">
              🏆 월드컵 우승
            </Badge>
            <div className="absolute bottom-3 left-3 right-3">
              <h3 className="text-white font-bold text-lg">
                {championDest.markerEmoji} {championDest.name}
              </h3>
              <p className="text-white/80 text-xs mt-0.5 line-clamp-1">
                {championRec.reason}
              </p>
            </div>
            <div className="absolute bottom-3 right-3">
              <span className="text-2xl font-bold text-white">
                {Math.round(championRec.matchScore * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Section title */}
      <h2 className="text-subheading text-foreground mb-4">
        맞춤 추천 여행지
      </h2>

      {/* Recommended destinations — 강화된 카드 */}
      <div className="w-full space-y-3 mb-4">
        {displayRecs.map((rec, idx) => {
          const dest = getDestinationById(rec.destinationId);
          if (!dest) return null;

          const rank = getWorldCupRank(rec.destinationId, profile.worldCupRanking);
          const rankBadge = rank ? RANK_BADGE[rank] : null;

          return (
            <Card
              key={rec.destinationId}
              className={cn(
                'p-4 transition-all duration-200 hover:shadow-toss animate-fade-up',
                rank === 'champion'
                  ? 'border-yellow-400/50 bg-yellow-50/30 dark:bg-yellow-900/10'
                  : idx === 0 && 'border-primary/30 bg-primary/[0.02]',
              )}
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {/* 월드컵 랭크 배지 */}
                  {rankBadge ? (
                    <Badge className={cn('text-[10px] px-2 py-0.5', rankBadge.className)}>
                      {rankBadge.label}
                    </Badge>
                  ) : idx === 0 ? (
                    <Badge className="bg-primary text-white text-[10px] px-2 py-0.5">BEST</Badge>
                  ) : null}
                  <span className="text-xl">{dest.markerEmoji}</span>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{dest.name}</h3>
                    <span className="text-[10px] text-muted-foreground">{dest.nameEn}</span>
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

              {/* [CL-HONEYMOON-JOURNEY-20260405-180000] features 태그 (상위 3개) */}
              <div className="flex flex-wrap gap-1 mb-2">
                {dest.features.slice(0, 3).map(f => (
                  <span key={f} className="text-[9px] bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded-full">
                    {f}
                  </span>
                ))}
                {rec.highlights.map(h => (
                  <span key={h} className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {h}
                  </span>
                ))}
              </div>

              {/* [CL-HONEYMOON-JOURNEY-20260405-180000] 강화된 메타 정보 */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground mb-2">
                <span>
                  💰 {formatKoreanWon(dest.budgetRange.min)}~{formatKoreanWon(dest.budgetRange.max)}
                </span>
                <span>📅 {dest.nights}박</span>
                {/* 비자 아이콘 */}
                <span className="flex items-center gap-0.5">
                  {dest.visaRequired ? (
                    <><Shield className="w-3 h-3 text-orange-500" /> 비자 필요</>
                  ) : (
                    <><ShieldCheck className="w-3 h-3 text-green-500" /> 무비자</>
                  )}
                </span>
                {/* 예약 적기 */}
                <span className="flex items-center gap-0.5">
                  <Calendar className="w-3 h-3" /> {dest.bestBookingWeeks}주 전 예약
                </span>
                {rec.weatherNote && <span>🌤️ {rec.weatherNote}</span>}
              </div>

              {/* [CL-HONEYMOON-JOURNEY-20260405-180000] 컨셉 + 숙소 타입 */}
              <div className="flex flex-wrap items-center gap-1 mb-2">
                {dest.concepts.map(c => (
                  <Badge key={c} variant="outline" className="text-[9px] gap-0.5 py-0 px-1.5 h-5">
                    {CONCEPT_ICON[c]} {c}
                  </Badge>
                ))}
                {dest.accommodationTypes.slice(0, 2).map(a => (
                  <Badge key={a} variant="secondary" className="text-[9px] py-0 px-1.5 h-5">
                    {a}
                  </Badge>
                ))}
              </div>

              {/* 자세히 보기 버튼 */}
              <button
                onClick={() => openDetail(dest)}
                className="w-full flex items-center justify-center gap-1 text-xs text-primary font-medium bg-primary/5 hover:bg-primary/10 rounded-lg py-2 transition-colors mt-1"
              >
                <Eye className="w-3.5 h-3.5" />
                자세히 보기
              </button>
            </Card>
          );
        })}
      </div>

      {/* 더보기 토글 */}
      {hiddenCount > 0 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="flex items-center gap-1 text-sm text-primary font-medium mb-6 hover:underline"
        >
          <ChevronDown className="w-4 h-4" />
          추천 {hiddenCount}개 더 보기
        </button>
      )}

      {/* Action buttons — CTA 변경 */}
      <div className="w-full max-w-sm space-y-3">
        <Button
          size="lg"
          onClick={onComplete}
          className="w-full rounded-2xl py-5 text-base font-semibold shadow-primary-glow"
        >
          <ArrowRight className="w-5 h-5 mr-2" />
          여행지 비교하기
        </Button>

        <button
          onClick={onRetry}
          className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          <RotateCcw className="w-4 h-4" />
          처음부터 다시 해보기
        </button>
      </div>

      {/* DestinationDetailSheet */}
      <DestinationDetailSheet
        destination={detailDest}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        worldCupRank={detailDest ? getWorldCupRank(detailDest.id, profile.worldCupRanking) : null}
      />
    </div>
  );
}

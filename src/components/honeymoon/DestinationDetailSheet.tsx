/**
 * [CL-HONEYMOON-JOURNEY-20260405-180000] 여행지 상세 정보 시트
 * 원칙 2 실현: 지도 없이도 완전한 정보 제공
 * 7개 섹션: 기본정보, 여행스타일, 즐길거리, 비용, 비자, 최적예약, 월드컵순위
 */

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Globe, ShieldCheck, Shield, Calendar, Clock,
  Palmtree, Mountain, ShoppingBag, Waves, Hotel, Home,
  Building2, Star, Plus,
} from 'lucide-react';
import { formatKoreanWon } from '@/lib/budget-categories';
import { DESTINATION_IMAGES } from '@/lib/honeymoon-destination-images';
import { cn } from '@/lib/utils';
import type { Destination, HoneymoonConcept, AccommodationType } from '@/lib/honeymoon-destinations';

// ── Props ──

interface DestinationDetailSheetProps {
  destination: Destination | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worldCupRank?: 'champion' | 'finalist' | 'semi' | 'quarter' | null;
  onAddToCompare?: (id: string) => void;
  // [CL-PLAN-ADD-DEST-NOMAP-20260405-210000] onViewOnMap 제거
  compareDisabled?: boolean;
}

// ── 컨셉/숙소 아이콘 매핑 ──

const CONCEPT_ICON: Record<HoneymoonConcept, React.ReactNode> = {
  '휴양': <Palmtree className="w-3.5 h-3.5" />,
  '관광': <Globe className="w-3.5 h-3.5" />,
  '쇼핑': <ShoppingBag className="w-3.5 h-3.5" />,
  '액티비티': <Mountain className="w-3.5 h-3.5" />,
};

const ACCOMMODATION_ICON: Record<AccommodationType, React.ReactNode> = {
  '풀빌라': <Waves className="w-3.5 h-3.5" />,
  '올인클루시브': <Star className="w-3.5 h-3.5" />,
  '리조트': <Palmtree className="w-3.5 h-3.5" />,
  '호텔': <Hotel className="w-3.5 h-3.5" />,
  '에어비앤비': <Home className="w-3.5 h-3.5" />,
};

const RANK_CONFIG = {
  champion:  { label: '우승', emoji: '🏆', color: 'bg-yellow-500 text-white' },
  finalist:  { label: '준우승', emoji: '🥈', color: 'bg-gray-400 text-white' },
  semi:      { label: '4강', emoji: '🥉', color: 'bg-amber-600 text-white' },
  quarter:   { label: '8강', emoji: '🏅', color: 'bg-primary/80 text-white' },
};

// ── 컴포넌트 ──

export function DestinationDetailSheet({
  destination,
  open,
  onOpenChange,
  worldCupRank,
  onAddToCompare,
  compareDisabled,
}: DestinationDetailSheetProps) {
  const [imgError, setImgError] = useState(false);

  if (!destination) return null;

  const imageData = DESTINATION_IMAGES[destination.id];
  const hasImage = !!imageData?.url && !imgError;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg p-0 flex flex-col"
      >
        <ScrollArea className="flex-1">
          {/* 히어로 이미지 */}
          <div className="relative w-full aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
            {hasImage ? (
              <img
                key={destination.id}
                src={imageData!.url}
                alt={destination.name}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl">{destination.markerEmoji}</span>
              </div>
            )}
            {/* 월드컵 랭크 배지 */}
            {worldCupRank && RANK_CONFIG[worldCupRank] && (
              <Badge className={cn(
                'absolute top-3 left-3 text-xs px-2.5 py-1',
                RANK_CONFIG[worldCupRank].color,
              )}>
                {RANK_CONFIG[worldCupRank].emoji} 월드컵 {RANK_CONFIG[worldCupRank].label}
              </Badge>
            )}
          </div>

          <div className="p-5 space-y-5">
            {/* 섹션 1: 기본 정보 */}
            <SheetHeader className="text-left">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{destination.markerEmoji}</span>
                <div>
                  <SheetTitle className="text-lg">{destination.name}</SheetTitle>
                  <SheetDescription className="text-xs">
                    {destination.nameEn} · {destination.region}
                  </SheetDescription>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                {destination.description}
              </p>
            </SheetHeader>

            {/* 빠른 요약 */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">예산</p>
                <p className="text-xs font-bold text-foreground mt-0.5">
                  {formatKoreanWon(destination.budgetRange.min)}~
                </p>
              </div>
              <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">일정</p>
                <p className="text-xs font-bold text-foreground mt-0.5">
                  {destination.nights}박
                </p>
              </div>
              <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">비자</p>
                <p className="text-xs font-bold text-foreground mt-0.5 flex items-center justify-center gap-0.5">
                  {destination.visaRequired ? (
                    <><Shield className="w-3 h-3 text-orange-500" /> 필요</>
                  ) : (
                    <><ShieldCheck className="w-3 h-3 text-green-500" /> 무비자</>
                  )}
                </p>
              </div>
            </div>

            {/* 섹션 2: 여행 스타일 */}
            <section>
              <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-primary" />
                여행 스타일
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {destination.concepts.map(c => (
                  <Badge key={c} variant="outline" className="text-[11px] gap-1 py-0.5">
                    {CONCEPT_ICON[c]}
                    {c}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {destination.accommodationTypes.map(a => (
                  <Badge key={a} variant="secondary" className="text-[11px] gap-1 py-0.5">
                    {ACCOMMODATION_ICON[a]}
                    {a}
                  </Badge>
                ))}
              </div>
            </section>

            {/* 섹션 3: 즐길거리 */}
            <section>
              <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-primary" />
                즐길거리
              </h4>
              <div className="grid grid-cols-2 gap-1.5">
                {destination.features.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/20 rounded-md px-2 py-1.5"
                  >
                    <span className="text-primary">•</span>
                    {f}
                  </div>
                ))}
              </div>
              {/* 하이라이트 */}
              <div className="flex flex-wrap gap-1 mt-2">
                {destination.highlights.map(h => (
                  <span
                    key={h}
                    className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </section>

            {/* 섹션 4: 비용 상세 */}
            <section>
              <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                비용 상세 (1인 기준)
              </h4>
              <div className="bg-muted/20 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left p-2 text-muted-foreground font-medium">항목</th>
                      <th className="text-right p-2 text-muted-foreground font-medium">절약형</th>
                      <th className="text-right p-2 text-muted-foreground font-medium">표준형</th>
                      <th className="text-right p-2 text-muted-foreground font-medium">럭셔리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: '✈️ 항공', data: destination.costBreakdown.flight },
                      { label: '🏨 숙소', data: destination.costBreakdown.accommodation },
                      { label: '🎯 현지', data: destination.costBreakdown.local },
                    ].map(row => (
                      <tr key={row.label} className="border-b border-border/30 last:border-0">
                        <td className="p-2 text-foreground">{row.label}</td>
                        <td className="p-2 text-right text-foreground">{formatKoreanWon(row.data.min)}</td>
                        <td className="p-2 text-right text-foreground font-medium">
                          {formatKoreanWon(Math.round((row.data.min + row.data.max) / 2))}
                        </td>
                        <td className="p-2 text-right text-foreground">{formatKoreanWon(row.data.max)}</td>
                      </tr>
                    ))}
                    <tr className="bg-primary/5">
                      <td className="p-2 font-bold text-foreground">합계</td>
                      <td className="p-2 text-right font-bold text-primary">
                        {formatKoreanWon(
                          destination.costBreakdown.flight.min +
                          destination.costBreakdown.accommodation.min +
                          destination.costBreakdown.local.min
                        )}
                      </td>
                      <td className="p-2 text-right font-bold text-primary">
                        {formatKoreanWon(Math.round(
                          (destination.costBreakdown.flight.min + destination.costBreakdown.flight.max) / 2 +
                          (destination.costBreakdown.accommodation.min + destination.costBreakdown.accommodation.max) / 2 +
                          (destination.costBreakdown.local.min + destination.costBreakdown.local.max) / 2
                        ))}
                      </td>
                      <td className="p-2 text-right font-bold text-primary">
                        {formatKoreanWon(
                          destination.costBreakdown.flight.max +
                          destination.costBreakdown.accommodation.max +
                          destination.costBreakdown.local.max
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 섹션 5: 비자/입국 */}
            <section>
              <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                {destination.visaRequired ? (
                  <Shield className="w-3.5 h-3.5 text-orange-500" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                )}
                비자/입국 정보
              </h4>
              <div className={cn(
                'rounded-lg p-3 text-xs',
                destination.visaRequired
                  ? 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/30'
                  : 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30',
              )}>
                {destination.visaRequired ? (
                  <p className="text-orange-700 dark:text-orange-300">
                    비자가 필요합니다. 출국 2개월 전까지 비자 신청을 완료하세요. 여권 유효기간 6개월 이상 확인 필수.
                  </p>
                ) : (
                  <p className="text-green-700 dark:text-green-300">
                    무비자 입국 가능합니다. 여권 유효기간 6개월 이상만 확인하세요.
                  </p>
                )}
              </div>
            </section>

            {/* 섹션 6: 최적 예약 시기 */}
            <section>
              <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                최적 예약 시기
              </h4>
              <div className="bg-muted/20 rounded-lg p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">
                    출국 {destination.bestBookingWeeks}주 전 예약 권장
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    항공권은 이 시점에 예약하면 최저가를 잡을 확률이 높습니다
                  </p>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>

        {/* 하단 CTA — 고정 */}
        <div className="border-t border-border bg-background p-4 flex gap-2 flex-shrink-0">
          {onAddToCompare && (
            <Button
              className="flex-1"
              onClick={() => {
                onAddToCompare(destination.id);
                onOpenChange(false);
              }}
              disabled={compareDisabled}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              비교에 추가
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

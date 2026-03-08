// [EF-RESILIENCE-20260308-041500]
// P3 Honeymoon Planner Panel — AI 신혼여행 종합 플래너 Sheet UI

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw } from 'lucide-react';
import type { HoneymoonPlan } from '@/hooks/useHoneymoonPlanner';

interface HoneymoonPlannerPanelProps {
  plan: HoneymoonPlan | null;
  loading: boolean;
  error: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry?: () => void;
}

// ── 금액 포맷 ──
function formatWon(amount: number): string {
  return `${amount.toLocaleString()}원`;
}

// ── 예산 항목 한국어 레이블 ──
const BUDGET_LABELS: Record<string, string> = {
  flights: '항공권',
  accommodation: '숙소',
  meals: '식비',
  activities: '액티비티',
  buffer: '예비비',
};

// ── 예산 항목 색상 ──
const BUDGET_COLORS: Record<string, string> = {
  flights: 'bg-emerald-500',
  accommodation: 'bg-teal-500',
  meals: 'bg-cyan-500',
  activities: 'bg-sky-500',
  buffer: 'bg-slate-400',
};

// ── Loading Skeleton ──
function PlannerSkeleton() {
  return (
    <div className="space-y-4 p-1">
      {/* Destination skeleton */}
      <div className="h-24 rounded-lg bg-muted animate-pulse" />
      {/* Itinerary skeleton */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
      ))}
      {/* Budget skeleton */}
      <div className="h-32 rounded-lg bg-muted animate-pulse" />
      {/* Alternatives skeleton */}
      <div className="h-16 rounded-lg bg-muted animate-pulse" />
    </div>
  );
}

export function HoneymoonPlannerPanel({
  plan,
  loading,
  error,
  open,
  onOpenChange,
  onRetry,
}: HoneymoonPlannerPanelProps) {
  const budgetTotal = plan?.budget_breakdown
    ? Object.values(plan.budget_breakdown).reduce((sum, v) => sum + v, 0)
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-hidden flex flex-col"
      >
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <span>✈️ AI 신혼여행 플래너</span>
            {plan?.recommended_destination && (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0">
                {plan.recommended_destination}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            예산과 일정에 맞는 최적의 신혼여행을 AI가 설계합니다
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
          {/* Loading */}
          {loading && <PlannerSkeleton />}

          {/* Error */}
          {error && !loading && (
            <Card className="p-4 border-red-200 bg-red-50">
              <p className="text-sm text-red-600 font-medium">오류 발생</p>
              <p className="text-sm text-red-500 mt-1">{error}</p>
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="mt-3 border-red-300 text-red-600 hover:bg-red-100"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  다시 시도
                </Button>
              )}
            </Card>
          )}

          {/* Raw text fallback */}
          {plan?.raw_text && !plan.recommended_destination && !loading && (
            <Card className="p-4 border-amber-200 bg-amber-50">
              <p className="text-sm font-medium text-amber-700 mb-2">
                AI 응답 (구조화 실패 — 원문 표시)
              </p>
              <p className="text-sm text-amber-900 whitespace-pre-wrap">
                {plan.raw_text}
              </p>
            </Card>
          )}

          {/* Plan Content */}
          {plan && plan.recommended_destination && !loading && (
            <div className="space-y-5 pb-6">
              {/* ─── 1. 추천 여행지 ─── */}
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4">
                  <h3 className="text-white font-bold text-base">
                    🌴 추천 여행지
                  </h3>
                  <p className="text-emerald-50 text-xl font-semibold mt-1">
                    {plan.recommended_destination}
                  </p>
                </div>
                {budgetTotal > 0 && (
                  <div className="p-3 bg-emerald-50/50">
                    <p className="text-sm text-emerald-700">
                      총 예상 비용:{' '}
                      <span className="font-bold">{formatWon(budgetTotal)}</span>
                    </p>
                  </div>
                )}
              </Card>

              {/* ─── 2. 일정표 ─── */}
              {plan.itinerary.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                    📅 일정표
                    <Badge variant="outline" className="text-xs ml-1">
                      {plan.itinerary.length}일
                    </Badge>
                  </h3>
                  <div className="space-y-2">
                    {plan.itinerary.map((day) => (
                      <Card
                        key={day.day}
                        className="p-3 border-l-4 border-l-emerald-400"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-emerald-700">
                            Day {day.day}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-xs bg-teal-100 text-teal-700"
                          >
                            {formatWon(day.estimated_cost)}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-700">{day.activities}</p>
                        {day.tips && (
                          <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                            <span className="shrink-0">💡</span>
                            <span>{day.tips}</span>
                          </p>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── 3. 예산 분석 ─── */}
              {budgetTotal > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2">
                    💰 예산 분석
                  </h3>
                  <Card className="p-4">
                    <div className="space-y-3">
                      {Object.entries(plan.budget_breakdown).map(
                        ([key, value]) => {
                          const pct =
                            budgetTotal > 0
                              ? Math.round((value / budgetTotal) * 100)
                              : 0;
                          return (
                            <div key={key}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-slate-600">
                                  {BUDGET_LABELS[key] || key}
                                </span>
                                <span className="font-medium text-slate-800">
                                  {formatWon(value)}{' '}
                                  <span className="text-xs text-slate-400">
                                    ({pct}%)
                                  </span>
                                </span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${BUDGET_COLORS[key] || 'bg-slate-300'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t flex justify-between">
                      <span className="text-sm font-bold text-slate-700">합계</span>
                      <span className="text-sm font-bold text-emerald-600">
                        {formatWon(budgetTotal)}
                      </span>
                    </div>
                  </Card>
                </div>
              )}

              {/* ─── 4. 대안 여행지 ─── */}
              {plan.alternatives.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2">
                    🔄 대안 여행지
                  </h3>
                  <div className="space-y-2">
                    {plan.alternatives.map((alt, idx) => (
                      <Card key={idx} className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-slate-800">
                            {alt.destination}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              alt.cost_diff <= 0
                                ? 'text-emerald-600 border-emerald-300'
                                : 'text-rose-600 border-rose-300'
                            }
                          >
                            {alt.cost_diff <= 0 ? '' : '+'}
                            {formatWon(alt.cost_diff)}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">{alt.reason}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── 5. 예약 팁 ─── */}
              {plan.booking_tips.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2">
                    🎯 예약 팁
                  </h3>
                  <div className="space-y-2">
                    {plan.booking_tips.map((tip, idx) => (
                      <Card key={idx} className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-slate-800">
                            {tip.item}
                          </span>
                          <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-200 border-0 text-xs">
                            {tip.optimal_timing}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                          예상 절감: {tip.savings_estimate}
                        </p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!plan && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-3">✈️</div>
              <p className="text-sm text-muted-foreground">
                예산과 일정을 입력하면
                <br />
                AI가 최적의 신혼여행을 설계합니다
              </p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// [CL-TOP20-P3-SUMMARY-20260703-030000] 비교 뷰 AI 인사이트 카드
// ① 로컬 계산 인사이트(summary-insights.ts 순수 함수)를 즉시 표시 — 네트워크 0
// ② AI 협상 조언은 명시적 버튼으로만 호출(자동 호출 금지 — 쿼터 보호),
//    응답은 sessionStorage 캐시(예산 id 조합 키), 실패 시 로컬 인사이트 유지(기존 폴백 패턴).

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, MessageSquareQuote, PiggyBank, Sparkles } from 'lucide-react';
import { useNegotiateCoach, type NegotiationResult } from '@/hooks/useNegotiateCoach';
import { formatKoreanWon } from '@/lib/budget-categories';
import {
  computeComparisonInsights,
  buildInsightCacheKey,
  readInsightCache,
  writeInsightCache,
  type InsightBudget,
} from '@/lib/summary-insights';

interface ComparisonInsightsCardProps {
  budgets: InsightBudget[];
}

export function ComparisonInsightsCard({ budgets }: ComparisonInsightsCardProps) {
  const insights = useMemo(() => computeComparisonInsights(budgets), [budgets]);
  const cacheKey = useMemo(
    () => buildInsightCacheKey(budgets.map(b => b.id)),
    [budgets],
  );

  const { result, loading, error, askCoach } = useNegotiateCoach();
  const [aiResult, setAiResult] = useState<NegotiationResult | null>(null);
  const [aiRequested, setAiRequested] = useState(false);

  // 예산 조합이 바뀌면 해당 조합의 캐시로 리셋
  useEffect(() => {
    setAiResult(readInsightCache<NegotiationResult>(cacheKey));
    setAiRequested(false);
  }, [cacheKey]);

  // 훅 응답 도착 → 표시 + 캐시 (이 카드에서 요청한 응답만 수용)
  useEffect(() => {
    if (aiRequested && result) {
      setAiResult(result);
      writeInsightCache(cacheKey, result);
    }
  }, [aiRequested, result, cacheKey]);

  if (!insights) return null;

  const { totalGap, topCategoryGaps, splitGaps } = insights;
  const topGap = topCategoryGaps[0];
  const topSplitGap = splitGaps[0];

  const handleAskAI = () => {
    if (loading || !topGap) return;
    setAiRequested(true);
    // 가장 격차가 큰 카테고리 기준으로 협상 조언 요청 (최고가 예산의 금액)
    askCoach(topGap.categoryName, topGap.max.amount);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-amber-500" aria-hidden="true" />
        <h3 className="text-lg font-semibold">비교 인사이트</h3>
      </div>

      {/* ── 로컬 계산 인사이트 (즉시 표시) ── */}
      <div className="space-y-3">
        {/* 총액 차 */}
        <p className="text-sm leading-relaxed">
          {totalGap.isTie ? (
            <>모든 옵션의 총액이 <strong>{formatKoreanWon(totalGap.min.amount)}</strong>으로 같아요.</>
          ) : (
            <>
              <strong className="text-green-600">{totalGap.min.label}</strong>이(가){' '}
              <strong className="text-orange-600">{totalGap.max.label}</strong>보다 총{' '}
              <strong>{formatKoreanWon(totalGap.gap)}</strong> 저렴해요.
            </>
          )}
        </p>

        {/* 최대 격차 카테고리 top3 */}
        {topCategoryGaps.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              격차가 큰 카테고리 TOP {topCategoryGaps.length}
            </p>
            <ul className="space-y-2">
              {topCategoryGaps.map(catGap => (
                <li
                  key={catGap.categoryId}
                  className="flex items-center justify-between gap-2 rounded-lg bg-secondary/60 px-3 py-2"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span aria-hidden="true">{catGap.icon}</span>
                    <span className="text-sm truncate">{catGap.categoryName}</span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block text-sm font-semibold">
                      {formatKoreanWon(catGap.gap)} 차이
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {catGap.min.label} {catGap.min.amount > 0 ? formatKoreanWon(catGap.min.amount) : '없음'}
                      {' · '}
                      {catGap.max.label} {formatKoreanWon(catGap.max.amount)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 분담 차이 */}
        {topSplitGap && (
          <p className="text-xs text-muted-foreground">
            분담 기준으로는 <strong className="text-foreground">{topSplitGap.splitLabel} 부담</strong>의
            옵션 간 차이가 가장 커요 ({topSplitGap.min.label}{' '}
            {topSplitGap.min.amount > 0 ? formatKoreanWon(topSplitGap.min.amount) : '0원'} ↔{' '}
            {topSplitGap.max.label} {formatKoreanWon(topSplitGap.max.amount)}).
          </p>
        )}
      </div>

      {/* ── AI 협상 조언 (명시적 버튼 · html2canvas 이미지 저장에서는 제외) ── */}
      {topGap && (
        <div className="mt-4 border-t pt-4" data-html2canvas-ignore="true">
          {!aiResult && !loading && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-lg"
                onClick={handleAskAI}
              >
                <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
                AI 협상 조언 받기
              </Button>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                격차가 가장 큰 &lsquo;{topGap.categoryName}&rsquo; 항목의 협상 전략을 AI가 분석해요.
                버튼을 눌렀을 때만 호출돼요.
              </p>
              {error && (
                <p className="mt-2 text-xs text-destructive" role="alert">
                  AI 조언을 불러오지 못했어요. 위 비교 인사이트를 참고해주세요. ({error})
                </p>
              )}
            </>
          )}

          {loading && (
            <div className="space-y-2" role="status" aria-label="AI 분석 중">
              <p className="text-xs text-muted-foreground">AI가 협상 전략을 분석하고 있어요…</p>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}

          {aiResult && !loading && (
            <div aria-live="polite">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                💡 &lsquo;{topGap.categoryName}&rsquo; AI 협상 조언
              </p>
              <ul className="space-y-3">
                {aiResult.tips.map((tip, idx) => (
                  <li key={idx} className="rounded-lg border border-amber-200/60 bg-amber-50/50 p-3">
                    <p className="text-sm font-medium text-amber-900">{tip.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {tip.description}
                    </p>
                    {tip.example && (
                      <p className="mt-1.5 flex items-start gap-1.5 text-xs italic text-amber-800">
                        <MessageSquareQuote
                          className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600"
                          aria-hidden="true"
                        />
                        {tip.example}
                      </p>
                    )}
                    {tip.savings_estimate && (
                      <Badge
                        variant="outline"
                        className="mt-2 bg-amber-100/80 text-amber-800 border-amber-300"
                      >
                        <PiggyBank className="h-3 w-3 mr-1" aria-hidden="true" />
                        {tip.savings_estimate}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-muted-foreground">
                이 조언은 현재 브라우저 세션에 저장되어 다시 열어도 추가 호출 없이 표시돼요.
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

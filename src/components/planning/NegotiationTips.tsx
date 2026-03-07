// [AGENT-TEAM-9-20260307] 협상 팁 시트 컴포넌트
// 카테고리별 협상 팁을 Sheet 패널로 표시

import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Lightbulb,
  MessageSquareQuote,
  PiggyBank,
  Shield,
  TrendingDown,
  X,
} from 'lucide-react';
import type { NegotiationResult } from '@/hooks/useNegotiateCoach';

interface NegotiationTipsProps {
  open?: boolean;
  category?: string;
  result: NegotiationResult | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

/** 신뢰도 수준별 라벨 & 색상 */
function getConfidenceBadge(confidence: number) {
  if (confidence >= 0.8) {
    return { label: '협상 성공률 높음', variant: 'default' as const, className: 'bg-green-600' };
  }
  if (confidence >= 0.5) {
    return { label: '협상 가능성 보통', variant: 'default' as const, className: 'bg-amber-500' };
  }
  return { label: '협상 난이도 높음', variant: 'default' as const, className: 'bg-red-500' };
}

/** 팁 인덱스별 아이콘 */
const TIP_ICONS = [Lightbulb, TrendingDown, MessageSquareQuote, PiggyBank, Shield];

/** 스켈레톤 카드 (로딩 상태) */
function SkeletonCard() {
  return (
    <Card className="border-amber-200/50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-6 w-1/3" />
      </CardContent>
    </Card>
  );
}

export function NegotiationTips({
  open,
  category,
  result,
  loading,
  error,
  onClose,
}: NegotiationTipsProps) {
  const isOpen = open !== undefined ? open : (loading || !!result || !!error);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="flex flex-col p-0 w-full sm:max-w-lg">
        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200/50">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-amber-900">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              <span>{category ? `💡 ${category} 협상 팁` : '💡 협상 팁'}</span>
            </SheetTitle>
          </SheetHeader>
          <p className="mt-1 text-sm text-amber-700/80">
            AI가 분석한 맞춤 협상 전략을 확인하세요
          </p>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* 로딩 상태 */}
          {loading && (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {/* 에러 상태 */}
          {error && !loading && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <p className="font-medium">협상 팁을 불러오지 못했습니다</p>
              <p className="mt-1 text-red-600/80">{error}</p>
            </div>
          )}

          {/* 결과 표시 */}
          {result && !loading && (
            <>
              {result.tips.map((tip, idx) => {
                const Icon = TIP_ICONS[idx % TIP_ICONS.length];

                return (
                  <Card
                    key={idx}
                    className={cn(
                      'border-amber-200/60 shadow-sm',
                      'hover:shadow-md transition-shadow'
                    )}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base text-amber-900">
                        <div className="flex-shrink-0 p-1.5 rounded-full bg-gradient-to-br from-amber-100 to-yellow-100">
                          <Icon className="h-4 w-4 text-amber-700" />
                        </div>
                        {tip.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* 설명 */}
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {tip.description}
                      </p>

                      {/* 대화 예시 */}
                      <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200/40">
                        <div className="flex items-start gap-2">
                          <MessageSquareQuote className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-amber-800 italic leading-relaxed">
                            {tip.example}
                          </p>
                        </div>
                      </div>

                      {/* 절감 예상 */}
                      <Badge
                        variant="outline"
                        className="bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-amber-300"
                      >
                        <PiggyBank className="h-3 w-3 mr-1" />
                        {tip.savings_estimate}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>

        {/* ── Footer: Confidence badge ── */}
        {result && !loading && (
          <div className="px-6 py-4 border-t border-amber-200/50 bg-gradient-to-r from-amber-50/50 to-yellow-50/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">협상 성공 가능성</span>
              {(() => {
                const badge = getConfidenceBadge(result.confidence);
                return (
                  <Badge variant={badge.variant} className={badge.className}>
                    <Shield className="h-3 w-3 mr-1" />
                    {badge.label} ({Math.round(result.confidence * 100)}%)
                  </Badge>
                );
              })()}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

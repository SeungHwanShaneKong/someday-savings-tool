/**
 * 경제적 파급 효과 대시보드 섹션 (BRD §7)
 * Admin 페이지에 임베드되는 임팩트 메트릭 패널
 */

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts';
import {
  TrendingDown, Lightbulb, Shield, PiggyBank, Eye, BarChart3,
} from 'lucide-react';
import { formatKoreanWon } from '@/lib/budget-categories';
import type { ImpactSummary } from '@/lib/impact-calculator';
import { getImpactHeadline } from '@/lib/impact-calculator';

interface ImpactMetricsProps {
  impact: ImpactSummary;
  loading?: boolean;
}

const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '13px',
};

export function ImpactMetrics({ impact, loading }: ImpactMetricsProps) {
  const headline = useMemo(() => getImpactHeadline(impact), [impact]);

  // 카테고리별 절감 차트 데이터
  const categoryChartData = useMemo(() => {
    return impact.categoryBreakdown
      .filter((c) => c.avgReferenceAmount > 0)
      .map((c) => ({
        name: c.categoryName,
        사용자평균: Math.round(c.avgUserAmount / 10000),
        전국평균: Math.round(c.avgReferenceAmount / 10000),
        절감률: c.diffPercent,
      }));
  }, [impact]);

  // 절감/초과 파이 데이터
  const savingsDistData = useMemo(() => {
    const below = impact.belowAvgPercent;
    const above = impact.aboveAvgPercent;
    const same = Math.max(0, 100 - below - above);
    return [
      { name: '평균 이하 (절약)', value: below, fill: '#10b981' },
      { name: '평균 수준', value: same, fill: '#94a3b8' },
      { name: '평균 초과', value: above, fill: '#f59e0b' },
    ].filter((d) => d.value > 0);
  }, [impact]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      {/* 헤더 */}
      <div>
        <h2 className="text-base sm:text-lg font-bold leading-relaxed flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-emerald-500" />
          경제적 파급 효과
        </h2>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          {headline}
        </p>
      </div>

      {/* 4칸 임팩트 위젯 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 평균 절감액 */}
        <Card className="p-5 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-200/50 dark:border-emerald-800/50 hover:shadow-lg transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">사용자당 평균 절감액</p>
              <p className="text-2xl sm:text-3xl font-bold tabular-nums">
                {impact.avgSavingsAmount > 0
                  ? formatKoreanWon(impact.avgSavingsAmount)
                  : '—'}
              </p>
              <Badge
                variant="outline"
                className="text-xs bg-emerald-100/50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
              >
                {impact.avgSavingsRate > 0 ? `${impact.avgSavingsRate}% 절감률` : '데이터 수집 중'}
              </Badge>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10">
              <PiggyBank className="h-6 w-6 text-emerald-500" />
            </div>
          </div>
        </Card>

        {/* 전체 절감 추정액 */}
        <Card className="p-5 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50 dark:border-blue-800/50 hover:shadow-lg transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">전체 절감 추정액</p>
              <p className="text-2xl sm:text-3xl font-bold tabular-nums">
                {impact.totalSavingsEstimate > 0
                  ? formatKoreanWon(impact.totalSavingsEstimate)
                  : '—'}
              </p>
              <p className="text-xs text-muted-foreground">
                {impact.activeBudgets}개 예산 기준
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10">
              <TrendingDown className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </Card>

        {/* 숨겨진 비용 인지 */}
        <Card className="p-5 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-200/50 dark:border-amber-800/50 hover:shadow-lg transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">숨겨진 비용 사전 인지</p>
              <p className="text-2xl sm:text-3xl font-bold tabular-nums">
                {impact.avgHiddenCostsIdentified > 0
                  ? `${impact.avgHiddenCostsIdentified}건`
                  : '—'}
              </p>
              <p className="text-xs text-muted-foreground">
                사용자 평균 인지 건수
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10">
              <Lightbulb className="h-6 w-6 text-amber-500" />
            </div>
          </div>
        </Card>

        {/* 예비비 추정 총액 */}
        <Card className="p-5 bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-200/50 dark:border-violet-800/50 hover:shadow-lg transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">예비비 추정 총액</p>
              <p className="text-2xl sm:text-3xl font-bold tabular-nums">
                {impact.totalContingencyFund > 0
                  ? formatKoreanWon(impact.totalContingencyFund)
                  : '—'}
              </p>
              <p className="text-xs text-muted-foreground">
                사용자들이 대비해야 할 합계
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-violet-500/10">
              <Shield className="h-6 w-6 text-violet-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* 차트 행 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 카테고리별 비교 차트 */}
        <Card className="p-4 sm:p-5 hover:shadow-md transition-shadow">
          <h3 className="text-sm sm:text-base font-semibold mb-3 leading-relaxed">
            카테고리별 사용자 vs 전국 평균 (만원)
          </h3>
          <div className="h-64 sm:h-72">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    width={80}
                  />
                  <RechartsTooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString()}만원`,
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '13px' }} />
                  <Bar dataKey="사용자평균" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16} />
                  <Bar dataKey="전국평균" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                카테고리 데이터가 없습니다
              </div>
            )}
          </div>
        </Card>

        {/* 절감 분포 차트 */}
        <Card className="p-4 sm:p-5 hover:shadow-md transition-shadow">
          <h3 className="text-sm sm:text-base font-semibold mb-3 leading-relaxed">
            항목별 절감 분포
          </h3>
          <div className="h-64 sm:h-72">
            {savingsDistData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={savingsDistData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                  <RechartsTooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value: number) => [`${value}%`, '비율']}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={48}>
                    {savingsDistData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                분포 데이터가 없습니다
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 요약 텍스트 */}
      {impact.activeBudgets > 0 && (
        <Card className="p-4 sm:p-5 bg-muted/30 border-dashed">
          <div className="flex items-start gap-3">
            <Eye className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
              <p>
                <strong>{impact.activeBudgets}개</strong> 예산을 분석한 결과,
                사용자의 <strong>{impact.belowAvgPercent}%</strong> 항목이 전국 평균보다 저렴하게 책정되었습니다.
              </p>
              <p>
                숨겨진 비용 경고를 통해 사용자당 평균 <strong>{impact.avgHiddenCostsIdentified}건</strong>의
                추가 비용을 사전에 인지할 수 있었습니다.
              </p>
            </div>
          </div>
        </Card>
      )}
    </section>
  );
}

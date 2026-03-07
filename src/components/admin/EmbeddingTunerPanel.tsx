// [AGENT-TEAM-9-20260307]
// 임베딩 커버리지 분석 패널 (Embedding Tuner Panel)
// 카테고리별 커버리지 BarChart + 추천 액션 목록

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import { Brain, RefreshCw, TrendingUp } from 'lucide-react';
import type { EmbeddingTunerResult } from '@/hooks/useEmbeddingTuner';

interface EmbeddingTunerPanelProps {
  result: EmbeddingTunerResult | null;
  loading: boolean;
  error: string | null;
  onAnalyze: () => void;
}

const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '13px',
};

// ── 액션 Badge 색상 ──
function actionBadge(action: 're-embed' | 'add' | 'prune') {
  const config = {
    're-embed': {
      label: '재임베딩',
      className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    },
    add: {
      label: '추가',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    },
    prune: {
      label: '정리',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    },
  };
  const c = config[action];
  return (
    <Badge variant="outline" className={`text-xs ${c.className}`}>
      {c.label}
    </Badge>
  );
}

export function EmbeddingTunerPanel({ result, loading, error, onAnalyze }: EmbeddingTunerPanelProps) {
  // 차트 데이터: 카테고리별 count vs ideal_min
  const chartData = useMemo(() => {
    if (!result?.coverage) return [];
    return result.coverage.map((c) => ({
      name: c.category,
      현재: c.count,
      최소기준: c.ideal_min,
    }));
  }, [result]);

  // ── 로딩 스켈레톤 ──
  if (loading && !result) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-7 bg-muted rounded w-56 animate-pulse" />
          <div className="h-9 bg-muted rounded w-24 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {/* ═══ 섹션 헤더 ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
          <Brain className="h-4 w-4 text-indigo-500" />
          임베딩 커버리지 분석
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onAnalyze}
          disabled={loading}
          className="text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? '분석 중...' : '분석 실행'}
        </Button>
      </div>

      {/* ═══ 에러 표시 ═══ */}
      {error && (
        <Card className="p-4 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </Card>
      )}

      {/* ═══ 결과 없을 때 안내 ═══ */}
      {!result && !error && (
        <Card className="p-8 text-center">
          <Brain className="h-10 w-10 mx-auto text-indigo-300 dark:text-indigo-700 mb-3" />
          <p className="text-sm text-muted-foreground">
            "분석 실행" 버튼을 눌러 임베딩 커버리지를 분석하세요.
          </p>
        </Card>
      )}

      {/* ═══ 분석 결과 ═══ */}
      {result && (
        <>
          {/* ── KPI 카드 ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 전체 커버리지 */}
            <Card className="p-4 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-200/50 dark:border-indigo-800/50">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">전체 커버리지</p>
                <p className={`text-3xl font-bold tabular-nums ${
                  result.overall_coverage_pct >= 80
                    ? 'text-green-600 dark:text-green-400'
                    : result.overall_coverage_pct >= 50
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                }`}>
                  {result.overall_coverage_pct}%
                </p>
                <p className="text-[10px] text-muted-foreground">
                  기준 충족 카테고리 비율
                </p>
              </div>
            </Card>

            {/* 최근 7일 추가 */}
            <Card className="p-4 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-200/50 dark:border-indigo-800/50">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">최근 7일 추가</p>
                  <p className="text-3xl font-bold tabular-nums">{result.recent_7d_count}</p>
                  <p className="text-[10px] text-muted-foreground">신규 임베딩 수</p>
                </div>
                <TrendingUp className="h-4 w-4 text-indigo-500 mt-1" />
              </div>
            </Card>

            {/* 총 카테고리 */}
            <Card className="p-4 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-200/50 dark:border-indigo-800/50">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">총 카테고리</p>
                <p className="text-3xl font-bold tabular-nums">{result.coverage.length}</p>
                <p className="text-[10px] text-muted-foreground">
                  추천 {result.recommendations.length}건
                </p>
              </div>
            </Card>
          </div>

          {/* ── 커버리지 BarChart ── */}
          {chartData.length > 0 && (
            <Card className="p-4 sm:p-5">
              <h4 className="text-sm font-semibold mb-3">카테고리별 임베딩 현황</h4>
              <div className="h-56 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <RechartsTooltip
                      contentStyle={chartTooltipStyle}
                      formatter={(value: number, name: string) => [
                        `${value}개`,
                        name === '현재' ? '현재 수량' : '최소 기준',
                      ]}
                    />
                    <Bar dataKey="현재" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="최소기준" fill="#a5b4fc" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* ── 추천 목록 ── */}
          {result.recommendations.length > 0 && (
            <Card className="p-4 sm:p-5">
              <h4 className="text-sm font-semibold mb-3">추천 액션</h4>
              <div className="space-y-2">
                {result.recommendations.map((rec, idx) => (
                  <div
                    key={`${rec.category}-${rec.action}-${idx}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                  >
                    {actionBadge(rec.action)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{rec.category}</p>
                      <p className="text-xs text-muted-foreground">{rec.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 추천 없는 경우 */}
          {result.recommendations.length === 0 && (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                모든 카테고리가 기준을 충족합니다. 추천 액션이 없습니다.
              </p>
            </Card>
          )}
        </>
      )}
    </section>
  );
}

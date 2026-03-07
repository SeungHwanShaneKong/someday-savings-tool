// [AGENT-TEAM-9-20260307] Edge Function 성능 모니터링 패널
import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import { Activity, RefreshCw, Gauge, AlertTriangle } from 'lucide-react';
import type { PerformanceResult } from '@/hooks/usePerformanceSentinel';

interface PerformancePanelProps {
  metrics: PerformanceResult | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '13px',
};

export function PerformancePanel({ metrics, loading, error, onRefresh }: PerformancePanelProps) {
  const chartData = useMemo(() => {
    if (!metrics?.functions) return [];
    return metrics.functions.map((f) => ({
      name: f.name.replace(/-/g, '\n'),
      avg_ms: f.avg_duration_ms,
      p95_ms: f.p95_duration_ms,
      calls: f.total_calls,
    }));
  }, [metrics]);

  if (loading) {
    return (
      <section className="space-y-4">
        <div className="h-7 bg-muted rounded w-56 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </section>
    );
  }

  const overall = metrics?.overall;
  const functions = metrics?.functions || [];

  return (
    <section className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold leading-relaxed flex items-center gap-2">
          <Activity className="h-5 w-5 text-orange-500" />
          성능 모니터링
        </h2>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {error && (
        <Card className="p-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        </Card>
      )}

      {metrics?.warning && (
        <Card className="p-3 border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
          <p className="text-xs text-amber-600 dark:text-amber-400">{metrics.warning}</p>
        </Card>
      )}

      {/* KPI 카드 */}
      {overall && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200/50 dark:border-orange-800/50">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">총 호출 수</p>
              <p className="text-2xl sm:text-3xl font-bold tabular-nums">
                {overall.total_calls.toLocaleString()}
              </p>
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50 dark:border-blue-800/50">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">평균 응답시간</p>
              <p className="text-2xl sm:text-3xl font-bold tabular-nums">
                {overall.avg_duration_ms.toLocaleString()}ms
              </p>
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-rose-500/10 to-rose-600/5 border-rose-200/50 dark:border-rose-800/50">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">에러율</p>
              <p className="text-2xl sm:text-3xl font-bold tabular-nums">
                {overall.error_rate}%
              </p>
              <Badge
                variant="outline"
                className={
                  overall.error_rate <= 2
                    ? 'text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400'
                    : overall.error_rate <= 5
                    ? 'text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400'
                    : 'text-red-700 border-red-300 bg-red-50 dark:bg-red-950/30 dark:text-red-400'
                }
              >
                {overall.error_rate <= 2 ? '정상' : overall.error_rate <= 5 ? '주의' : '위험'}
              </Badge>
            </div>
          </Card>
        </div>
      )}

      {/* 응답시간 차트 */}
      {chartData.length > 0 && (
        <Card className="p-4 sm:p-5">
          <h3 className="text-sm sm:text-base font-semibold mb-3">
            함수별 응답시간 (ms)
          </h3>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString()}ms`,
                    name === 'avg_ms' ? '평균' : 'P95',
                  ]}
                />
                <Bar dataKey="avg_ms" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} name="평균" />
                <Bar dataKey="p95_ms" fill="#f97316" radius={[4, 4, 0, 0]} barSize={20} name="P95" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* 함수별 상세 테이블 */}
      {functions.length > 0 && (
        <Card className="p-4 sm:p-5">
          <h3 className="text-sm sm:text-base font-semibold mb-3">함수별 상세</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>함수명</TableHead>
                  <TableHead className="text-right">총 호출</TableHead>
                  <TableHead className="text-right">평균(ms)</TableHead>
                  <TableHead className="text-right">P95(ms)</TableHead>
                  <TableHead className="text-right">에러율</TableHead>
                  <TableHead className="text-right">24h</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {functions.map((f) => (
                  <TableRow key={f.name}>
                    <TableCell className="font-mono text-xs">{f.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{f.total_calls}</TableCell>
                    <TableCell className="text-right tabular-nums">{f.avg_duration_ms}</TableCell>
                    <TableCell className="text-right tabular-nums">{f.p95_duration_ms}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={
                          f.error_rate <= 2
                            ? 'text-emerald-600 border-emerald-300'
                            : f.error_rate <= 5
                            ? 'text-amber-600 border-amber-300'
                            : 'text-red-600 border-red-300'
                        }
                      >
                        {f.error_rate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{f.calls_24h}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* 데이터 없음 */}
      {!overall && !error && (
        <Card className="p-8 text-center">
          <Gauge className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            성능 데이터가 아직 수집되지 않았습니다.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Edge Function 호출이 시작되면 자동으로 기록됩니다.
          </p>
        </Card>
      )}
    </section>
  );
}

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useAdminKPI } from '@/hooks/useAdminKPI';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Minus, Eye, Info,
  BarChart3, Users, Clock
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import { subDays, startOfYear, format } from 'date-fns';
import {
  KPI_DEFINITIONS, getKPIStatus, getStatusColor,
  type KPIValue
} from '@/lib/kpi-definitions';
import type { SummaryKPIs } from '@/hooks/useAdminKPI';
import { ImpactMetrics } from '@/components/admin/ImpactMetrics';

// ========= 기간 프리셋 =========
const PERIOD_OPTIONS = [
  { label: '최근 7일', value: '7' },
  { label: '최근 30일', value: '30' },
  { label: '최근 90일', value: '90' },
  { label: '올해 전체', value: 'ytd' },
];

// ========= 차트 공통 스타일 =========
const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '13px',
};

// ========= 헬퍼: 초 → 분:초 =========
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}분 ${s < 10 ? '0' : ''}${s}초`;
}

function calcChangePercent(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0;
  return ((current - prev) / prev) * 100;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { kpiValues, trendData, topPages, summaryKPIs, impactSummary, loading: dataLoading, fetchData } = useAdminKPI();

  const [period, setPeriod] = useState('30');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = period === 'ytd' ? startOfYear(end) : subDays(end, parseInt(period));
    return { startDate: start, endDate: end };
  }, [period]);

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (!adminLoading && !isAdmin) { navigate('/'); return; }
  }, [user, authLoading, isAdmin, adminLoading, navigate]);

  // Fetch + record timestamp
  const doFetch = useCallback(() => {
    fetchData(startDate, endDate).then(() => setLastUpdated(new Date()));
  }, [fetchData, startDate, endDate]);

  useEffect(() => {
    if (isAdmin) doFetch();
  }, [isAdmin, doFetch]);

  // 30-second auto-refresh, paused when tab is hidden
  useEffect(() => {
    if (!isAdmin) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') doFetch();
    }, 30_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') doFetch();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [isAdmin, doFetch]);

  const handleRefresh = () => doFetch();

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-base">로딩 중...</div>
      </div>
    );
  }
  if (!isAdmin) return null;

  const pvChange = calcChangePercent(summaryKPIs.totalPageViews, summaryKPIs.prevTotalPageViews);
  const loyalChange = calcChangePercent(summaryKPIs.loyalUsers, summaryKPIs.prevLoyalUsers);
  const sessionChange = calcChangePercent(summaryKPIs.avgSessionTime, summaryKPIs.prevAvgSessionTime);
  const loyalPercent = summaryKPIs.totalUniqueUsers > 0
    ? Math.round((summaryKPIs.loyalUsers / summaryKPIs.totalUniqueUsers) * 1000) / 10
    : 0;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background">
        {/* ===== 헤더 ===== */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="rounded-full shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate leading-relaxed">
                관리자 KPI 대시보드
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">운영 핵심 지표 모니터링</p>
            </div>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-xs text-muted-foreground tabular-nums hidden sm:inline">
                  갱신 {format(lastUpdated, 'HH:mm:ss')}
                </span>
              )}
              <Button size="sm" variant="outline" onClick={handleRefresh} disabled={dataLoading}>
                <RefreshCw className={`h-4 w-4 ${dataLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-6 sm:space-y-8">
          {/* ===== 필터 패널 ===== */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>조회: {format(startDate, 'yyyy.MM.dd')} ~ {format(endDate, 'yyyy.MM.dd')}</span>
            </div>
          </div>

          {/* ===== 상단 3종 KPI 위젯 ===== */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 페이지뷰 */}
            <Card className="relative overflow-hidden p-5 sm:p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50 dark:border-blue-800/50 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-default">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm sm:text-base font-medium text-muted-foreground leading-relaxed">페이지뷰 (PV)</p>
                  <p className="text-3xl sm:text-4xl font-bold tabular-nums leading-tight">
                    {summaryKPIs.totalPageViews.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {pvChange > 0 ? <TrendingUp className="h-4 w-4 text-emerald-500" /> :
                     pvChange < 0 ? <TrendingDown className="h-4 w-4 text-red-500" /> :
                     <Minus className="h-4 w-4 text-muted-foreground" />}
                    <span className={`text-sm font-medium ${pvChange > 0 ? 'text-emerald-600' : pvChange < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {pvChange > 0 ? '+' : ''}{Math.round(pvChange * 10) / 10}% vs 전기
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    오늘 {summaryKPIs.dailyPageViews.toLocaleString()} · 주간 {summaryKPIs.weeklyPageViews.toLocaleString()} · 월간 {summaryKPIs.monthlyPageViews.toLocaleString()}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-500/10">
                  <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7 text-blue-500" />
                </div>
              </div>
            </Card>

            {/* 충성 고객 */}
            <Card className="relative overflow-hidden p-5 sm:p-6 bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-200/50 dark:border-violet-800/50 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-default">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm sm:text-base font-medium text-muted-foreground leading-relaxed">충성 고객 수</p>
                  <p className="text-3xl sm:text-4xl font-bold tabular-nums leading-tight">
                    {summaryKPIs.loyalUsers.toLocaleString()}
                    <span className="text-base sm:text-lg font-normal text-muted-foreground ml-1.5">명</span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    {loyalChange > 0 ? <TrendingUp className="h-4 w-4 text-emerald-500" /> :
                     loyalChange < 0 ? <TrendingDown className="h-4 w-4 text-red-500" /> :
                     <Minus className="h-4 w-4 text-muted-foreground" />}
                    <span className={`text-sm font-medium ${loyalChange > 0 ? 'text-emerald-600' : loyalChange < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {loyalChange > 0 ? '+' : ''}{Math.round(loyalChange * 10) / 10}% vs 전기
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    전체 방문자 대비 {loyalPercent}% (재방문 2회+)
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-violet-500/10">
                  <Users className="h-6 w-6 sm:h-7 sm:w-7 text-violet-500" />
                </div>
              </div>
            </Card>

            {/* 평균 체류 시간 */}
            <Card className="relative overflow-hidden p-5 sm:p-6 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-200/50 dark:border-amber-800/50 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-default">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm sm:text-base font-medium text-muted-foreground leading-relaxed">평균 체류 시간</p>
                  <p className="text-3xl sm:text-4xl font-bold tabular-nums leading-tight">
                    {formatDuration(summaryKPIs.avgSessionTime)}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {sessionChange > 0 ? <TrendingUp className="h-4 w-4 text-emerald-500" /> :
                     sessionChange < 0 ? <TrendingDown className="h-4 w-4 text-red-500" /> :
                     <Minus className="h-4 w-4 text-muted-foreground" />}
                    <span className={`text-sm font-medium ${sessionChange > 0 ? 'text-emerald-600' : sessionChange < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {sessionChange > 0 ? '+' : ''}{Math.round(sessionChange * 10) / 10}% vs 전기
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    페이지당 평균 사용 시간
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10">
                  <Clock className="h-6 w-6 sm:h-7 sm:w-7 text-amber-500" />
                </div>
              </div>
            </Card>
          </section>

          {/* ===== Analytics Insights — 시계열 차트 3종 ===== */}
          <section className="space-y-4">
            <h2 className="text-base sm:text-lg font-bold leading-relaxed">📈 Analytics Insights</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 페이지뷰 추이 */}
              <Card className="p-4 sm:p-5 hover:shadow-md transition-shadow">
                <h3 className="text-sm sm:text-base font-semibold mb-3 leading-relaxed">페이지뷰 추이</h3>
                <div className="h-56 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="gradPV" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <RechartsTooltip
                        contentStyle={chartTooltipStyle}
                        formatter={(value: number) => [`${value}건`, 'PV']}
                        labelFormatter={(label) => `날짜: ${label}`}
                      />
                      <Legend wrapperStyle={{ fontSize: '13px' }} />
                      <Area type="monotone" dataKey="pv" name="페이지뷰" stroke="#3b82f6" strokeWidth={2} fill="url(#gradPV)" dot={false} activeDot={{ r: 6 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* 충성 고객 추이 */}
              <Card className="p-4 sm:p-5 hover:shadow-md transition-shadow">
                <h3 className="text-sm sm:text-base font-semibold mb-3 leading-relaxed">충성 고객 추이</h3>
                <div className="h-56 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="gradLoyal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <RechartsTooltip
                        contentStyle={chartTooltipStyle}
                        formatter={(value: number) => [`${value}명`, '충성 고객']}
                        labelFormatter={(label) => `날짜: ${label}`}
                      />
                      <Legend wrapperStyle={{ fontSize: '13px' }} />
                      <Area type="monotone" dataKey="loyalCount" name="충성 고객" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradLoyal)" dot={false} activeDot={{ r: 6 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* 평균 체류 시간 추이 */}
              <Card className="p-4 sm:p-5 hover:shadow-md transition-shadow">
                <h3 className="text-sm sm:text-base font-semibold mb-3 leading-relaxed">평균 체류 시간 추이</h3>
                <div className="h-56 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="gradDuration" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(v: number) => {
                          const m = Math.floor(v / 60);
                          const s = Math.round(v % 60);
                          return `${m}:${s < 10 ? '0' : ''}${s}`;
                        }}
                      />
                      <RechartsTooltip
                        contentStyle={chartTooltipStyle}
                        formatter={(value: number) => {
                          const m = Math.floor(value / 60);
                          const s = Math.round(value % 60);
                          return [`${m}분 ${s < 10 ? '0' : ''}${s}초`, '체류 시간'];
                        }}
                        labelFormatter={(label) => `날짜: ${label}`}
                      />
                      <Legend wrapperStyle={{ fontSize: '13px' }} />
                      <Area type="monotone" dataKey="avgDuration" name="체류 시간" stroke="#f59e0b" strokeWidth={2} fill="url(#gradDuration)" dot={false} activeDot={{ r: 6 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </section>

          {/* ===== 경제적 파급 효과 (Phase 4-A, BRD §7) ===== */}
          <ImpactMetrics impact={impactSummary} loading={dataLoading} />

          <section>
            <h2 className="text-base sm:text-lg font-bold mb-4 leading-relaxed">📊 18개 핵심 운영 지표</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {KPI_DEFINITIONS.map(def => {
                const kv = kpiValues.find(k => k.id === def.id);
                const value = kv?.value ?? 0;
                const change = kv?.change ?? 0;
                const status = getKPIStatus(def, value);
                const statusColor = getStatusColor(status);

                return (
                  <Tooltip key={def.id}>
                    <TooltipTrigger asChild>
                      <Card className="p-4 space-y-2 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-default">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-mono text-muted-foreground">{def.id}</span>
                          <Badge className={`text-xs px-2 py-0.5 ${statusColor.bg} ${statusColor.text} border ${statusColor.border}`}>
                            {status}
                          </Badge>
                        </div>
                        <p className="text-sm sm:text-base font-medium truncate leading-relaxed">{def.name}</p>
                        <div className="flex items-end gap-1.5">
                          <span className="text-2xl sm:text-3xl font-bold tabular-nums">
                            {typeof value === 'number' ? (def.unit === '%' ? `${value}%` : value.toLocaleString()) : value}
                          </span>
                          {def.unit !== '%' && <span className="text-xs sm:text-sm text-muted-foreground mb-0.5">{def.unit}</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {change > 0 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> :
                           change < 0 ? <TrendingDown className="h-3.5 w-3.5 text-red-500" /> :
                           <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                          <span className={`text-xs sm:text-sm font-medium ${change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {change > 0 ? '+' : ''}{Math.round(change * 10) / 10}%
                          </span>
                          <span className="text-xs sm:text-sm text-muted-foreground">vs 전기</span>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{def.description}</p>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px] text-sm leading-relaxed">
                      <p className="font-semibold mb-1">{def.name}</p>
                      <p className="text-muted-foreground">계산식: {def.formula}</p>
                      {def.thresholds && (
                        <p className="text-muted-foreground mt-1">
                          임계: 주의 &lt; {def.thresholds.warn}, 위험 &lt; {def.thresholds.danger}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </section>

          {/* ===== 트렌드 차트 (실제 일별 데이터만) ===== */}
          <section className="space-y-5">
            <h2 className="text-base sm:text-lg font-bold leading-relaxed">📈 Historical Trend</h2>

            <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
              {/* 차트 1: 활성 사용자 추이 */}
              <Card className="p-4 sm:p-5 hover:shadow-md transition-shadow">
                <h3 className="text-base sm:text-lg font-semibold mb-4 leading-relaxed">활성 사용자 추이 (DAU / WAU / MAU)</h3>
                <div className="h-56 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <RechartsTooltip contentStyle={chartTooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '13px' }} />
                      <Line type="monotone" dataKey="dau" name="DAU" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="wau" name="WAU" stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="mau" name="MAU" stroke="#06b6d4" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* 차트 2: 온보딩 전환 추이 */}
              <Card className="p-4 sm:p-5 hover:shadow-md transition-shadow">
                <h3 className="text-base sm:text-lg font-semibold mb-4 leading-relaxed">온보딩 전환 추이 (가입 / 생성 / 입력)</h3>
                <div className="h-56 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <RechartsTooltip contentStyle={chartTooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '13px' }} />
                      <Bar dataKey="signups" name="가입" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="budgetCreated" name="예산 생성" fill="#10b981" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="amountEntered" name="금액 입력" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </section>

          {/* ===== Top 페이지 ===== */}
          <Card className="p-4 sm:p-5">
            <h2 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2 leading-relaxed">
              <Eye className="h-5 w-5" /> Top 페이지 (조회 기간 내)
            </h2>
            <div className="space-y-1">
              {topPages.length ? topPages.map((page, i) => (
                <div key={page.path} className="flex items-center justify-between py-2.5 px-2 rounded-md border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="text-sm sm:text-base font-mono">{page.path}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm sm:text-base font-semibold tabular-nums">{page.views.toLocaleString()}회</span>
                    <span className="text-sm text-muted-foreground w-14 text-right">{page.percentage}%</span>
                  </div>
                </div>
              )) : (
                <p className="text-muted-foreground text-center py-6 text-sm sm:text-base">데이터 없음</p>
              )}
            </div>
          </Card>

          {/* ===== 15개 핵심 지표 정의 테이블 ===== */}
          <Card className="p-4 sm:p-5">
            <h2 className="text-base sm:text-lg font-semibold mb-4 leading-relaxed">📋 18개 핵심 지표 정의</h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-sm w-14">ID</TableHead>
                    <TableHead className="text-sm">지표명</TableHead>
                    <TableHead className="text-sm">계산식</TableHead>
                    <TableHead className="text-sm w-24 text-right">현재값</TableHead>
                    <TableHead className="text-sm w-32">임계 기준</TableHead>
                    <TableHead className="text-sm w-16 text-center">상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {KPI_DEFINITIONS.map(def => {
                    const kv = kpiValues.find(k => k.id === def.id);
                    const value = kv?.value ?? 0;
                    const status = getKPIStatus(def, value);
                    const sc = getStatusColor(status);
                    return (
                      <TableRow key={def.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="text-sm font-mono">{def.id}</TableCell>
                        <TableCell className="text-sm font-medium">{def.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{def.formula}</TableCell>
                        <TableCell className="text-sm text-right font-semibold tabular-nums">
                          {def.unit === '%' ? `${value}%` : `${value.toLocaleString()}${def.unit}`}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm text-muted-foreground">
                          {def.thresholds
                            ? `주의 < ${def.thresholds.warn}, 위험 < ${def.thresholds.danger}`
                            : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`text-xs px-2 py-0.5 ${sc.bg} ${sc.text} border ${sc.border}`}>
                            {status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          <div className="text-center text-sm text-muted-foreground py-6 leading-relaxed">
            관리자 KPI 대시보드 v2.0 — 데이터는 RLS 정책으로 보호됩니다.
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

import { useEffect, useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  ComposedChart, // [CL-ADMIN-SIGNUP-TREND-20260622] 신규(막대)+누적(선) 이중축
  XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import { subDays, startOfYear, format } from 'date-fns';
import {
  KPI_DEFINITIONS, getKPIStatus, getStatusColor,
  type KPIValue
} from '@/lib/kpi-definitions';
import { kpiFact } from '@/lib/admin/kpi-compute'; // [CL-FACT-KPISTATE-20260630] 정직상태 표시(가짜 수치 차단)
import type { SummaryKPIs } from '@/hooks/useAdminKPI';
// [CL-ACQ-ADMIN-20260622-233012] 유입경로 소스 한국어 라벨(개선1)
import { sourceLabel } from '@/lib/analytics/acquisition';
import { ImpactMetrics } from '@/components/admin/ImpactMetrics';
// [ADMIN-RAG-MONITOR-2026-03-07] RAG 모니터링 통합
import { useAdminRAGStats } from '@/hooks/useAdminRAGStats';
import { RAGMonitor } from '@/components/admin/RAGMonitor';
// [AGENT-TEAM-9-20260307] 4개 신규 에이전트 Admin 통합
import { usePerformanceSentinel } from '@/hooks/usePerformanceSentinel';
import { useDataQualityGuardian } from '@/hooks/useDataQualityGuardian';
import { useEmbeddingTuner } from '@/hooks/useEmbeddingTuner';
import { useSEOAmplifier } from '@/hooks/useSEOAmplifier';
// [EF-RESILIENCE-20260308-041500] Edge Function 헬스 체크
import { checkEdgeFunctionHealth } from '@/lib/edge-function-fetch';
import { PerformancePanel } from '@/components/admin/PerformancePanel';
import { DataQualityPanel } from '@/components/admin/DataQualityPanel';
import { EmbeddingTunerPanel } from '@/components/admin/EmbeddingTunerPanel';
import { SEOAmplifierPanel } from '@/components/admin/SEOAmplifierPanel';
// [CL-ADMIN-FEATURE-REQ-20260403] 기능 요청 패널
import { FeatureRequestPanel } from '@/components/admin/FeatureRequestPanel';
import { useFeatureRequests } from '@/hooks/useFeatureRequests';

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
  const qc = useQueryClient();

  const [period, setPeriod] = useState('30');
  // [EF-RESILIENCE-20260308-041500] Edge Function 서비스 상태
  const [efHealthy, setEfHealthy] = useState<boolean | null>(null);

  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = period === 'ytd' ? startOfYear(end) : subDays(end, parseInt(period));
    return { startDate: start, endDate: end };
  }, [period]);

  // [CL-ADMIN-RQ-MIGRATION-20260627-234656] React Query 준실시간 — enabled:isAdmin 게이트.
  //   폴링/포커스·재연결 갱신·탭숨김 정지는 RQ(ADMIN_HEAVY/PANEL)가 담당 → 과거 doFetch/setInterval 수동 플러밍 제거.
  const {
    kpiValues, trendData, topPages, summaryKPIs, impactSummary,
    acquisitionData, visitSourceData, visitHistogram, referralJoins, referralJoinsTotal,
    anonTrafficTrend, anonSourceData, anonTopPages,
    // [CL-AUDIT2-R3-ERRSURFACE-20260628] error/isFetching/partialError 소비(F5/F9) — 무음 실패·스피너 미작동 해소.
    loading: dataLoading, isFetching: kpiFetching, error: kpiError, partialError, dataUpdatedAt,
  } = useAdminKPI(startDate, endDate, { enabled: isAdmin });
  // [ADMIN-RAG-MONITOR-2026-03-07] RAG 통계 hook
  const { ragStats, loading: ragLoading } = useAdminRAGStats(isAdmin);

  // [AGENT-TEAM-9-20260307] 4개 신규 에이전트 hooks
  const { metrics: perfMetrics, loading: perfLoading, error: perfError, fetchMetrics } = usePerformanceSentinel(isAdmin);
  const { result: dqResult, loading: dqLoading, error: dqError, runScan } = useDataQualityGuardian();
  const { result: etResult, loading: etLoading, error: etError, analyze: analyzeEmbeddings } = useEmbeddingTuner();
  const { content: seoContent, loading: seoLoading, error: seoError, generate: generateSEO } = useSEOAmplifier();
  // [CL-ADMIN-FEATURE-REQ-20260403]
  const { requests: featureRequests, loading: frLoading, error: frError, fetchRequests } = useFeatureRequests(isAdmin);

  // 마지막 성공 갱신 시각(React Query dataUpdatedAt 파생)
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  // [CL-ACQ-ADMIN-20260622-233012] 유입경로 표시 가공 — 한국어 라벨 + 비율(개선1)
  const acquisitionView = useMemo(() => {
    const total = acquisitionData.reduce((s, a) => s + a.users, 0);
    const rows = acquisitionData.map((a) => ({
      source: a.source,
      label: sourceLabel(a.source),
      users: a.users,
      percentage: total > 0 ? Math.round((a.users / total) * 1000) / 10 : 0,
    }));
    return { total, rows };
  }, [acquisitionData]);

  // [CL-ACQ-VISIT-20260623-230113] 방문 기준 유입 표시 가공(개선1) — users 필드에 visits 가 매핑돼 있음
  const visitView = useMemo(() => {
    const total = visitSourceData.reduce((s, a) => s + a.users, 0);
    const rows = visitSourceData.map((a) => ({
      source: a.source,
      label: sourceLabel(a.source),
      visits: a.users,
      percentage: total > 0 ? Math.round((a.users / total) * 1000) / 10 : 0,
    }));
    return { total, rows };
  }, [visitSourceData]);

  // [CL-ANONVISIT-ADMIN-20260627-234656] 전체 방문(익명 포함) 소스 표시 가공 — users 필드에 visits 매핑됨
  const anonSourceView = useMemo(() => {
    const total = anonSourceData.reduce((s, a) => s + a.users, 0);
    const rows = anonSourceData.map((a) => ({
      source: a.source,
      label: sourceLabel(a.source),
      visits: a.users,
      percentage: total > 0 ? Math.round((a.users / total) * 1000) / 10 : 0,
    }));
    return { total, rows };
  }, [anonSourceData]);

  // [CL-ANONVISIT-ADMIN-20260627-234656] 익명 트래픽 총계(차트 빈상태 판별용)
  const anonTotals = useMemo(() => {
    const views = anonTrafficTrend.reduce((s, d) => s + d.views, 0);
    const sessions = anonTrafficTrend.reduce((s, d) => s + d.sessions, 0);
    return { views, sessions };
  }, [anonTrafficTrend]);

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (!adminLoading && !isAdmin) { navigate('/'); return; }
  }, [user, authLoading, isAdmin, adminLoading, navigate]);

  // [EF-RESILIENCE-20260308-041500] 초기 1회 Edge 헬스 체크(데이터 폴링은 React Query 가 자동 수행).
  useEffect(() => {
    if (isAdmin) checkEdgeFunctionHealth().then(setEfHealthy);
  }, [isAdmin]);

  // [CL-ADMIN-RQ-MIGRATION-20260627-234656] 수동 새로고침 = 모든 admin 쿼리 무효화(일괄 refetch).
  const handleRefresh = () => { qc.invalidateQueries({ queryKey: ['admin'] }); };

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
              {/* [CL-AUDIT2-R3-ERRSURFACE-20260628] 스핀/disable 을 isFetching 에 바인딩 — keepPreviousData 로 첫 로드 후
                  isLoading 은 영구 false 라 폴링/수동 새로고침 시 스피너가 안 돌던 회귀 수정(F5). */}
              <Button size="sm" variant="outline" onClick={handleRefresh} disabled={dataLoading || kpiFetching}>
                <RefreshCw className={`h-4 w-4 ${(dataLoading || kpiFetching) ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-6 sm:space-y-8">
          {/* [CL-AUDIT2-R3-ERRSURFACE-20260628] 코어 KPI 로드 실패/부분 degrade 를 명시 노출(F5/F7/F9) —
              무음으로 '데이터 0/미배포'처럼 보이던 문제 차단. kpiError=쿼리 실패, partialError=일부 source degrade. */}
          {(kpiError || partialError) && (
            <Card className="p-3 border-amber-300 bg-amber-50 flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700">
                {kpiError
                  ? '핵심 지표를 불러오지 못했습니다(직전 데이터 표시 중). 잠시 후 자동 재시도됩니다.'
                  : `일부 데이터 소스(${partialError})를 불러오지 못해 해당 지표가 축소되었습니다.`}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto border-amber-400 text-amber-700 hover:bg-amber-100"
                onClick={handleRefresh}
                disabled={kpiFetching}
              >
                새로고침
              </Button>
            </Card>
          )}
          {/* [EF-RESILIENCE-20260308-041500] Edge Function 서비스 경고 배너 */}
          {efHealthy === false && (
            <Card className="p-3 border-amber-300 bg-amber-50 flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700">
                AI 서비스(Edge Functions)에 연결할 수 없습니다. AI 기능이 제한될 수 있습니다.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto border-amber-400 text-amber-700 hover:bg-amber-100"
                onClick={() => checkEdgeFunctionHealth().then(setEfHealthy)}
              >
                재확인
              </Button>
            </Card>
          )}

          {/* [CL-ADMIN-FEEDBACK-BOARD-20260408-100500] 사용자 의견 패널 — 한눈에 보기 위해 최상단으로 이동 */}
          <FeatureRequestPanel
            requests={featureRequests}
            loading={frLoading}
            error={frError}
            onRefresh={fetchRequests}
          />

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
              {/* [CL-ADMIN-CHART-ORDER-20260621] 활성 사용자 추이 — 페이지뷰 추이 바로 위로 이동 */}
              <Card className="p-4 sm:p-5 hover:shadow-md transition-shadow">
                <h3 className="text-sm sm:text-base font-semibold mb-3 leading-relaxed">활성 사용자 추이 (DAU / WAU / MAU)</h3>
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

              {/* [CL-ADMIN-SIGNUP-TREND-20260622] 신규/누적 가입자 추이 — 활성 사용자 추이 바로 아래(이중축) */}
              <Card className="p-4 sm:p-5 hover:shadow-md transition-shadow">
                <h3 className="text-sm sm:text-base font-semibold mb-3 leading-relaxed">신규 / 누적 가입자 추이</h3>
                <div className="h-56 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <RechartsTooltip
                        contentStyle={chartTooltipStyle}
                        formatter={(value: number, name: string) => [`${value}명`, name]}
                        labelFormatter={(label) => `날짜: ${label}`}
                      />
                      <Legend wrapperStyle={{ fontSize: '13px' }} />
                      <Bar yAxisId="left" dataKey="signups" name="신규 가입자" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="cumulativeSignups" name="누적 가입자" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* [CL-ACQ-ADMIN-20260622-233012] 유입 경로(가입자 기준) — 신규/누적 가입자 추이 바로 아래(개선1) */}
              <Card className="p-4 sm:p-5 hover:shadow-md transition-shadow">
                <h3 className="text-sm sm:text-base font-semibold mb-3 leading-relaxed">유입 경로 (가입자 기준)</h3>
                {acquisitionView.rows.length > 0 ? (
                  <>
                    <div className="h-56 sm:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={acquisitionView.rows} margin={{ left: 8, right: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis type="category" dataKey="label" width={84} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                          <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [`${value}명`, '가입자']} />
                          <Bar dataKey="users" name="가입자" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>유입원</TableHead>
                          <TableHead className="text-right">가입자</TableHead>
                          <TableHead className="text-right">비율</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {acquisitionView.rows.map((r) => (
                          <TableRow key={r.source}>
                            <TableCell className="font-medium">{r.label}</TableCell>
                            <TableCell className="text-right">{r.users}명</TableCell>
                            <TableCell className="text-right text-muted-foreground">{r.percentage}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">아직 유입 경로 데이터가 없어요.</p>
                )}
                <p className="text-[11px] text-muted-foreground/70 mt-2">
                  데이터 수집 시작: 2026-06-22 · 이전 가입자는 '미상'으로 집계됩니다.
                </p>
              </Card>

              {/* [CL-ACQ-VISIT-20260623-230113] 유입 경로(방문 기준) — 매 방문 카운트(직전 페이지/소스). 가입자 카드 바로 아래(개선1) */}
              <Card className="p-4 sm:p-5 hover:shadow-md transition-shadow">
                <h3 className="text-sm sm:text-base font-semibold mb-3 leading-relaxed">유입 경로 (방문 기준)</h3>
                {visitView.rows.length > 0 ? (
                  <>
                    <div className="h-56 sm:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={visitView.rows} margin={{ left: 8, right: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis type="category" dataKey="label" width={84} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                          <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [`${value}회`, '방문']} />
                          <Bar dataKey="visits" name="방문" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>유입원</TableHead>
                          <TableHead className="text-right">방문수</TableHead>
                          <TableHead className="text-right">비율</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visitView.rows.map((r) => (
                          <TableRow key={r.source}>
                            <TableCell className="font-medium">{r.label}</TableCell>
                            <TableCell className="text-right">{r.visits}회</TableCell>
                            <TableCell className="text-right text-muted-foreground">{r.percentage}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">아직 방문 유입 데이터가 없어요.</p>
                )}
                <p className="text-[11px] text-muted-foreground/70 mt-2">
                  방문마다 카운트 · 직전 페이지(referrer)/소스 기준 · 선택 기간 내 · 수집 시작 2026-06-22.
                </p>
              </Card>

              {/* [CL-IMPROVE2-VISITHIST-20260625] 방문 빈도 분포(가입 유저) — 정확히 N회(1..10+) 막대 히스토그램 */}
              <Card className="p-4 sm:p-5 hover:shadow-md transition-shadow">
                <h3 className="text-sm sm:text-base font-semibold mb-3 leading-relaxed">방문 빈도 분포 (가입 유저)</h3>
                {visitHistogram.some((d) => d.users > 0) ? (
                  <div className="h-56 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={visitHistogram} margin={{ left: 8, right: 16, top: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" interval={0} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [`${value}명`, '유저']} />
                        <Bar dataKey="users" name="유저" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">아직 방문 빈도 데이터가 없어요.</p>
                )}
                <p className="text-[11px] text-muted-foreground/70 mt-2">
                  로그인 유저 기준 · 방문=페이지뷰 · 선택 기간 내 정확히 N회 방문한 유저 수(10회+ 합산).
                </p>
              </Card>

              {/* [CL-IMPROVE3-REFJOINS-20260625] 초대(추천 링크) 수락 합류 추이 */}
              <Card className="p-4 sm:p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm sm:text-base font-semibold leading-relaxed">초대 링크 합류 추이</h3>
                  <span className="text-xs sm:text-sm text-muted-foreground">합류 {referralJoinsTotal}명</span>
                </div>
                {referralJoins.length > 0 ? (
                  <div className="h-56 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={referralJoins} margin={{ left: 8, right: 16, top: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        {/* [CL-EDIT5-R7CHART-20260626] 날짜 라벨 축약(M/d) + 양끝만 표시 → 장기/희소 구간 라벨 겹침 방지(R7-5) */}
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" tickFormatter={(d: string) => (typeof d === 'string' && d.length >= 10 ? d.slice(5).replace('-', '/') : d)} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [`${value}명`, '합류']} labelFormatter={(d: string) => (typeof d === 'string' && d.length >= 10 ? d.slice(5).replace('-', '/') : d)} />
                        <Bar dataKey="joins" name="합류" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">아직 초대 합류 데이터가 없어요.</p>
                )}
                <p className="text-[11px] text-muted-foreground/70 mt-2">
                  파트너/추천 링크로 초대 수락해 합류한 사람(협업자 등록 기준) · 선택 기간 내.
                </p>
              </Card>

              {/* [CL-ANONVISIT-ADMIN-20260627-234656] 전체 방문(익명 포함) — anon_page_views 집계.
                  위 차트들은 '로그인 사용자 기준'(page_views)이라 실제 트래픽 대비 과소표시 → 이 카드가 익명 포함 실측. */}
              <Card className="p-4 sm:p-5 hover:shadow-md transition-shadow lg:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm sm:text-base font-semibold leading-relaxed">전체 방문 (익명 포함)</h3>
                  <span className="text-xs sm:text-sm text-muted-foreground">방문 {anonTotals.views.toLocaleString()} · 세션 {anonTotals.sessions.toLocaleString()}</span>
                </div>
                <p className="text-[11px] text-muted-foreground/70 mb-3">
                  비로그인 방문자 포함 실제 트래픽(개인정보 비식별: user_id/IP 미수집). 위 '로그인 사용자' 지표와 구분.
                </p>
                {anonTotals.views > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* 익명 방문 추이 */}
                    <div className="h-56 sm:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={anonTrafficTrend}>
                          <defs>
                            <linearGradient id="gradAnonViews" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                          <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(value: number, name) => [`${value}`, name === 'sessions' ? '세션' : '방문']} />
                          <Legend wrapperStyle={{ fontSize: '13px' }} formatter={(v) => (v === 'sessions' ? '세션' : '방문')} />
                          <Area type="monotone" dataKey="views" name="views" stroke="#10b981" strokeWidth={2} fill="url(#gradAnonViews)" dot={false} activeDot={{ r: 5 }} />
                          <Area type="monotone" dataKey="sessions" name="sessions" stroke="#0ea5e9" strokeWidth={2} fillOpacity={0} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    {/* 익명 방문 소스 + 인기 페이지 */}
                    <div className="space-y-4">
                      {anonSourceView.rows.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground mb-2">유입 소스 (전체 방문)</h4>
                          <div className="space-y-1">
                            {anonSourceView.rows.slice(0, 5).map((r) => (
                              <div key={r.source} className="flex items-center justify-between text-xs">
                                <span className="truncate">{r.label}</span>
                                <span className="text-muted-foreground">{r.visits.toLocaleString()} ({r.percentage}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {anonTopPages.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground mb-2">인기 페이지 (전체 방문)</h4>
                          <div className="space-y-1">
                            {anonTopPages.slice(0, 5).map((p) => (
                              <div key={p.path} className="flex items-center justify-between text-xs">
                                <span className="truncate max-w-[70%]" title={p.path}>{p.path}</span>
                                <span className="text-muted-foreground">{p.views.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    아직 익명 방문 데이터가 없어요. (track-visit Edge 함수 · anon_page_views 마이그 배포 후 수집)
                  </p>
                )}
              </Card>

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

          {/* ===== AI Q&A 파이프라인 모니터링 [ADMIN-RAG-MONITOR-2026-03-07] ===== */}
          <RAGMonitor stats={ragStats} loading={ragLoading} />

          {/* ===== [AGENT-TEAM-9-20260307] E3 성능 감시 ===== */}
          <PerformancePanel
            metrics={perfMetrics}
            loading={perfLoading}
            error={perfError}
            onRefresh={fetchMetrics}
          />

          {/* ===== [AGENT-TEAM-9-20260307] E1 데이터 품질 감시 ===== */}
          <DataQualityPanel
            result={dqResult}
            loading={dqLoading}
            error={dqError}
            onScan={runScan}
          />

          {/* ===== [AGENT-TEAM-9-20260307] E2 임베딩 커버리지 분석 ===== */}
          <EmbeddingTunerPanel
            result={etResult}
            loading={etLoading}
            error={etError}
            onAnalyze={analyzeEmbeddings}
          />

          {/* ===== [AGENT-TEAM-9-20260307] M2 SEO 콘텐츠 생성 ===== */}
          <SEOAmplifierPanel
            content={seoContent}
            loading={seoLoading}
            error={seoError}
            onGenerate={generateSEO}
          />

          {/* [CL-ADMIN-FEEDBACK-BOARD-20260408-100500] FeatureRequestPanel은 main 최상단으로 이동됨 */}

          <section>
            <h2 className="text-base sm:text-lg font-bold mb-4 leading-relaxed">📊 18개 핵심 운영 지표</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {KPI_DEFINITIONS.map(def => {
                const kv = kpiValues.find(k => k.id === def.id);
                const value = kv?.value ?? 0;
                const change = kv?.change ?? 0;
                // [CL-FACT-KPISTATE-20260630] 정직상태 — 측정불가/데이터없음/불러오기실패면 가짜 수치 대신 라벨 + '참고' 칩.
                const fact = kpiFact(kv?.state);
                const status = fact.isFact ? getKPIStatus(def, value) : '참고';
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
                          <span className={`font-bold tabular-nums ${fact.isFact ? 'text-2xl sm:text-3xl' : 'text-base sm:text-lg text-muted-foreground'}`}>
                            {fact.isFact ? (def.unit === '%' ? `${value}%` : value.toLocaleString()) : fact.stateLabel}
                          </span>
                          {def.unit !== '%' && fact.isFact && <span className="text-xs sm:text-sm text-muted-foreground mb-0.5">{def.unit}</span>}
                        </div>
                        {/* [CL-FACT-KPISTATE-20260630] 사실 측정값일 때만 전기 대비 변화 표시(비사실 지표는 변화율 무의미) */}
                        {fact.isFact && (
                        <div className="flex items-center gap-1.5">
                          {change > 0 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> :
                           change < 0 ? <TrendingDown className="h-3.5 w-3.5 text-red-500" /> :
                           <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                          <span className={`text-xs sm:text-sm font-medium ${change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {change > 0 ? '+' : ''}{Math.round(change * 10) / 10}%
                          </span>
                          <span className="text-xs sm:text-sm text-muted-foreground">vs 전기</span>
                        </div>
                        )}
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
              {/* [CL-ADMIN-CHART-ORDER-20260621] 활성 사용자 추이는 Analytics Insights(페이지뷰 위)로 이동 */}
              {/* 온보딩 전환 추이 */}
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
                    // [CL-FACT-KPISTATE-20260630] 정직상태 — 비사실 지표는 현재값/상태를 라벨·'참고'로.
                    const fact = kpiFact(kv?.state);
                    const status = fact.isFact ? getKPIStatus(def, value) : '참고';
                    const sc = getStatusColor(status);
                    return (
                      <TableRow key={def.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="text-sm font-mono">{def.id}</TableCell>
                        <TableCell className="text-sm font-medium">{def.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{def.formula}</TableCell>
                        <TableCell className={`text-sm text-right font-semibold tabular-nums ${fact.isFact ? '' : 'text-muted-foreground'}`}>
                          {fact.isFact ? (def.unit === '%' ? `${value}%` : `${value.toLocaleString()}${def.unit}`) : fact.stateLabel}
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

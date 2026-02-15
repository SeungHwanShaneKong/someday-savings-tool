import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useAdminKPI } from '@/hooks/useAdminKPI';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Minus, Eye, Info } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { subDays, format } from 'date-fns';
import {
  KPI_DEFINITIONS, getKPIStatus, getStatusColor,
  getDemoKPIValues, getDemoTrendData, getDemoTopPages,
  type KPIValue, type TrendDataPoint
} from '@/lib/kpi-definitions';

// ========= 기간 프리셋 =========
const PERIOD_OPTIONS = [
  { label: '최근 7일', value: '7' },
  { label: '최근 30일', value: '30' },
  { label: '최근 90일', value: '90' },
];

// ========= 차트 공통 스타일 =========
const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
};

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { kpiValues, trendData, topPages, loading: dataLoading, fetchData } = useAdminKPI();

  const [period, setPeriod] = useState('30');
  const [demoMode, setDemoMode] = useState(true); // 임시: 데모 모드 기본 ON

  // 기간 계산
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = subDays(end, parseInt(period));
    return { startDate: start, endDate: end };
  }, [period]);

  // 인증 & 권한 체크 (임시 비활성화 — 배포 전 데모용)
  // useEffect(() => {
  //   if (!authLoading && !user) { navigate('/auth'); return; }
  //   if (!adminLoading && !isAdmin) { navigate('/'); return; }
  // }, [user, authLoading, isAdmin, adminLoading, navigate]);

  // 데이터 로드
  useEffect(() => {
    if (isAdmin && !demoMode) {
      fetchData(startDate, endDate);
    }
  }, [isAdmin, demoMode, startDate, endDate, fetchData]);

  // 데모/실제 데이터 전환
  const activeKPIs = demoMode ? getDemoKPIValues() : kpiValues;
  const activeTrend = demoMode ? getDemoTrendData() : trendData;
  const activeTopPages = demoMode ? getDemoTopPages() : topPages;

  const handleRefresh = () => {
    if (!demoMode) fetchData(startDate, endDate);
  };

  // 임시 비활성화 — 배포 전 데모용
  // if (authLoading || adminLoading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-background">
  //       <div className="animate-pulse text-muted-foreground">로딩 중...</div>
  //     </div>
  //   );
  // }
  // if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* ===== 헤더 ===== */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="rounded-full shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">관리자 KPI 대시보드 <span className="text-muted-foreground font-normal text-sm">(초안)</span></h1>
            <p className="text-xs text-muted-foreground">운영 핵심 지표 모니터링</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={demoMode ? 'default' : 'outline'}
              onClick={() => setDemoMode(!demoMode)}
              className={demoMode ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : ''}
            >
              {demoMode ? '데모 데이터 ON' : '데모 데이터 OFF'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleRefresh} disabled={dataLoading}>
              <RefreshCw className={`h-4 w-4 ${dataLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
        {/* ===== 필터 패널 ===== */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="세그먼트" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            <span>조회: {format(startDate, 'yyyy.MM.dd')} ~ {format(endDate, 'yyyy.MM.dd')}</span>
          </div>
        </div>

        {demoMode && (
          <div className="rounded-lg bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800 px-4 py-2 text-xs text-cyan-700 dark:text-cyan-400">
            ⚡ 데모 데이터 모드 — 실제 DB 대신 미리 정의된 샘플 데이터를 표시합니다.
          </div>
        )}

        {/* ===== KPI 카드 그리드 (15개) ===== */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {KPI_DEFINITIONS.map(def => {
            const kv = activeKPIs.find(k => k.id === def.id);
            const value = kv?.value ?? 0;
            const change = kv?.change ?? 0;
            const status = getKPIStatus(def, value);
            const statusColor = getStatusColor(status);

            return (
              <Card key={def.id} className="p-3 space-y-1.5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground">{def.id}</span>
                  <Badge className={`text-[10px] px-1.5 py-0 ${statusColor.bg} ${statusColor.text} border ${statusColor.border}`}>
                    {status}
                  </Badge>
                </div>
                <p className="text-xs font-medium truncate">{def.name}</p>
                <div className="flex items-end gap-1.5">
                  <span className="text-xl font-bold tabular-nums">
                    {typeof value === 'number' ? (def.unit === '%' ? `${value}%` : value.toLocaleString()) : value}
                  </span>
                  {def.unit !== '%' && <span className="text-[10px] text-muted-foreground mb-0.5">{def.unit}</span>}
                </div>
                <div className="flex items-center gap-1">
                  {change > 0 ? <TrendingUp className="h-3 w-3 text-emerald-500" /> :
                   change < 0 ? <TrendingDown className="h-3 w-3 text-red-500" /> :
                   <Minus className="h-3 w-3 text-muted-foreground" />}
                  <span className={`text-[10px] font-medium ${change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {change > 0 ? '+' : ''}{Math.round(change * 10) / 10}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">vs 전기</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">{def.description}</p>
              </Card>
            );
          })}
        </section>

        {/* ===== 트렌드 차트 (5개) ===== */}
        <section className="space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            📊 Historical Trend — Top 5 차트
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            {/* 차트 1: 활성 사용자 추이 */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">활성 사용자 추이 (DAU / WAU / MAU)</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activeTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey="dau" name="DAU" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="wau" name="WAU" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="mau" name="MAU" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 차트 2: 온보딩 전환 추이 */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">온보딩 전환 추이 (가입 / 생성 / 입력)</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="signups" name="가입" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="budgetCreated" name="예산 생성" fill="#10b981" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="amountEntered" name="금액 입력" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 차트 3: 리텐션 코호트 추이 */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">리텐션 코호트 추이 (D1 / D7 / D30)</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activeTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey="d1" name="D1" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="d7" name="D7" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="d30" name="D30" stroke="#6366f1" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 차트 4: 핵심 기능 채택률 추이 */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">핵심 기능 채택률 추이</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activeTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey="multiScenario" name="다중 시나리오" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="shareLink" name="공유 링크" stroke="#06b6d4" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="snapshot" name="스냅샷" stroke="#ec4899" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 차트 5: 집행률 & TTFV 추이 (full-width) */}
            <Card className="p-4 md:col-span-2">
              <h3 className="text-sm font-semibold mb-3">집행률 & TTFV 추이</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activeTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" unit="분" />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="executionRate" name="집행률(%)" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="ttfv" name="TTFV(분)" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </section>

        {/* ===== Top 페이지 ===== */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4" /> Top 페이지 (조회 기간 내)
          </h2>
          <div className="space-y-2">
            {activeTopPages.length ? activeTopPages.map((page, i) => (
              <div key={page.path} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-sm font-mono">{page.path}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums">{page.views.toLocaleString()}회</span>
                  <span className="text-xs text-muted-foreground w-12 text-right">{page.percentage}%</span>
                </div>
              </div>
            )) : (
              <p className="text-muted-foreground text-center py-4 text-sm">데이터 없음</p>
            )}
          </div>
        </Card>

        {/* ===== 15개 핵심 지표 정의 테이블 ===== */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">📋 15개 핵심 지표 정의</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-14">ID</TableHead>
                  <TableHead className="text-xs">지표명</TableHead>
                  <TableHead className="text-xs">계산식</TableHead>
                  <TableHead className="text-xs w-20 text-right">현재값</TableHead>
                  <TableHead className="text-xs w-28">임계 기준</TableHead>
                  <TableHead className="text-xs w-14 text-center">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {KPI_DEFINITIONS.map(def => {
                  const kv = activeKPIs.find(k => k.id === def.id);
                  const value = kv?.value ?? 0;
                  const status = getKPIStatus(def, value);
                  const sc = getStatusColor(status);
                  return (
                    <TableRow key={def.id}>
                      <TableCell className="text-xs font-mono">{def.id}</TableCell>
                      <TableCell className="text-xs font-medium">{def.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{def.formula}</TableCell>
                      <TableCell className="text-xs text-right font-semibold tabular-nums">
                        {def.unit === '%' ? `${value}%` : `${value.toLocaleString()}${def.unit}`}
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">
                        {def.thresholds
                          ? `주의 < ${def.thresholds.warn}, 위험 < ${def.thresholds.danger}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`text-[10px] px-1.5 py-0 ${sc.bg} ${sc.text} border ${sc.border}`}>
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

        <div className="text-center text-xs text-muted-foreground py-4">
          관리자 KPI 대시보드 v1.0 — 데이터는 RLS 정책으로 보호됩니다.
        </div>
      </main>
    </div>
  );
}

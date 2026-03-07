// [ADMIN-RAG-MONITOR-2026-03-07] RAG 파이프라인 모니터링 대시보드
// 4개 MECE 섹션: 크롤링 파이프라인, 벡터 데이터베이스, AI 대화, 시스템 건강

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  RefreshCw, Database, MessageSquare, Activity,
  CheckCircle2, XCircle, Clock, HardDrive,
  Layers, FolderSearch, BrainCircuit,
} from 'lucide-react';
import type { RAGStats } from '@/hooks/useAdminRAGStats';

interface RAGMonitorProps {
  stats: RAGStats | null;
  loading?: boolean;
}

const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '13px',
};

// ── 상대 시간 포맷 ──
function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '방금 전';
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  } catch {
    return '—';
  }
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${mm}/${dd} ${hh}:${mi}`;
  } catch {
    return '—';
  }
}

// ── 기능 이름 한국어 매핑 ──
const FEATURE_LABELS: Record<string, string> = {
  qa: '💡 Q&A',
  honeymoon: '✈️ 허니문',
  budget: '💰 예산',
};

function featureLabel(feature: string): string {
  return FEATURE_LABELS[feature] || feature;
}

// ── 상태 배지 색상 ──
function statusBadgeVariant(status: string) {
  switch (status) {
    case 'completed': return 'default' as const;
    case 'running': return 'secondary' as const;
    case 'failed': return 'destructive' as const;
    default: return 'outline' as const;
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'completed': return '✅ 완료';
    case 'running': return '🔄 실행 중';
    case 'failed': return '❌ 실패';
    default: return status;
  }
}

// ── 건강 배지 ──
function healthBadge(level: 'good' | 'warning' | 'critical') {
  const config = {
    good: { label: '양호', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800' },
    warning: { label: '주의', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' },
    critical: { label: '위험', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' },
  };
  const c = config[level];
  return <Badge variant="outline" className={`text-xs ${c.className}`}>{c.label}</Badge>;
}

export function RAGMonitor({ stats, loading }: RAGMonitorProps) {
  // 차트 데이터: 카테고리별 분포
  const categoryChartData = useMemo(() => {
    if (!stats?.vector_db.categories) return [];
    return stats.vector_db.categories.map((c) => ({
      name: c.category,
      문서수: c.count,
    }));
  }, [stats]);

  // ── 로딩 스켈레톤 ──
  if (loading && !stats) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-72" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-56 bg-muted rounded-xl" />
          <div className="h-56 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { crawling, vector_db, conversations, system_health } = stats;

  return (
    <section className="space-y-5">
      {/* ═══ 섹션 헤더 ═══ */}
      <div>
        <h2 className="text-base sm:text-lg font-bold leading-relaxed flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-indigo-500" />
          AI Q&A 파이프라인 모니터링
        </h2>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          크롤링, 벡터DB, AI 대화, 시스템 건강 현황을 MECE하게 모니터링합니다.
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 1. 크롤링 파이프라인 (Cyan)                         */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-cyan-500" />
          크롤링 파이프라인
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* 전체 소스 */}
          <Card className="p-4 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-200/50 dark:border-cyan-800/50">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">전체 소스</p>
              <p className="text-2xl font-bold tabular-nums">{crawling.total_sources}</p>
              <p className="text-[10px] text-muted-foreground">활성: {crawling.active_sources}</p>
            </div>
          </Card>

          {/* 성공 작업 */}
          <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200/50 dark:border-green-800/50">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">성공 작업</p>
                <p className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">{crawling.success_jobs}</p>
              </div>
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-1" />
            </div>
          </Card>

          {/* 실패 작업 */}
          <Card className="p-4 bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-200/50 dark:border-red-800/50">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">실패 작업</p>
                <p className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">{crawling.failed_jobs}</p>
              </div>
              <XCircle className="h-4 w-4 text-red-500 mt-1" />
            </div>
          </Card>

          {/* 전체 작업 */}
          <Card className="p-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">전체 작업</p>
              <p className="text-2xl font-bold tabular-nums">{crawling.total_jobs}</p>
            </div>
          </Card>

          {/* 마지막 크롤 */}
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">마지막 크롤</p>
                <p className="text-sm font-semibold">{relativeTime(crawling.last_crawl_at)}</p>
                <p className="text-[10px] text-muted-foreground">{formatDateTime(crawling.last_crawl_at)}</p>
              </div>
              <Clock className="h-4 w-4 text-muted-foreground mt-1" />
            </div>
          </Card>
        </div>

        {/* 최근 크롤 작업 테이블 */}
        {crawling.recent_jobs.length > 0 && (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">소스</TableHead>
                    <TableHead className="text-xs">상태</TableHead>
                    <TableHead className="text-xs">시작</TableHead>
                    <TableHead className="text-xs">완료</TableHead>
                    <TableHead className="text-xs text-right">문서 수</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {crawling.recent_jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="text-xs font-medium max-w-[120px] truncate">
                        {job.source_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(job.status)} className="text-[10px]">
                          {statusLabel(job.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(job.started_at)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(job.completed_at)}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {job.documents_found}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 2. 벡터 데이터베이스 (Indigo)                       */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
          <Database className="h-4 w-4 text-indigo-500" />
          벡터 데이터베이스
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* 총 임베딩 */}
          <Card className="p-4 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-200/50 dark:border-indigo-800/50">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">총 임베딩</p>
                <p className="text-2xl font-bold tabular-nums">{vector_db.total_embeddings.toLocaleString()}</p>
              </div>
              <Layers className="h-4 w-4 text-indigo-500 mt-1" />
            </div>
          </Card>

          {/* 카테고리 수 */}
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">카테고리 수</p>
                <p className="text-2xl font-bold tabular-nums">{vector_db.total_categories}</p>
              </div>
              <FolderSearch className="h-4 w-4 text-muted-foreground mt-1" />
            </div>
          </Card>

          {/* 추정 용량 */}
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">추정 용량</p>
                <p className="text-2xl font-bold tabular-nums">{vector_db.total_embeddings > 0 ? `${((vector_db.total_embeddings * 1536 * 4) / (1024 * 1024)).toFixed(1)}` : '0'}</p>
                <p className="text-[10px] text-muted-foreground">MB</p>
              </div>
              <HardDrive className="h-4 w-4 text-muted-foreground mt-1" />
            </div>
          </Card>

          {/* 최신 임베딩 */}
          <Card className="p-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">최신 임베딩</p>
              <p className="text-sm font-semibold">{relativeTime(vector_db.newest_embedding)}</p>
              <p className="text-[10px] text-muted-foreground">{formatDateTime(vector_db.newest_embedding)}</p>
            </div>
          </Card>

          {/* 평균 신선도 */}
          <Card className="p-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">평균 신선도</p>
              <p className="text-2xl font-bold tabular-nums">{vector_db.avg_freshness_score > 0 ? vector_db.avg_freshness_score.toFixed(2) : '—'}</p>
            </div>
          </Card>
        </div>

        {/* 카테고리별 분포 차트 */}
        {categoryChartData.length > 0 && (
          <Card className="p-4 sm:p-5">
            <h4 className="text-sm font-semibold mb-3">카테고리별 임베딩 분포</h4>
            <div className="h-48 sm:h-56">
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
                    width={90}
                  />
                  <RechartsTooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value: number) => [`${value}개`, '문서 수']}
                  />
                  <Bar dataKey="문서수" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 3. AI 대화 현황 (Pink)                              */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-pink-500" />
          AI 대화 현황
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* 총 대화 */}
          <Card className="p-4 bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-pink-200/50 dark:border-pink-800/50">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">총 대화 수</p>
              <p className="text-2xl font-bold tabular-nums">{conversations.total_conversations}</p>
            </div>
          </Card>

          {/* 24시간 내 */}
          <Card className="p-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">최근 24시간</p>
              <p className="text-2xl font-bold tabular-nums text-pink-600 dark:text-pink-400">{conversations.recent_24h}</p>
            </div>
          </Card>

          {/* 7일 내 */}
          <Card className="p-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">최근 7일</p>
              <p className="text-2xl font-bold tabular-nums">{conversations.recent_7d}</p>
            </div>
          </Card>

          {/* 기능별 분포 */}
          <Card className="p-4">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">기능별 분포</p>
              {conversations.total_by_feature.length > 0 ? (
                <div className="space-y-1">
                  {conversations.total_by_feature.map((f) => (
                    <div key={f.feature} className="flex items-center justify-between text-xs">
                      <span>{featureLabel(f.feature)}</span>
                      <span className="font-semibold tabular-nums">{f.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">데이터 없음</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 4. 시스템 건강 (Dynamic Green/Yellow/Red)           */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-500" />
          시스템 건강
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 임베딩 신선도 */}
          <Card className="p-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">임베딩 신선도</p>
              {healthBadge(system_health.embedding_freshness)}
              <p className="text-[10px] text-muted-foreground mt-1">
                {system_health.embedding_freshness === 'good' && '24시간 이내 업데이트'}
                {system_health.embedding_freshness === 'warning' && '72시간 이내 업데이트'}
                {system_health.embedding_freshness === 'critical' && '72시간 이상 경과'}
              </p>
            </div>
          </Card>

          {/* 크롤 성공률 */}
          <Card className="p-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">크롤 성공률</p>
              <p className={`text-2xl font-bold tabular-nums ${
                system_health.crawl_success_rate >= 80
                  ? 'text-green-600 dark:text-green-400'
                  : system_health.crawl_success_rate >= 50
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
              }`}>
                {system_health.crawl_success_rate}%
              </p>
            </div>
          </Card>

          {/* 평균 크롤 소요시간 */}
          <Card className="p-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">평균 크롤 소요</p>
              <p className="text-2xl font-bold tabular-nums">
                {system_health.avg_crawl_duration_sec > 0
                  ? `${Math.floor(system_health.avg_crawl_duration_sec / 60)}분 ${system_health.avg_crawl_duration_sec % 60}초`
                  : '—'}
              </p>
            </div>
          </Card>

          {/* 스토리지 추정 */}
          <Card className="p-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">벡터 스토리지</p>
              <p className="text-2xl font-bold tabular-nums">
                {system_health.storage_estimate_mb > 0
                  ? `${system_health.storage_estimate_mb}`
                  : '0'}
              </p>
              <p className="text-[10px] text-muted-foreground">MB (추정)</p>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

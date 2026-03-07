// [AGENT-TEAM-9-20260307] E1 데이터 품질 가디언 패널
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

// ── 인라인 타입 (useDataQualityGuardian 미존재 시 대비) ──
export interface DataQualityIssue {
  type: 'duplicate' | 'stale' | 'uncategorized' | 'outdated';
  count: number;
  details: string[];
}

export interface DataQualityResult {
  scan_at: string;
  total_scanned: number;
  issues: DataQualityIssue[];
  health_score: number;
}

interface DataQualityPanelProps {
  result: DataQualityResult | null;
  loading: boolean;
  error: string | null;
  onScan: () => void;
}

// ── 이슈 타입 한국어 매핑 ──
const ISSUE_TYPE_LABELS: Record<DataQualityIssue['type'], string> = {
  duplicate: '중복 데이터',
  stale: '오래된 데이터',
  uncategorized: '미분류 데이터',
  outdated: '만료된 데이터',
};

// ── 이슈 심각도 ──
function issueSeverity(type: DataQualityIssue['type'], count: number) {
  if (type === 'duplicate' && count > 20) return 'critical';
  if (type === 'outdated' && count > 10) return 'critical';
  if (count > 5) return 'warning';
  return 'low';
}

function severityBadge(severity: string) {
  const config: Record<string, { label: string; className: string }> = {
    critical: {
      label: '심각',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    },
    warning: {
      label: '주의',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    },
    low: {
      label: '낮음',
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    },
  };
  const c = config[severity] || config.low;
  return (
    <Badge variant="outline" className={`text-[10px] ${c.className}`}>
      {c.label}
    </Badge>
  );
}

// ── 건강 점수 배지 ──
function healthScoreBadge(score: number) {
  if (score >= 80) {
    return (
      <Badge variant="outline" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
        양호 ({score}점)
      </Badge>
    );
  }
  if (score >= 50) {
    return (
      <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800">
        주의 ({score}점)
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800">
      위험 ({score}점)
    </Badge>
  );
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

export function DataQualityPanel({ result, loading, error, onScan }: DataQualityPanelProps) {
  // ── 로딩 스켈레톤 ──
  if (loading && !result) {
    return (
      <section className="space-y-4">
        <div className="h-7 bg-muted rounded w-56 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-48 bg-muted rounded-xl animate-pulse" />
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {/* ═══ 섹션 헤더 ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold leading-relaxed flex items-center gap-2">
            <Search className="h-5 w-5 text-rose-500" />
            데이터 품질 스캔
          </h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            RAG 데이터의 품질을 분석하고 이슈를 식별합니다.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onScan} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          품질 스캔 실행
        </Button>
      </div>

      {/* ═══ 에러 표시 ═══ */}
      {error && (
        <Card className="p-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        </Card>
      )}

      {/* ═══ 결과가 있을 때 ═══ */}
      {result && (
        <>
          {/* KPI 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 건강 점수 */}
            <Card className="p-5 bg-gradient-to-br from-rose-500/10 to-pink-600/5 border-rose-200/50 dark:border-rose-800/50">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">건강 점수</p>
                <p className={`text-3xl font-bold tabular-nums ${
                  result.health_score >= 80
                    ? 'text-green-600 dark:text-green-400'
                    : result.health_score >= 50
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {result.health_score}
                </p>
                {healthScoreBadge(result.health_score)}
              </div>
            </Card>

            {/* 스캔 문서 수 */}
            <Card className="p-5 bg-gradient-to-br from-pink-500/10 to-rose-600/5 border-pink-200/50 dark:border-pink-800/50">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-muted-foreground">스캔된 문서</p>
                <p className="text-2xl sm:text-3xl font-bold tabular-nums">
                  {result.total_scanned.toLocaleString()}
                </p>
              </div>
            </Card>

            {/* 발견된 이슈 */}
            <Card className="p-5">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-muted-foreground">발견된 이슈</p>
                <p className="text-2xl sm:text-3xl font-bold tabular-nums">
                  {result.issues.reduce((sum, i) => sum + i.count, 0)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  마지막 스캔: {formatDateTime(result.scan_at)}
                </p>
              </div>
            </Card>
          </div>

          {/* 이슈 테이블 */}
          {result.issues.length > 0 ? (
            <Card className="p-4 sm:p-5">
              <h3 className="text-sm sm:text-base font-semibold mb-3">이슈 상세</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">유형</TableHead>
                      <TableHead className="text-xs text-right">건수</TableHead>
                      <TableHead className="text-xs">심각도</TableHead>
                      <TableHead className="text-xs">상세</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.issues.map((issue) => (
                      <TableRow key={issue.type}>
                        <TableCell className="text-xs font-medium">
                          {ISSUE_TYPE_LABELS[issue.type]}
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          {issue.count}
                        </TableCell>
                        <TableCell>
                          {severityBadge(issueSeverity(issue.type, issue.count))}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {issue.details.length > 0
                            ? issue.details.slice(0, 2).join(', ')
                            : '—'}
                          {issue.details.length > 2 && ` 외 ${issue.details.length - 2}건`}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <ShieldCheck className="h-8 w-8 text-green-500 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                발견된 이슈가 없습니다. 데이터 품질이 양호합니다.
              </p>
            </Card>
          )}
        </>
      )}

      {/* ═══ 결과 없음 ═══ */}
      {!result && !error && (
        <Card className="p-8 text-center">
          <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            아직 품질 스캔이 실행되지 않았습니다.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            &ldquo;품질 스캔 실행&rdquo; 버튼을 눌러 데이터 품질을 분석하세요.
          </p>
        </Card>
      )}
    </section>
  );
}

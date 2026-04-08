/**
 * [CL-ADMIN-FEATURE-REQ-20260403] 관리자 — 사용자 기능 요청 패널 (Toss 스타일)
 * [CL-ADMIN-FEEDBACK-BOARD-20260408-100500] 한눈에 보기 강화 — stats tiles + 검색 + CSV export
 */

import { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare, RefreshCw, Search, Download } from 'lucide-react';
import type { FeatureRequest } from '@/hooks/useFeatureRequests';

interface FeatureRequestPanelProps {
  requests: FeatureRequest[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const FILTER_CATEGORIES = ['전체', '예산', '체크리스트', '허니문', 'AI', '기타'] as const;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function CategoryBadge({ category }: { category: string | null }) {
  const colors: Record<string, string> = {
    '예산': 'bg-green-100 text-green-700',
    '체크리스트': 'bg-blue-100 text-blue-700',
    '허니문': 'bg-sky-100 text-sky-700',
    'AI': 'bg-purple-100 text-purple-700',
    '기타': 'bg-gray-100 text-gray-700',
  };
  const label = category || '미분류';
  return (
    <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', colors[label] || 'bg-gray-100 text-gray-600')}>
      {label}
    </span>
  );
}

// [CL-ADMIN-FEEDBACK-BOARD-20260408-100500] CSV 행 이스케이프
function csvEscape(value: string | null | undefined): string {
  const s = (value ?? '').toString();
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// [CL-ADMIN-FEEDBACK-BOARD-20260408-100500] 통계 타일
function StatTile({ label, value, accent }: { label: string; value: number; accent?: 'primary' | 'amber' | 'green' | 'rose' }) {
  const accentClass = {
    primary: 'text-primary',
    amber: 'text-amber-600',
    green: 'text-emerald-600',
    rose: 'text-rose-600',
  }[accent || 'primary'];
  return (
    <div className="flex-1 min-w-[80px] bg-muted/30 rounded-xl border border-border/50 px-3 py-2.5">
      <div className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">{label}</div>
      <div className={cn('text-lg sm:text-xl font-bold mt-0.5', accentClass)}>{value}</div>
    </div>
  );
}

export function FeatureRequestPanel({ requests, loading, error, onRefresh }: FeatureRequestPanelProps) {
  const [filter, setFilter] = useState<string>('전체');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // [CL-ADMIN-FEEDBACK-BOARD-20260408-100500] 검색 (debounced 200ms)
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim().toLowerCase()), 200);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // [CL-ADMIN-FEEDBACK-BOARD-20260408-100500] 한눈에 보기 — aggregate stats
  const stats = useMemo(() => {
    const now = new Date();
    // KST 기준 오늘 00:00 (UTC+9)
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const kstTodayStart = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate())).getTime() - 9 * 60 * 60 * 1000;
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;

    let today = 0;
    let last7d = 0;
    let uncategorized = 0;
    for (const r of requests) {
      const t = new Date(r.created_at).getTime();
      if (t >= kstTodayStart) today += 1;
      if (t >= sevenDaysAgo) last7d += 1;
      if (!r.category) uncategorized += 1;
    }
    return {
      total: requests.length,
      today,
      last7d,
      uncategorized,
    };
  }, [requests]);

  const filtered = useMemo(() => {
    let list = requests;
    if (filter !== '전체') {
      list = list.filter(r => (r.category || '미분류') === filter);
    }
    if (searchQuery) {
      list = list.filter(r =>
        (r.content || '').toLowerCase().includes(searchQuery) ||
        (r.category || '').toLowerCase().includes(searchQuery)
      );
    }
    return list;
  }, [requests, filter, searchQuery]);

  // 카테고리별 건수
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of requests) {
      const cat = r.category || '미분류';
      map[cat] = (map[cat] || 0) + 1;
    }
    return map;
  }, [requests]);

  // [CL-ADMIN-FEEDBACK-BOARD-20260408-100500] CSV 다운로드
  const handleExportCsv = () => {
    if (requests.length === 0) return;
    const header = ['id', 'created_at', 'category', 'content', 'user_id'];
    const rows = requests.map(r => [
      r.id,
      r.created_at,
      r.category || '',
      r.content || '',
      r.user_id || '',
    ].map(csvEscape).join(','));
    const csv = '\uFEFF' + [header.join(','), ...rows].join('\n'); // BOM for Excel
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    a.href = url;
    a.download = `feature-requests-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-toss-sm overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">사용자 의견</h3>
          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {requests.length}건
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* [CL-ADMIN-FEEDBACK-BOARD-20260408-100500] CSV export 버튼 */}
          <button
            onClick={handleExportCsv}
            disabled={loading || requests.length === 0}
            title="CSV로 내보내기"
            className="p-2 rounded-lg hover:bg-muted transition-colors active:scale-[0.95] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            title="새로고침"
            className="p-2 rounded-lg hover:bg-muted transition-colors active:scale-[0.95]"
          >
            <RefreshCw className={cn('w-4 h-4 text-muted-foreground', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* [CL-ADMIN-FEEDBACK-BOARD-20260408-100500] 통계 타일 4종 — 한눈에 보기 */}
      <div className="flex gap-2 px-4 sm:px-5 pt-3">
        <StatTile label="총 의견" value={stats.total} accent="primary" />
        <StatTile label="오늘" value={stats.today} accent="green" />
        <StatTile label="최근 7일" value={stats.last7d} accent="amber" />
        <StatTile label="미분류" value={stats.uncategorized} accent="rose" />
      </div>

      {/* [CL-ADMIN-FEEDBACK-BOARD-20260408-100500] 검색 인풋 */}
      <div className="px-4 sm:px-5 pt-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="의견 내용 검색..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-border/50 bg-muted/30 focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-1.5 px-4 sm:px-5 py-3 overflow-x-auto scrollbar-hide">
        {FILTER_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 active:scale-[0.95]',
              filter === cat
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {cat}
            {cat !== '전체' && categoryStats[cat] ? ` ${categoryStats[cat]}` : ''}
          </button>
        ))}
      </div>

      {/* 에러 */}
      {error && (
        <div className="px-4 sm:px-5 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="px-4 sm:px-5 py-6 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-12 px-4">
          <div className="text-3xl mb-3">💬</div>
          <p className="text-sm font-medium text-muted-foreground">아직 의견이 없어요</p>
          <p className="text-xs text-muted-foreground/60 mt-1">의견이 오면 여기에 쌓여요</p>
        </div>
      )}

      {/* 의견 카드 리스트 */}
      {!loading && filtered.length > 0 && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-2">
          {filtered.map((req, idx) => (
            <button
              key={req.id}
              onClick={() => setExpandedId(prev => prev === req.id ? null : req.id)}
              className={cn(
                'w-full text-left rounded-xl bg-muted/30 border border-border/50 p-3.5 hover:shadow-toss-sm transition-all duration-200 active:scale-[0.99] animate-fade-up',
              )}
              style={{ animationDelay: `${idx * 0.03}s` }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <CategoryBadge category={req.category} />
                <span className="text-[11px] text-muted-foreground ml-auto">
                  {timeAgo(req.created_at)}
                </span>
              </div>
              <p className={cn(
                'text-sm text-foreground leading-relaxed',
                expandedId !== req.id && 'line-clamp-2'
              )}>
                {req.content}
              </p>
              <p className="text-[11px] text-muted-foreground/60 mt-1.5">
                {req.user_id ? `사용자 ${req.user_id.slice(0, 8)}...` : '익명'}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

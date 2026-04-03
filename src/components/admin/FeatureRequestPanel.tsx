/**
 * [CL-ADMIN-FEATURE-REQ-20260403] 관리자 — 사용자 기능 요청 패널 (Toss 스타일)
 */

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare, RefreshCw } from 'lucide-react';
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

export function FeatureRequestPanel({ requests, loading, error, onRefresh }: FeatureRequestPanelProps) {
  const [filter, setFilter] = useState<string>('전체');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === '전체') return requests;
    return requests.filter(r => (r.category || '미분류') === filter);
  }, [requests, filter]);

  // 카테고리별 건수
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of requests) {
      const cat = r.category || '미분류';
      map[cat] = (map[cat] || 0) + 1;
    }
    return map;
  }, [requests]);

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
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-muted transition-colors active:scale-[0.95]"
        >
          <RefreshCw className={cn('w-4 h-4 text-muted-foreground', loading && 'animate-spin')} />
        </button>
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

// [ZERO-COST-PIPELINE-2026-03-07] 데이터 신선도 배지 컴포넌트
// RAG 응답의 데이터 수집 시각을 시각적으로 표시

import { cn } from '@/lib/utils';
import {
  getFreshnessLevel,
  getFreshnessInfoLabel,
  type FreshnessInfo,
  type FreshnessLevel,
} from '@/lib/rag-sources';
import { Clock, Zap, CalendarClock, CalendarDays } from 'lucide-react';

interface FreshnessBadgeProps {
  freshnessInfo?: FreshnessInfo | null;
  crawledAt?: string;
  className?: string;
}

const LEVEL_CONFIG: Record<
  FreshnessLevel,
  { icon: typeof Clock; color: string; bg: string }
> = {
  realtime: {
    icon: Zap,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
  },
  today: {
    icon: Clock,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800',
  },
  recent: {
    icon: CalendarClock,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
  },
  stale: {
    icon: CalendarDays,
    color: 'text-muted-foreground',
    bg: 'bg-muted/30 border-border',
  },
};

export function FreshnessBadge({
  freshnessInfo,
  crawledAt,
  className,
}: FreshnessBadgeProps) {
  // 라벨 결정
  const label = getFreshnessInfoLabel(freshnessInfo)
    || (crawledAt ? getFreshnessInfoLabel({
        latest_source_time: crawledAt,
        freshness_label: '',
        avg_freshness_score: 0,
      }) : '');

  if (!label) return null;

  // 레벨 결정
  const level = getFreshnessLevel(
    freshnessInfo?.latest_source_time || crawledAt
  );
  const config = LEVEL_CONFIG[level];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        'text-[10px] font-medium border',
        config.bg,
        config.color,
        className
      )}
    >
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  );
}

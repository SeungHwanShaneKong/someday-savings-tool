// [CL-AI-HIERARCHY-20260308-163000]
// [CL-TREE-REDESIGN-20260403] 긴급 항목 뱃지 추가
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { ChecklistStats } from '@/hooks/useChecklist';

interface ChecklistProgressProps {
  stats: ChecklistStats;
  overdueCount?: number;
  urgentCount?: number;
  soonCount?: number;
}

function getBarColor(percentage: number): string {
  if (percentage === 100) return 'bg-green-500';
  if (percentage > 0) return 'bg-amber-500';
  return 'bg-muted-foreground/30';
}

export function ChecklistProgress({ stats, overdueCount = 0, urgentCount = 0, soonCount = 0 }: ChecklistProgressProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 lg:p-8 shadow-toss-sm animate-fade-up">
      {/* Overall progress ring */}
      <div className="flex items-center gap-5 sm:gap-6 lg:gap-8">
        <div
          className="relative w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 flex-shrink-0"
          role="progressbar"
          aria-valuenow={stats.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`전체 진행률 ${stats.percentage}퍼센트`}
        >
          <svg className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="6"
            />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke={stats.percentage === 100 ? 'hsl(145, 65%, 42%)' : 'hsl(var(--primary))'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - stats.percentage / 100)}`}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">
              {stats.percentage}%
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg sm:text-xl font-semibold text-foreground">
            전체 진행률
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats.completed}개 완료 / {stats.total}개 항목
          </p>
          {stats.percentage === 100 && (
            <p className="text-sm text-green-600 font-medium mt-1">
              🎉 모든 준비를 완료했어요!
            </p>
          )}

          {/* [CL-TREE-REDESIGN-20260403] 긴급 항목 뱃지 */}
          {(overdueCount > 0 || urgentCount > 0 || soonCount > 0) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {overdueCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                  {overdueCount} 긴급
                </span>
              )}
              {urgentCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                  <Clock className="w-3 h-3" />
                  {urgentCount} 이번주
                </span>
              )}
              {soonCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                  <Clock className="w-3 h-3" />
                  {soonCount} 이번달
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Period breakdown — responsive grid with mini-cards */}
      <div className="mt-4 sm:mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {Object.entries(stats.byPeriod).map(([period, data]) => (
          <div key={period} className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2">
            <span className="text-xs text-muted-foreground w-24 sm:w-28 flex-shrink-0 truncate">
              {period}
            </span>
            <Progress
              value={data.percentage}
              className="flex-1 h-2"
              indicatorClassName={getBarColor(data.percentage)}
            />
            <span className={cn(
              'text-xs font-medium w-10 text-right',
              data.percentage === 100 ? 'text-green-600' : 'text-muted-foreground'
            )}>
              {data.completed}/{data.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

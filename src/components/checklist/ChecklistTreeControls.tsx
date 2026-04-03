/**
 * [CL-TREE-REDESIGN-20260403] 트리 전체 컨트롤 바 — Toss 스타일
 * 전체 펼치기/접기 + 긴급 통계 + 진행률 바
 */

import { ChevronsDown, ChevronsUp, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { getUrgencyLevel } from '@/lib/checklist-nudges';
import type { ChecklistItem } from '@/hooks/useChecklist';

interface ChecklistTreeControlsProps {
  items: ChecklistItem[];
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export function ChecklistTreeControls({
  items,
  onExpandAll,
  onCollapseAll,
}: ChecklistTreeControlsProps) {
  const total = items.length;
  const completed = items.filter(i => i.is_completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  // 긴급도 카운트
  let overdueCount = 0;
  let urgentCount = 0;
  let soonCount = 0;

  for (const item of items) {
    if (item.is_completed) continue;
    const level = getUrgencyLevel(item.due_date, false);
    if (level === 'overdue') overdueCount++;
    else if (level === 'urgent') urgentCount++;
    else if (level === 'soon') soonCount++;
  }

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-4 sm:p-5 shadow-toss-sm animate-fade-up">
      {/* 헤더 — 타이틀 + 버튼 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          🌳 전체 구조
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={onExpandAll}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all active:scale-[0.95]"
            aria-label="전체 펼치기"
            title="전체 펼치기"
          >
            <ChevronsDown className="w-4 h-4" />
          </button>
          <button
            onClick={onCollapseAll}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all active:scale-[0.95]"
            aria-label="전체 접기"
            title="전체 접기"
          >
            <ChevronsUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 통계 뱃지 */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
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
        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3" />
          {completed}/{total} 완료
        </span>
      </div>

      {/* 진행률 바 */}
      <div className="flex items-center gap-2">
        <Progress
          value={percentage}
          className="flex-1 h-2"
          indicatorClassName={cn(
            percentage === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-primary to-blue-400'
          )}
        />
        <span className="text-xs font-semibold text-muted-foreground w-10 text-right">
          {percentage}%
        </span>
      </div>
    </div>
  );
}

/**
 * [CL-TREE-REDESIGN-20260403] 트리 전체 컨트롤 바 — Toss 스타일
 * 전체 펼치기/접기 + 긴급 통계 + 진행률 바
 * [CL-TOP20-P3-CHECK-20260703-030000] "긴급순 보기" 토글 추가
 */

import { ChevronsDown, ChevronsUp, AlertTriangle, ArrowDownWideNarrow, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { getUrgencyLevel } from '@/lib/checklist-nudges';
import type { ChecklistItem } from '@/hooks/useChecklist';

interface ChecklistTreeControlsProps {
  items: ChecklistItem[];
  onExpandAll: () => void;
  onCollapseAll: () => void;
  /** [CL-TOP20-P3-CHECK-20260703-030000] 긴급순 보기 토글 상태 (미전달 시 토글 미노출 — 기존 사용처 회귀 0) */
  urgencySort?: boolean;
  onUrgencySortChange?: (value: boolean) => void;
}

export function ChecklistTreeControls({
  items,
  onExpandAll,
  onCollapseAll,
  urgencySort = false,
  onUrgencySortChange,
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
        {/* [CL-BTNAUDIT3-20260704 | 간격증대] 인접 아이콘버튼 오터치 방지 gap-1→gap-1.5 sm:gap-2 */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* [CL-TOP20-P3-CHECK-20260703-030000] 긴급순 보기 토글 — off 기본(기존 순서 유지) */}
          {onUrgencySortChange && (
            <button
              type="button"
              onClick={() => onUrgencySortChange(!urgencySort)}
              aria-pressed={urgencySort}
              aria-label="긴급순 보기"
              title="마감 임박한 항목부터 정렬해요"
              className={cn(
                // [CL-BTNAUDIT3-20260704 | 터치타깃44] 히트영역만 모바일 44px, 시각크기 유지
                'inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-1 min-h-11 md:min-h-0 text-xs font-medium transition-all active:scale-[0.95] motion-reduce:active:scale-100',
                urgencySort
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <ArrowDownWideNarrow className="h-3.5 w-3.5" aria-hidden="true" />
              긴급순
            </button>
          )}
          {/* [CL-BTNAUDIT3-20260704 | 터치타깃44] 아이콘전용 버튼 히트영역 모바일 44px, 아이콘 w-4 유지 */}
          <button
            onClick={onExpandAll}
            className="min-h-11 min-w-11 md:min-h-0 md:min-w-0 inline-flex items-center justify-center p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all active:scale-[0.95]"
            aria-label="전체 펼치기"
            title="전체 펼치기"
          >
            <ChevronsDown className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={onCollapseAll}
            className="min-h-11 min-w-11 md:min-h-0 md:min-w-0 inline-flex items-center justify-center p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all active:scale-[0.95]"
            aria-label="전체 접기"
            title="전체 접기"
          >
            <ChevronsUp className="w-4 h-4" aria-hidden="true" />
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

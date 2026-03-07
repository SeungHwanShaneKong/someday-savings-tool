// [AGENT-TEAM-9-20260307]
import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TimelineResult, TimelineMonth, TimelineTask } from '@/hooks/useTimelineOptimizer';

interface TimelinePanelProps {
  result: TimelineResult | null;
  loading: boolean;
  error: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRIORITY_STYLES: Record<TimelineTask['priority'], { label: string; className: string }> = {
  high: { label: '높음', className: 'bg-red-500 text-white hover:bg-red-600' },
  medium: { label: '보통', className: 'bg-amber-500 text-white hover:bg-amber-600' },
  low: { label: '낮음', className: 'bg-green-500 text-white hover:bg-green-600' },
};

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  return `${year}년 ${parseInt(month, 10)}월`;
}

function formatDeadline(deadline: string): string {
  const date = new Date(deadline);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}까지`;
}

/* ── Skeleton placeholder while loading ── */
function LoadingSkeleton() {
  return (
    <div className="space-y-4 mt-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-5 w-32 rounded bg-blue-100 animate-pulse" />
          <div className="space-y-2">
            {[1, 2].map((j) => (
              <div key={j} className="rounded-lg border p-4 space-y-2">
                <div className="h-4 w-3/4 rounded bg-blue-50 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-blue-50 animate-pulse" />
                <div className="h-3 w-2/3 rounded bg-blue-50 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Collapsible month section ── */
function MonthSection({ monthData }: { monthData: TimelineMonth }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-blue-100 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-150 transition-colors text-left"
      >
        <span className="font-semibold text-blue-800 text-sm">
          {formatMonth(monthData.month)}
        </span>
        <span className="text-blue-500 text-xs">
          {monthData.tasks.length}개 항목 {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div className="p-3 space-y-2 bg-white">
          {monthData.tasks.map((task, idx) => {
            const priority = PRIORITY_STYLES[task.priority];
            return (
              <Card key={idx} className="border-blue-50 shadow-sm">
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-sm text-gray-900">
                      {task.task}
                    </span>
                    <Badge className={`shrink-0 text-[10px] px-1.5 py-0.5 ${priority.className}`}>
                      {priority.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {task.tip}
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-blue-600 font-medium">
                    <span>📌</span>
                    <span>{formatDeadline(task.deadline)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Main Panel ── */
export default function TimelinePanel({
  result,
  loading,
  error,
  open,
  onOpenChange,
}: TimelinePanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-lg">
            <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent font-bold">
              📅 AI 일정 최적화
            </span>
            {result && (
              <Badge className="bg-blue-600 text-white hover:bg-blue-700 text-xs">
                D-{result.dday_count}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          {/* Loading state */}
          {loading && <LoadingSkeleton />}

          {/* Error state */}
          {error && !loading && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-medium mb-1">오류 발생</p>
              <p>{error}</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && !result && (
            <div className="text-center py-12 text-gray-400 text-sm">
              <p className="text-3xl mb-3">📅</p>
              <p>결혼식 날짜와 완료 항목을 입력하고</p>
              <p>AI 일정 최적화를 시작해보세요.</p>
            </div>
          )}

          {/* Result */}
          {!loading && !error && result && (
            <div className="space-y-3">
              {/* Summary header */}
              <div className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                <p className="text-sm font-medium opacity-90">결혼식까지</p>
                <p className="text-2xl font-bold">D-{result.dday_count}</p>
                <p className="text-xs opacity-75 mt-1">
                  총 {result.timeline.length}개월 · {result.timeline.reduce((sum, m) => sum + m.tasks.length, 0)}개 할 일
                </p>
              </div>

              {/* Monthly sections */}
              <div className="space-y-2">
                {result.timeline.map((monthData) => (
                  <MonthSection key={monthData.month} monthData={monthData} />
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

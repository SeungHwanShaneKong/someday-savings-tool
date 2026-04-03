// [AGENT-TEAM-9-20260307]
// [CL-AI-LOADING-MSG-20260308-201500] skeleton → AI 로딩 메시지
// [CL-TIMELINE-FALLBACK-20260403] Toss 스타일 폴백 UI
import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import type { TimelineResult, TimelineMonth, TimelineTask } from '@/hooks/useTimelineOptimizer';

// [CL-TIMELINE-FALLBACK-20260403] isFallback prop 추가
interface TimelinePanelProps {
  result: TimelineResult | null;
  loading: boolean;
  error: string | null;
  isFallback?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry?: () => void;
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

/* ── [CL-AI-LOADING-MSG-20260308-201500] AI 로딩 메시지 ── */
const AI_LOADING_MESSAGES = [
  { text: 'AI가 최적의 일정을 산출하고 있습니다', icon: '🤖' },
  { text: '결혼 준비 일정을 분석 중이에요', icon: '📊' },
  { text: '맞춤 타임라인을 생성하고 있어요', icon: '✨' },
  { text: '중요도에 따라 우선순위를 정하는 중', icon: '📋' },
  { text: '최적의 일정 배치를 계산하고 있어요', icon: '🧮' },
];

function LoadingSkeleton() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [dots, setDots] = useState('');

  // 3초마다 메시지 순환
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % AI_LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // 점(.) 애니메이션 — 0.5초마다
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const current = AI_LOADING_MESSAGES[msgIndex];

  return (
    <div className="mt-4 space-y-5">
      {/* AI 로딩 메시지 영역 */}
      <div className="rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 border border-blue-100 p-5 text-center">
        {/* 아이콘 펄스 */}
        <div className="relative mx-auto w-14 h-14 mb-4 flex items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-blue-200/40 animate-ping" />
          <span className="relative text-3xl animate-bounce" style={{ animationDuration: '2s' }}>
            {current.icon}
          </span>
        </div>

        {/* 메시지 + 타이핑 dots */}
        <p className="text-sm font-semibold text-blue-800 transition-all duration-500">
          {current.text}{dots}
        </p>
        <p className="text-xs text-blue-500/80 mt-1.5">
          잠시만 기다려 주세요
        </p>

        {/* 프로그레스 바 */}
        <div className="mt-4 mx-auto max-w-[200px] h-1.5 rounded-full bg-blue-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500"
            style={{
              animation: 'loadingProgress 3s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      {/* 스켈레톤 — 콘텐츠 프리뷰 힌트 */}
      <div className="space-y-3 opacity-40">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-28 rounded bg-blue-100 animate-pulse" />
            <div className="rounded-lg border border-blue-50 p-3 space-y-1.5">
              <div className="h-3.5 w-3/4 rounded bg-blue-50 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-blue-50 animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* keyframes 인라인 스타일 */}
      <style>{`
        @keyframes loadingProgress {
          0%   { width: 5%; }
          50%  { width: 80%; }
          100% { width: 5%; }
        }
      `}</style>
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

/* ── [CL-TIMELINE-FALLBACK-20260403] 폴백 배너 ── */
function FallbackBanner({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 text-center animate-fade-up">
      <div className="text-2xl mb-2">💡</div>
      <p className="text-sm font-semibold text-amber-900 mb-1">
        기본 일정을 준비했어요
      </p>
      <p className="text-xs text-amber-700/80 mb-3">
        체크리스트 템플릿 기반의 일정이에요
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 active:scale-[0.97] transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI 맞춤 일정 받기
        </button>
      )}
    </div>
  );
}

/* ── Main Panel ── */
// [CL-TIMELINE-FALLBACK-20260403] isFallback 추가
export default function TimelinePanel({
  result,
  loading,
  error,
  isFallback = false,
  open,
  onOpenChange,
  onRetry,
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

          {/* [CL-TIMELINE-FALLBACK-20260403] 에러만 있고 결과 없을 때 — 레거시 호환 */}
          {error && !loading && !result && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
              <div className="text-3xl mb-3">😥</div>
              <p className="text-sm font-semibold text-red-800 mb-1">오류가 발생했어요</p>
              <p className="text-xs text-red-600/80 mb-4">{error}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
                >
                  <span>🔄</span>
                  다시 시도하기
                </button>
              )}
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

          {/* [CL-TIMELINE-FALLBACK-20260403] Result — 폴백이든 AI든 결과가 있으면 표시 */}
          {!loading && result && (
            <div className="space-y-3 animate-fade-up">
              {/* 폴백 배너 — AI 실패 시 대안 안내 */}
              {isFallback && <FallbackBanner onRetry={onRetry} />}

              {/* Summary header */}
              <div className={`rounded-lg p-4 text-white ${
                isFallback
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600'
              }`}>
                <p className="text-sm font-medium opacity-90">결혼식까지</p>
                <p className="text-2xl font-bold">D-{result.dday_count}</p>
                <p className="text-xs opacity-75 mt-1">
                  총 {result.timeline.length}개월 · {result.timeline.reduce((sum, m) => sum + m.tasks.length, 0)}개 할 일
                  {isFallback && ' · 기본 일정'}
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

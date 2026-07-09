// [AGENT-TEAM-9-20260307]
// [CL-AI-LOADING-MSG-20260308-201500] skeleton → AI 로딩 메시지
// [CL-TIMELINE-FALLBACK-20260403] Toss 스타일 폴백 UI
// [CL-CHECKUX-20260709-232512] AI 결과를 체크리스트에 '기한 적용'/'리스트에 추가' — 겉돌던 AI 실효화
import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AsyncButton } from '@/components/ui/async-button';
import { Sparkles, CalendarCheck, ListPlus, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { TimelineResult, TimelineMonth, TimelineTask } from '@/hooks/useTimelineOptimizer';
import type { TimelineApplyPlan, TimelineTaskDecision } from '@/lib/timeline-apply';
import type { ChecklistPeriod } from '@/lib/checklist-templates';

// [CL-TIMELINE-FALLBACK-20260403] isFallback prop 추가
// [CL-CHECKUX-20260709-232512] applyPlan/onApplyDueDate/onAddTask — 미전달 시 기존 조회 전용(회귀 0)
interface TimelinePanelProps {
  result: TimelineResult | null;
  loading: boolean;
  error: string | null;
  isFallback?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry?: () => void;
  /** matchTimelineToChecklist(result, items, weddingDate) 결과 — 부모(Checklist)에서 memo 계산 */
  applyPlan?: TimelineApplyPlan<TimelineTask> | null;
  /** 매치 항목 기한 적용(성공 boolean) */
  onApplyDueDate?: (itemId: string, dueDate: string) => Promise<boolean> | boolean | void;
  /** 무매치 task 를 내 리스트에 추가(성공 boolean) */
  onAddTask?: (
    title: string,
    period: ChecklistPeriod,
    dueDate: string
  ) => Promise<boolean> | boolean | void;
}

/** 적용 상태 로컬 키 — 같은 달의 같은 task 문구는 계획상 1개(중복은 plan 이 skip 처리) */
function taskKey(month: string, task: TimelineTask): string {
  return `${month}:${task.task}`;
}

function formatShortDue(due: string | null): string {
  if (!due) return '기한 없음';
  const d = new Date(`${due}T00:00:00`);
  if (Number.isNaN(d.getTime())) return due;
  return `${d.getMonth() + 1}/${d.getDate()}`;
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
  // [CL-TOP20-P0-20260703-002000] 15초 초과 시 안심 문구 — 타임아웃 무피드백 공백 해소(적대검증 #25)
  const [slow, setSlow] = useState(false);

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

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 15000);
    return () => clearTimeout(timer);
  }, []);

  const current = AI_LOADING_MESSAGES[msgIndex];

  return (
    <div className="mt-4 space-y-5">
      {/* AI 로딩 메시지 영역 */}
      {/* [CL-TOP20-R50-UI-20260703-094000] 하드코딩 blue 에 dark: 변형 추가(라이트 모습 불변) */}
      <div className="rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 dark:from-blue-950 dark:via-indigo-950 dark:to-blue-950 border border-blue-100 dark:border-blue-900 p-5 text-center">
        {/* 아이콘 펄스 */}
        <div className="relative mx-auto w-14 h-14 mb-4 flex items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-blue-200/40 dark:bg-blue-800/40 animate-ping" />
          <span className="relative text-3xl animate-bounce" style={{ animationDuration: '2s' }}>
            {current.icon}
          </span>
        </div>

        {/* 메시지 + 타이핑 dots */}
        <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 transition-all duration-500">
          {current.text}{dots}
        </p>
        <p className="text-xs text-blue-500/80 dark:text-blue-400/80 mt-1.5">
          {slow ? '평소보다 조금 오래 걸리고 있어요 — 곧 완성돼요' : '잠시만 기다려 주세요'}
        </p>

        {/* 프로그레스 바 */}
        <div className="mt-4 mx-auto max-w-[200px] h-1.5 rounded-full bg-blue-100 dark:bg-blue-900 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500"
            style={{
              animation: 'loadingProgress 3s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      {/* 스켈레톤 — 콘텐츠 프리뷰 힌트 */}
      {/* [CL-TOP20-R50-UI-20260703-094000] dark: 변형 추가 */}
      <div className="space-y-3 opacity-40">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-28 rounded bg-blue-100 dark:bg-blue-900 animate-pulse" />
            <div className="rounded-lg border border-blue-50 dark:border-blue-950 p-3 space-y-1.5">
              <div className="h-3.5 w-3/4 rounded bg-blue-50 dark:bg-blue-950 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-blue-50 dark:bg-blue-950 animate-pulse" />
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

/* ── [CL-CHECKUX-20260709-232512] task 별 적용 액션 행 ── */
function TaskActionRow({
  month,
  task,
  decision,
  appliedKind,
  onRun,
}: {
  month: string;
  task: TimelineTask;
  decision: TimelineTaskDecision | undefined;
  appliedKind: 'apply' | 'add' | undefined;
  onRun: (month: string, task: TimelineTask, decision: TimelineTaskDecision) => Promise<void>;
}) {
  // 이미 이 세션에서 적용/추가한 행 — 결정이 재계산돼도(기한 일치로 skip 전환) 완료 표기 유지
  if (appliedKind) {
    return (
      <div className="flex items-center gap-1 text-[11px] font-medium text-green-600 dark:text-green-400">
        <Check className="w-3.5 h-3.5" aria-hidden="true" />
        {appliedKind === 'apply' ? '적용됨 ✓' : '추가됨 ✓'}
      </div>
    );
  }
  if (!decision) return null;

  if (decision.kind === 'apply') {
    return (
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] text-gray-500 dark:text-gray-400">
          {formatShortDue(decision.oldDue)} → {formatShortDue(decision.newDue)} ·{' '}
          <span className="text-gray-700 dark:text-gray-300">{decision.title}</span>
        </span>
        <AsyncButton
          size="sm"
          variant="outline"
          className="min-h-11 md:min-h-0 md:h-7 text-xs px-2.5"
          onClick={() => onRun(month, task, decision)}
        >
          <CalendarCheck className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
          기한 적용
        </AsyncButton>
      </div>
    );
  }

  if (decision.kind === 'add') {
    return (
      <div className="flex items-center justify-end">
        <AsyncButton
          size="sm"
          variant="outline"
          className="min-h-11 md:min-h-0 md:h-7 text-xs px-2.5"
          onClick={() => onRun(month, task, decision)}
        >
          <ListPlus className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
          내 리스트에 추가
        </AsyncButton>
      </div>
    );
  }

  // skip — 사용자 액션 불필요 사유를 조용히 안내
  if (decision.reason === 'same-due') {
    return <p className="text-[11px] text-green-600/80 dark:text-green-400/80">내 체크리스트 기한과 일치 ✓</p>;
  }
  if (decision.reason === 'already-done') {
    return <p className="text-[11px] text-gray-400">이미 완료한 항목이에요</p>;
  }
  return null;
}

/* ── Collapsible month section ── */
function MonthSection({
  monthData,
  decisions,
  appliedKinds,
  onRun,
}: {
  monthData: TimelineMonth;
  // [CL-CHECKUX-20260709-232512] 적용 계획(없으면 기존 조회 전용 렌더)
  decisions?: Map<TimelineTask, TimelineTaskDecision>;
  appliedKinds: Map<string, 'apply' | 'add'>;
  onRun: (month: string, task: TimelineTask, decision: TimelineTaskDecision) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(true);

  // [CL-TOP20-R50-UI-20260703-094000] 하드코딩 blue/white/gray 에 dark: 변형 추가(라이트 모습 불변)
  return (
    <div className="border border-blue-100 dark:border-blue-900 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 hover:from-blue-100 hover:to-blue-150 dark:hover:from-blue-900 dark:hover:to-blue-800 transition-colors text-left"
      >
        <span className="font-semibold text-blue-800 dark:text-blue-200 text-sm">
          {formatMonth(monthData.month)}
        </span>
        <span className="text-blue-500 dark:text-blue-400 text-xs">
          {monthData.tasks.length}개 항목 {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div className="p-3 space-y-2 bg-white dark:bg-gray-950">
          {monthData.tasks.map((task, idx) => {
            const priority = PRIORITY_STYLES[task.priority];
            return (
              <Card key={idx} className="border-blue-50 dark:border-blue-950 shadow-sm">
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {task.task}
                    </span>
                    <Badge className={`shrink-0 text-[10px] px-1.5 py-0.5 ${priority.className}`}>
                      {priority.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {task.tip}
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                    <span>📌</span>
                    <span>{formatDeadline(task.deadline)}</span>
                  </div>
                  {/* [CL-CHECKUX-20260709-232512] 체크리스트 적용 액션 */}
                  {decisions && (
                    <TaskActionRow
                      month={monthData.month}
                      task={task}
                      decision={decisions.get(task)}
                      appliedKind={appliedKinds.get(taskKey(monthData.month, task))}
                      onRun={onRun}
                    />
                  )}
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
// [CL-CHECKUX-20260709-232512] 적용 계획 배선 — 개별 적용 + '모두 적용(n건)' 일괄 처리
export default function TimelinePanel({
  result,
  loading,
  error,
  isFallback = false,
  open,
  onOpenChange,
  onRetry,
  applyPlan,
  onApplyDueDate,
  onAddTask,
}: TimelinePanelProps) {
  const { toast } = useToast();
  // 이 세션에서 적용/추가 완료한 task — key `${month}:${task}` → 종류
  const [appliedKinds, setAppliedKinds] = useState<Map<string, 'apply' | 'add'>>(new Map());
  const [bulkBusy, setBulkBusy] = useState(false);

  // 새 결과가 오면 로컬 적용 상태 초기화(이전 결과의 '적용됨' 잔존 방지)
  useEffect(() => {
    setAppliedKinds(new Map());
  }, [result]);

  const canApply = !!applyPlan && (!!onApplyDueDate || !!onAddTask);

  const runDecision = async (decision: TimelineTaskDecision): Promise<boolean> => {
    if (decision.kind === 'apply') {
      if (!onApplyDueDate) return false;
      const ok = await Promise.resolve(onApplyDueDate(decision.itemId, decision.newDue));
      return ok !== false;
    }
    if (decision.kind === 'add') {
      if (!onAddTask) return false;
      const ok = await Promise.resolve(onAddTask(decision.title, decision.period, decision.deadline));
      return ok !== false;
    }
    return false;
  };

  const handleRunOne = async (
    month: string,
    task: TimelineTask,
    decision: TimelineTaskDecision
  ): Promise<void> => {
    const ok = await runDecision(decision);
    if (ok && (decision.kind === 'apply' || decision.kind === 'add')) {
      const kind = decision.kind;
      setAppliedKinds((prev) => new Map(prev).set(taskKey(month, task), kind));
    }
    // 실패는 useChecklist 가 destructive 토스트로 안내(무음실패 없음)
  };

  // 미처리(적용 가능·아직 안 누른) 결정 수집 — '모두 적용 (n건)'
  const pending: { month: string; task: TimelineTask; decision: TimelineTaskDecision }[] = [];
  if (canApply && result && applyPlan) {
    for (const monthData of result.timeline) {
      for (const task of monthData.tasks) {
        const decision = applyPlan.decisions.get(task);
        if (!decision || (decision.kind !== 'apply' && decision.kind !== 'add')) continue;
        if (appliedKinds.has(taskKey(monthData.month, task))) continue;
        pending.push({ month: monthData.month, task, decision });
      }
    }
  }

  const handleApplyAll = async (): Promise<void> => {
    if (bulkBusy || pending.length === 0) return;
    setBulkBusy(true);
    let applied = 0;
    let added = 0;
    let failed = 0;
    try {
      // 순차 적용 — sort_order 계산·낙관적 상태가 경쟁하지 않도록 직렬화
      for (const { month, task, decision } of pending) {
        const ok = await runDecision(decision);
        if (ok && (decision.kind === 'apply' || decision.kind === 'add')) {
          const kind = decision.kind;
          if (kind === 'apply') applied++;
          else added++;
          setAppliedKinds((prev) => new Map(prev).set(taskKey(month, task), kind));
        } else {
          failed++;
        }
      }
      toast({
        title: 'AI 일정이 체크리스트에 반영되었어요',
        description: `기한 적용 ${applied}건 · 새 항목 ${added}건${failed > 0 ? ` · 실패 ${failed}건` : ''}`,
        variant: failed > 0 && applied + added === 0 ? 'destructive' : undefined,
      });
    } finally {
      setBulkBusy(false);
    }
  };

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
          {/* [CL-CHECKUX-20260709-232512] a11y — Radix DialogContent 설명 경고 해소(sr-only 컨벤션) */}
          <SheetDescription className="sr-only">
            AI가 산출한 월별 결혼 준비 일정과 체크리스트 기한 적용 액션
          </SheetDescription>
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

              {/* [CL-CHECKUX-20260709-232512] 모두 적용 — 파괴적이지 않지만 다건 일괄이라 확인 다이얼로그 */}
              {canApply && pending.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      className="w-full min-h-11 md:min-h-0"
                      disabled={bulkBusy}
                      aria-busy={bulkBusy || undefined}
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                      {bulkBusy ? '적용 중…' : `모두 적용 (${pending.length}건)`}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>AI 일정을 한 번에 반영할까요?</AlertDialogTitle>
                      <AlertDialogDescription>
                        기한 변경 {pending.filter((p) => p.decision.kind === 'apply').length}건, 새 항목 추가{' '}
                        {pending.filter((p) => p.decision.kind === 'add').length}건이 내 체크리스트에
                        반영돼요. 기한은 항목별로 언제든 다시 바꿀 수 있어요.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void handleApplyAll()}>
                        모두 적용
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {/* Monthly sections */}
              <div className="space-y-2">
                {result.timeline.map((monthData) => (
                  <MonthSection
                    key={monthData.month}
                    monthData={monthData}
                    decisions={canApply ? applyPlan?.decisions : undefined}
                    appliedKinds={appliedKinds}
                    onRun={handleRunOne}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

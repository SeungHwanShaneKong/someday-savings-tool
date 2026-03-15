import { useState, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useSEO } from '@/hooks/useSEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// [CL-AI-HIERARCHY-20260308-163000]
import { ArrowLeft, Plus, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useChecklist } from '@/hooks/useChecklist';
// [AGENT-TEAM-9-20260307] P2 일정 최적화 에이전트
import { useTimelineOptimizer } from '@/hooks/useTimelineOptimizer';
import TimelinePanel from '@/components/planning/TimelinePanel';
import { ChecklistProgress } from '@/components/checklist/ChecklistProgress';
import { ChecklistPeriodSection } from '@/components/checklist/ChecklistPeriodSection';
import { NudgeBanner } from '@/components/checklist/NudgeBanner';
import { PraiseModal } from '@/components/checklist/PraiseModal';
import { BudgetLinkPrompt } from '@/components/checklist/BudgetLinkPrompt';
import { PERIOD_ORDER, PERIOD_LABELS, type ChecklistPeriod } from '@/lib/checklist-templates';

export default function Checklist() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useSEO({
    title: 'D-day 체크리스트 AI - 웨딩셈',
    description: '결혼 준비 체크리스트로 일정별 할 일을 관리하세요. D-365부터 D-Day까지 시기별 준비 사항 안내.',
    path: '/checklist',
  });

  // [DDAY-INLINE-PICKER-2026-03-07] updateWeddingDate 추가 — NudgeBanner 인라인 날짜 선택용
  // [CL-TIMELINE-FIX-20260308-203000] weddingDate 추가 — AI 일정 최적화에 실제 결혼 날짜 전달
  const {
    items,
    loading,
    stats,
    activePeriod,
    praiseEvent,
    setPraiseEvent,
    toggleItem,
    addCustomItem,
    deleteItem,
    updateNotes,
    updateWeddingDate,
    hasWeddingDate,
    weddingDate,
  } = useChecklist();

  // [AGENT-TEAM-9-20260307] P2 일정 최적화 에이전트
  // [CL-TIMELINE-FIX-20260308-203000] retry 추가
  const { result: timelineResult, loading: timelineLoading, error: timelineError, optimize: optimizeTimeline, retry: retryTimeline } = useTimelineOptimizer();
  const [timelineOpen, setTimelineOpen] = useState(false);

  // Add custom item state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemPeriod, setNewItemPeriod] = useState<ChecklistPeriod>(
    activePeriod || 'D-12~10m'
  );

  // Budget link state
  const [budgetLinkOpen, setBudgetLinkOpen] = useState(false);
  const [budgetLinkCategory, setBudgetLinkCategory] = useState('');
  const [budgetLinkSubCategory, setBudgetLinkSubCategory] = useState('');

  const handleAddItem = useCallback(() => {
    if (newItemTitle.trim()) {
      addCustomItem(newItemTitle.trim(), newItemPeriod);
      setNewItemTitle('');
      setShowAddForm(false);
    }
  }, [newItemTitle, newItemPeriod, addCustomItem]);

  const handleBudgetLink = useCallback(
    (categoryLink: string, subCategoryLink: string) => {
      setBudgetLinkCategory(categoryLink);
      setBudgetLinkSubCategory(subCategoryLink);
      setBudgetLinkOpen(true);
    },
    []
  );

  const handleSaveAmount = useCallback(
    (_categoryId: string, _subCategoryId: string, _amount: number) => {
      // Navigate to budget page with pre-filled data
      navigate(`/budget?focus=${_categoryId}&sub=${_subCategoryId}&amount=${_amount}`);
    },
    [navigate]
  );

  // Auth redirect
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg sm:max-w-2xl lg:max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/')} /* [CL-HOME-BTN-20260315-140000] */
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="홈으로"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            <h1 className="text-base sm:text-lg font-semibold text-foreground">
              D-day 체크리스트 AI
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setShowAddForm(!showAddForm)}
            aria-label="새 항목 추가"
          >
            <Plus className="w-4 h-4 mr-1" />
            추가
          </Button>
        </div>
      </header>

      <main className="max-w-lg sm:max-w-2xl lg:max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 pb-24 space-y-5 sm:space-y-6">
        {/* Loading state — Skeleton UI */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <Skeleton className="h-6 w-1/3 rounded-lg" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {/* [DDAY-INLINE-PICKER-2026-03-07] No D-day nudge — 인라인 날짜 선택기 */}
        {!loading && !hasWeddingDate && (
          <NudgeBanner
            type="no-dday"
            onSave={async (date, time) => {
              await updateWeddingDate(date, time);
            }}
            actionLabel="D-day 설정하기"
          />
        )}

        {/* Progress */}
        {!loading && items.length > 0 && <ChecklistProgress stats={stats} />}

        {/* [AGENT-TEAM-9-20260307] P2 AI 일정 최적화 버튼 */}
        {/* [CL-TIMELINE-FIX-20260308-203000] items[0].due_date → 실제 weddingDate 사용 */}
        {!loading && hasWeddingDate && items.length > 0 && (
          <button
            onClick={() => {
              const completedItems = items.filter(i => i.is_completed).map(i => i.title);
              if (weddingDate) {
                optimizeTimeline(weddingDate, completedItems);
                setTimelineOpen(true);
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-3 sm:py-3.5 px-4 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 text-sm sm:text-base font-medium hover:from-blue-100 hover:to-indigo-100 transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            AI 일정 최적화
          </button>
        )}

        {/* Add custom item form */}
        {showAddForm && (
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-semibold">새 항목 추가</h3>
            <Input
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              placeholder="할 일을 입력하세요"
              className="h-10"
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            />
            <Select
              value={newItemPeriod}
              onValueChange={(v) => setNewItemPeriod(v as ChecklistPeriod)}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_ORDER.map((period) => (
                  <SelectItem key={period} value={period}>
                    {PERIOD_LABELS[period]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowAddForm(false)}
              >
                취소
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={handleAddItem}
                disabled={!newItemTitle.trim()}
              >
                추가
              </Button>
            </div>
          </div>
        )}

        {/* Empty state (has D-day but no items yet — will auto-generate) */}
        {!loading && hasWeddingDate && items.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-lg font-semibold text-foreground">
              체크리스트 준비 중...
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              D-day에 맞춰 자동으로 생성됩니다
            </p>
          </div>
        )}

        {/* Incomplete nudge */}
        {!loading && items.length > 0 && stats.percentage < 30 && (
          <NudgeBanner type="incomplete" />
        )}

        {/* Period sections — staggered animation, 2-col grid on desktop */}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            {(() => {
              let visibleIndex = 0;
              return PERIOD_ORDER.map((period) => {
                const periodItems = items.filter((i) => i.period === period);
                if (periodItems.length === 0) return null;

                const idx = visibleIndex++;
                return (
                  <div
                    key={period}
                    className="animate-fade-up"
                    style={{ animationDelay: `${idx * 0.08}s` }}
                  >
                    <ChecklistPeriodSection
                      period={period}
                      items={periodItems}
                      isActive={period === activePeriod}
                      onToggle={toggleItem}
                      onDelete={deleteItem}
                      onUpdateNotes={updateNotes}
                      onBudgetLink={handleBudgetLink}
                    />
                  </div>
                );
              });
            })()}
          </div>
        )}
      </main>

      {/* Praise Modal */}
      {praiseEvent && (
        <PraiseModal
          open={!!praiseEvent}
          onClose={() => setPraiseEvent(null)}
          emoji={praiseEvent.emoji}
          title={praiseEvent.title}
          description={praiseEvent.description}
        />
      )}

      {/* Budget Link Prompt */}
      <BudgetLinkPrompt
        open={budgetLinkOpen}
        onClose={() => setBudgetLinkOpen(false)}
        categoryLink={budgetLinkCategory}
        subCategoryLink={budgetLinkSubCategory}
        onSaveAmount={handleSaveAmount}
      />

      {/* [AGENT-TEAM-9-20260307] P2 일정 최적화 패널 */}
      {/* [CL-TIMELINE-FIX-20260308-203000] onRetry 추가 */}
      <TimelinePanel
        open={timelineOpen}
        onOpenChange={setTimelineOpen}
        result={timelineResult}
        loading={timelineLoading}
        error={timelineError}
        onRetry={retryTimeline}
      />
    </div>
  );
}

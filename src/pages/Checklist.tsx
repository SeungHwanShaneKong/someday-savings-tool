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
import { ArrowLeft, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useChecklist } from '@/hooks/useChecklist';
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
    title: '체크리스트 - 웨딩셈',
    description: '결혼 준비 체크리스트로 일정별 할 일을 관리하세요. D-365부터 D-Day까지 시기별 준비 사항 안내.',
    path: '/checklist',
  });

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
    hasWeddingDate,
  } = useChecklist();

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
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <button
            onClick={() => navigate('/budget')}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="체크리스트 나가기"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground">
            D-day 체크리스트
          </h1>
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

      <main className="max-w-lg mx-auto px-4 py-5 pb-24 space-y-5">
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

        {/* No D-day nudge */}
        {!loading && !hasWeddingDate && (
          <NudgeBanner
            type="no-dday"
            onAction={() => navigate('/budget')}
            actionLabel="D-day 설정하기"
          />
        )}

        {/* Progress */}
        {!loading && items.length > 0 && <ChecklistProgress stats={stats} />}

        {/* Add custom item form */}
        {showAddForm && (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
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

        {/* Period sections — staggered animation */}
        {!loading &&
          items.length > 0 &&
          (() => {
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
    </div>
  );
}

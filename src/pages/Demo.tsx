// [CL-TOP20-P1-DEMO-20260703-010000] 게스트 체험 모드 /demo — Top 20 로드맵 P1(#1).
//
// 익명 방문자가 가입 없이 샘플 결혼 예산(서울·하객 300명·약 2억)을 실제 앱과 동일한
// BudgetTable 로 조작해 보는 페이지.
//  - DB 접근 0: 모든 핸들러는 로컬 state + sessionStorage(src/lib/demo-budget.ts) 배선.
//  - BudgetTable 재사용 근거: 의존 그래프(useCategoryOrder=localStorage 전용,
//    AverageCostTooltip·editor-label·external-links=순수)에 supabase/auth 부작용 0.
//  - 계측: demo_start(진입 1회) → demo_interact(첫 금액 수정) → demo_convert_click(가입 CTA).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, RotateCcw, Sparkles, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { BudgetTable, type CostSplitType, type ExtendedBudgetItem } from '@/components/BudgetTable';
import Footer from '@/components/Footer';
import { useSEO } from '@/hooks/useSEO';
import { formatKoreanWon } from '@/lib/budget-categories';
import { trackFunnel, trackFunnelOnce } from '@/lib/analytics/funnel-events';
import {
  addDemoCustomItem,
  deleteDemoItem,
  getDemoPaidStats,
  getDemoTotal,
  loadDemoBudget,
  renameDemoItem,
  resetDemoBudget,
  saveDemoBudget,
  toggleDemoPaid,
  updateDemoAmount,
  updateDemoCostSplit,
  updateDemoNotes,
} from '@/lib/demo-budget';

export default function Demo() {
  const navigate = useNavigate();

  useSEO({
    title: '결혼 예산 체험하기 - 가입 없이 써보는 결혼 예산 계산기 | 웨딩셈',
    description:
      '가입 없이 서울·하객 300명 기준 샘플 결혼 예산(약 2억 원)을 직접 수정해 보세요. 카테고리별 비용 입력, 결제 완료 체크, 자동 합계까지 실제 웨딩셈 그대로 체험할 수 있어요.',
    path: '/demo',
  });

  // sessionStorage 복원(손상 시 기본 샘플 폴백) — 렌더당 1회 lazy init
  const [items, setItems] = useState<ExtendedBudgetItem[]>(() => loadDemoBudget());

  // 진입 계측(세션 1회)
  useEffect(() => {
    trackFunnelOnce('demo_start');
  }, []);

  // 변경분 영속 — 실패는 무음(체험 UX 비차단)
  useEffect(() => {
    saveDemoBudget(items);
  }, [items]);

  const total = useMemo(() => getDemoTotal(items), [items]);
  const paidStats = useMemo(() => getDemoPaidStats(items), [items]);

  /* ─── BudgetTable 핸들러: 전부 로컬 state 배선(DB 0) ─── */
  const handleAmountChange = useCallback(
    (category: string, subCategory: string, amount: number, unitPrice?: number, quantity?: number) => {
      const current = items.find(
        (item) => item.category === category && item.sub_category === subCategory,
      );
      // 실제 값이 바뀐 첫 수정만 계측(클릭 후 무변경 blur 는 제외)
      if (!current || current.amount !== amount) {
        trackFunnelOnce('demo_interact');
      }
      setItems((prev) => updateDemoAmount(prev, category, subCategory, amount, unitPrice, quantity));
    },
    [items],
  );

  const handleTogglePaid = useCallback((itemId: string) => {
    setItems((prev) => toggleDemoPaid(prev, itemId));
  }, []);

  const handleNotesChange = useCallback((itemId: string, notes: string) => {
    setItems((prev) => updateDemoNotes(prev, itemId, notes));
  }, []);

  const handleRenameItem = useCallback((itemId: string, newName: string) => {
    setItems((prev) => renameDemoItem(prev, itemId, newName));
  }, []);

  const handleAddCustomItem = useCallback((categoryId: string, name: string) => {
    setItems((prev) => addDemoCustomItem(prev, categoryId, name));
  }, []);

  const handleDeleteItem = useCallback((itemId: string) => {
    setItems((prev) => deleteDemoItem(prev, itemId));
  }, []);

  const handleCostSplitChange = useCallback((itemId: string, costSplit: CostSplitType) => {
    setItems((prev) => updateDemoCostSplit(prev, itemId, costSplit));
  }, []);

  const handleReset = useCallback(() => {
    setItems(resetDemoBudget());
  }, []);

  /* ─── 가입 전환 CTA — 출처(from)별 계측 후 /auth 이동 ─── */
  const handleConvert = useCallback(
    (from: string) => {
      trackFunnel('demo_convert_click', { from });
      navigate('/auth');
    },
    [navigate],
  );

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* 스티키 헤더 + 합계 바 (BudgetFlow 와 동일 셸: backdrop-blur·border) */}
      <header className="sticky top-0 bg-background/80 backdrop-blur-lg z-30 border-b border-border/50">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="rounded-full h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
                aria-label="홈으로 돌아가기"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base sm:text-xl font-bold truncate">결혼 예산 체험하기</h1>
                  <span className="text-[10px] sm:text-xs font-semibold text-primary bg-primary/10 border border-primary/30 px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">
                    체험 모드
                  </span>
                </div>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  서울 · 하객 300명 기준 샘플 예산
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/50"
                    aria-label="샘플 예산 초기화"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span className="hidden sm:inline">초기화</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>샘플 예산을 처음 상태로 되돌릴까요?</AlertDialogTitle>
                    <AlertDialogDescription>
                      체험하며 수정한 내용이 모두 사라지고 기본 샘플 값으로 돌아갑니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleReset}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      되돌리기
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button size="sm" onClick={() => handleConvert('header')} className="gap-1">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">무료 가입</span>
                <span className="sm:hidden">가입</span>
              </Button>
            </div>
          </div>

          {/* 합계 스티키 바: 총액 + 결제 완료율 */}
          <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-secondary/60 px-3 py-2">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-xs text-muted-foreground flex-shrink-0">총 예산</span>
              <span
                data-testid="demo-total"
                className="text-sm sm:text-lg font-bold text-primary truncate"
              >
                ₩{total.toLocaleString()}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">
                ({formatKoreanWon(total)})
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div
                className="w-16 sm:w-28 h-1.5 rounded-full bg-muted overflow-hidden"
                aria-hidden="true"
              >
                <div
                  className="h-full bg-success rounded-full transition-all duration-300"
                  style={{ width: `${paidStats.completionRate}%` }}
                />
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                결제 완료 {paidStats.paidCount}/{paidStats.totalCount} · {paidStats.completionRate}%
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* 상단 안내 배너 */}
        <section
          aria-label="체험 모드 안내"
          className="mb-4 sm:mb-6 rounded-xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div
                className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0"
                aria-hidden="true"
              >
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm sm:text-base">
                  지금은 체험 모드예요 — 마음껏 수정해 보세요
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  서울, 하객 300명 기준 샘플 예산(약 2억 원)입니다. 금액 수정·결제 완료 체크·항목
                  추가 모두 가능해요. 변경 내용은 이 브라우저에만 잠시 보관되고, 계속 저장하려면
                  무료 가입이 필요해요.
                </p>
              </div>
            </div>
            <Button
              onClick={() => handleConvert('banner')}
              className="gap-1.5 flex-shrink-0 w-full sm:w-auto"
            >
              무료 가입하고 저장하기
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </section>

        {/* 실제 앱과 동일한 예산 테이블 — 모든 핸들러 로컬 배선, 편집자 라벨은 개인 체험이므로 비표시 */}
        <BudgetTable
          items={items}
          onAmountChange={handleAmountChange}
          onTogglePaid={handleTogglePaid}
          onNotesChange={handleNotesChange}
          onRenameItem={handleRenameItem}
          onAddCustomItem={handleAddCustomItem}
          onDeleteItem={handleDeleteItem}
          onCostSplitChange={handleCostSplitChange}
          showEditorLabels={false}
        />

        {/* 하단 가입 전환 CTA 카드 (BudgetFlow 하단 카드와 동일 톤) */}
        <section
          aria-label="무료 가입 안내"
          className="mt-6 sm:mt-8 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-6 text-center"
        >
          <h2 className="text-lg sm:text-xl font-bold">이 예산, 내 결혼 준비로 이어가 볼까요?</h2>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xl mx-auto">
            무료 가입하면 예산이 자동 저장되고, 예비 배우자와의 공동 편집, D-day 체크리스트, AI
            상담까지 모두 쓸 수 있어요.
          </p>
          <Button size="lg" onClick={() => handleConvert('bottom_card')} className="mt-4 gap-1.5">
            내 예산 만들기
            <ArrowRight className="w-4 h-4" />
          </Button>
        </section>
      </main>

      <Footer />
    </div>
  );
}

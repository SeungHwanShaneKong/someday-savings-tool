import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSEO } from '@/hooks/useSEO';
import { supabase } from '@/integrations/supabase/client';
import { BudgetDonutChart } from '@/components/BudgetDonutChart';
import { BUDGET_CATEGORIES, formatKoreanWon } from '@/lib/budget-categories';
import { Button } from '@/components/ui/button';
import { Home, Lock, Sparkles, ArrowLeft } from 'lucide-react'; // [CL-HOME-BTN-20260315-140000]
import { useAuth } from '@/hooks/useAuth';

interface BudgetItem {
  id: string;
  budget_id: string;
  category: string;
  sub_category: string;
  amount: number;
  is_paid: boolean;
  notes: string | null;
}

interface SharedBudgetData {
  items: BudgetItem[];
  budgetOwnerId: string | null;
}

export default function SharedBudget() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<SharedBudgetData>({ items: [], budgetOwnerId: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSEO({
    title: '공유 예산표 - 웨딩셈',
    description: '공유된 결혼 예산표를 확인하세요. 항목별 비용과 총 예산을 한눈에 볼 수 있습니다.',
    path: `/shared/${token || ''}`,
  });

  const isOwner = user && data.budgetOwnerId && user.id === data.budgetOwnerId;

  useEffect(() => {
    const fetchSharedBudget = async () => {
      if (!token) {
        setError('잘못된 링크예요');
        setLoading(false);
        return;
      }

      try {
        // Get the shared budget items using secure RPC function
        // This function bypasses RLS and returns items for valid share tokens
        const { data: budgetItems, error: itemsError } = await supabase
          .rpc('get_shared_budget_items_by_token', { p_share_token: token });

        if (itemsError) throw itemsError;
        
        if (!budgetItems || budgetItems.length === 0) {
          setError('공유 링크가 만료되었거나 존재하지 않아요');
          setLoading(false);
          return;
        }

        // Map the RPC response to match BudgetItem interface
        const mappedItems: BudgetItem[] = budgetItems.map((item: any) => ({
          id: `${item.budget_id}-${item.sub_category}`,
          budget_id: item.budget_id,
          category: item.category,
          sub_category: item.sub_category,
          amount: item.amount,
          is_paid: item.is_paid,
          notes: item.notes,
        }));

        setData({
          items: mappedItems,
          budgetOwnerId: budgetItems[0]?.budget_owner_id || null,
        });
      } catch (err: any) {
        setError(err.message || '데이터를 불러오는 중 오류가 발생했어요');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedBudget();
  }, [token]);

  const total = data.items.reduce((sum, item) => sum + item.amount, 0);
  const getCategoryTotal = (categoryId: string) => 
    data.items.filter(item => item.category === categoryId).reduce((sum, item) => sum + item.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">📊</div>
          <div className="text-muted-foreground">예산 정보를 불러오고 있어요...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
        <div className="text-center">
          <span className="text-5xl mb-4 block">😢</span>
          <h1 className="text-heading text-foreground mb-2">앗, 문제가 생겼어요</h1>
          <p className="text-body text-muted-foreground mb-8">{error}</p>
          <Button onClick={() => navigate('/')} className="gap-2">
            <Home className="h-4 w-4" />
            홈으로 가기
          </Button>
        </div>
      </div>
    );
  }

  // Non-owner view: Static snapshot with conversion banner
  if (!isOwner) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Conversion Banner */}
        <div className="bg-primary text-primary-foreground px-4 py-3">
          <div className="max-w-[400px] mx-auto flex items-center gap-3">
            <Sparkles className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              더 상세한 예산 관리를 원하시면 웨딩셈에 가입하세요
            </p>
          </div>
        </div>

        {/* Header — [CL-HOME-BTN-20260315-140000] */}
        <header className="px-4 py-5">
          <button onClick={() => navigate('/')} className="p-2 -ml-2 mb-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="홈으로">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-foreground">공유된 결혼 예산</h1>
            <p className="text-xs text-muted-foreground mt-1">웨딩셈으로 작성되었어요</p>
          </div>
        </header>

        {/* Main content - Slim vertical card */}
        <main className="flex-1 px-4 pb-6">
          <div className="max-w-[400px] mx-auto w-full">
            {/* Static snapshot indicator */}
            <div className="flex items-center justify-center gap-2 mb-4 text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              <span className="text-xs">읽기 전용 스냅샷</span>
            </div>

            <div className="bg-card rounded-2xl shadow-lg p-5 pointer-events-none select-none">
              {/* Donut chart - smaller for slim layout */}
              <div className="scale-90 origin-top">
                <BudgetDonutChart items={data.items} />
              </div>

              {/* Category breakdown - vertical stacking */}
              <div className="mt-6 space-y-2">
                {BUDGET_CATEGORIES.map(category => {
                  const categoryTotal = getCategoryTotal(category.id);
                  if (categoryTotal === 0) return null;
                  
                  const percentage = total > 0 ? Math.round((categoryTotal / total) * 100) : 0;
                  
                  return (
                    <div 
                      key={category.id}
                      className="flex items-center justify-between p-2.5 bg-secondary/50 rounded-xl"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{category.icon}</span>
                        <span className="text-sm font-medium">{category.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold">{formatKoreanWon(categoryTotal)}</span>
                        <span className="text-xs text-muted-foreground ml-1.5">({percentage}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total */}
              <div className="mt-5 p-3.5 bg-primary/10 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-primary">총 예상 비용</span>
                  <span className="text-lg font-bold text-primary">{formatKoreanWon(total)}</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground mb-3">
                나도 결혼 예산을 정리해볼까요?
              </p>
              <Button onClick={() => navigate('/')} size="sm" className="gap-2">
                <Sparkles className="h-4 w-4" />
                무료로 시작하기
              </Button>
            </div>
          </div>
        </main>

        {/* Fixed CTA Footer */}
        <footer className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border py-3 px-4">
          <p className="text-center text-xs text-muted-foreground">
            네이버나 구글에서 '<span className="font-semibold text-primary">웨딩셈</span>'을 검색해 보세요.
          </p>
        </footer>
      </div>
    );
  }

  // Owner view: Full interactive page (existing design but slimmer)
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header — [CL-HOME-BTN-20260315-140000] */}
      <header className="px-4 py-5">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 mb-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="홈으로">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-foreground">공유된 결혼 예산</h1>
          <p className="text-xs text-muted-foreground mt-1">웨딩셈으로 작성되었어요</p>
        </div>
      </header>

      {/* Main content - Slim vertical card */}
      <main className="flex-1 px-4 pb-6">
        <div className="max-w-[400px] mx-auto w-full">
          <div className="bg-card rounded-2xl shadow-lg p-5">
            {/* Donut chart - smaller for slim layout */}
            <div className="scale-90 origin-top">
              <BudgetDonutChart items={data.items} />
            </div>

            {/* Category breakdown - vertical stacking */}
            <div className="mt-6 space-y-2">
              {BUDGET_CATEGORIES.map(category => {
                const categoryTotal = getCategoryTotal(category.id);
                if (categoryTotal === 0) return null;
                
                const percentage = total > 0 ? Math.round((categoryTotal / total) * 100) : 0;
                
                return (
                  <div 
                    key={category.id}
                    className="flex items-center justify-between p-2.5 bg-secondary/50 rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{category.icon}</span>
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">{formatKoreanWon(categoryTotal)}</span>
                      <span className="text-xs text-muted-foreground ml-1.5">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="mt-5 p-3.5 bg-primary/10 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-primary">총 예상 비용</span>
                <span className="text-lg font-bold text-primary">{formatKoreanWon(total)}</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-6 text-center">
            <Button onClick={() => navigate('/summary')} variant="outline" size="sm" className="gap-2">
              <Home className="h-4 w-4" />
              내 대시보드로 가기
            </Button>
          </div>
        </div>
      </main>

      {/* Fixed CTA Footer */}
      <footer className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border py-3 px-4">
        <p className="text-center text-xs text-muted-foreground">
          네이버나 구글에서 '<span className="font-semibold text-primary">웨딩셈</span>'을 검색해 보세요.
        </p>
      </footer>
    </div>
  );
}

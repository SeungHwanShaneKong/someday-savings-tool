import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { BudgetDonutChart } from '@/components/BudgetDonutChart';
import { BUDGET_CATEGORIES, formatKoreanWon } from '@/lib/budget-categories';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

interface BudgetItem {
  id: string;
  budget_id: string;
  category: string;
  sub_category: string;
  amount: number;
  is_paid: boolean;
  notes: string | null;
}

export default function SharedBudget() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedBudget = async () => {
      if (!token) {
        setError('잘못된 링크예요');
        setLoading(false);
        return;
      }

      try {
        // Get the shared budget using secure RPC function
        const { data: sharedBudgetData, error: shareError } = await supabase
          .rpc('get_shared_budget_by_token', { p_share_token: token });

        if (shareError) throw shareError;
        
        // The function returns an array, get the first result
        const sharedBudget = sharedBudgetData && sharedBudgetData.length > 0 ? sharedBudgetData[0] : null;
        
        if (!sharedBudget) {
          setError('공유 링크가 만료되었거나 존재하지 않아요');
          setLoading(false);
          return;
        }

        // Get the budget items
        const { data: budgetItems, error: itemsError } = await supabase
          .from('budget_items')
          .select('*')
          .eq('budget_id', sharedBudget.budget_id);

        if (itemsError) throw itemsError;
        setItems(budgetItems || []);
      } catch (err: any) {
        setError(err.message || '데이터를 불러오는 중 오류가 발생했어요');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedBudget();
  }, [token]);

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const getCategoryTotal = (categoryId: string) => 
    items.filter(item => item.category === categoryId).reduce((sum, item) => sum + item.amount, 0);

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-4 py-6 text-center">
        <h1 className="text-heading text-foreground">공유된 결혼 예산</h1>
        <p className="text-caption text-muted-foreground mt-1">웨딩셈으로 작성되었어요</p>
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 pb-8 max-w-lg mx-auto w-full">
        <div className="bg-card rounded-2xl shadow-toss-lg p-6">
          {/* Donut chart */}
          <BudgetDonutChart items={items} />

          {/* Category breakdown */}
          <div className="mt-8 space-y-3">
            {BUDGET_CATEGORIES.map(category => {
              const categoryTotal = getCategoryTotal(category.id);
              if (categoryTotal === 0) return null;
              
              const percentage = total > 0 ? Math.round((categoryTotal / total) * 100) : 0;
              
              return (
                <div 
                  key={category.id}
                  className="flex items-center justify-between p-3 bg-secondary rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{category.icon}</span>
                    <span className="text-body font-medium">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-body font-semibold">{formatKoreanWon(categoryTotal)}</span>
                    <span className="text-caption text-muted-foreground ml-2">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="mt-6 p-4 bg-primary/10 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-body-lg font-medium text-primary">총 예상 비용</span>
              <span className="text-heading font-bold text-primary">{formatKoreanWon(total)}</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-caption text-muted-foreground mb-4">
            나도 결혼 예산을 정리해볼까요?
          </p>
          <Button onClick={() => navigate('/')} className="gap-2">
            <Home className="h-4 w-4" />
            시작하기
          </Button>
        </div>
      </main>

      {/* Fixed CTA Footer */}
      <footer className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border py-4 px-6">
        <p className="text-center text-small text-muted-foreground">
          네이버나 구글에서 '<span className="font-semibold text-primary">웨딩셈</span>'을 검색해 보세요.
        </p>
      </footer>
    </div>
  );
}
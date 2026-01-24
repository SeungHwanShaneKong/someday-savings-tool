import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBudget } from '@/hooks/useBudget';
import { ChecklistItem } from '@/components/ChecklistItem';
import { formatKoreanWon } from '@/lib/budget-categories';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3 } from 'lucide-react';

export default function Checklist() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { 
    items, 
    loading: budgetLoading, 
    togglePaid, 
    getTotal,
    getPaidTotal,
    getPendingTotal 
  } = useBudget();

  // Filter items with amounts
  const itemsWithAmount = items.filter(item => item.amount > 0);
  const paidItems = itemsWithAmount.filter(item => item.is_paid);
  const pendingItems = itemsWithAmount.filter(item => !item.is_paid);

  const total = getTotal();
  const paidTotal = getPaidTotal();
  const pendingTotal = getPendingTotal();
  const progressPercentage = total > 0 ? Math.round((paidTotal / total) * 100) : 0;

  // Auth check
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // Loading state
  if (authLoading || budgetLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">✅</div>
          <div className="text-muted-foreground">체크리스트를 불러오고 있어요...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-background/80 backdrop-blur-lg z-40 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/summary')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-subheading font-semibold">결제 체크리스트</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/summary')}
            className="rounded-full"
          >
            <BarChart3 className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Progress overview */}
      <div className="px-6 py-4 max-w-lg mx-auto w-full">
        <div className="bg-card rounded-2xl shadow-toss p-6 mb-6">
          <div className="text-center mb-4">
            <span className="text-display font-bold text-primary">{progressPercentage}%</span>
            <p className="text-body text-muted-foreground">결제 완료</p>
          </div>
          
          {/* Progress bar */}
          <div className="h-3 bg-secondary rounded-full overflow-hidden mb-6">
            <div 
              className="h-full bg-success rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-success/10 rounded-xl">
              <p className="text-small text-success font-medium">결제 완료</p>
              <p className="text-body-lg font-semibold text-success">{formatKoreanWon(paidTotal)}</p>
            </div>
            <div className="text-center p-3 bg-warning/10 rounded-xl">
              <p className="text-small text-warning font-medium">결제 예정</p>
              <p className="text-body-lg font-semibold text-warning">{formatKoreanWon(pendingTotal)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <main className="flex-1 px-6 pb-8 max-w-lg mx-auto w-full">
        {itemsWithAmount.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl mb-4 block">📝</span>
            <p className="text-body text-muted-foreground">아직 입력된 항목이 없어요</p>
            <Button
              onClick={() => navigate('/budget')}
              variant="outline"
              className="mt-4"
            >
              예산 입력하러 가기
            </Button>
          </div>
        ) : (
          <>
            {/* Pending items */}
            {pendingItems.length > 0 && (
              <div className="mb-6">
                <h2 className="text-body font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="text-warning">●</span>
                  결제 예정
                  <span className="text-caption text-muted-foreground">({pendingItems.length})</span>
                </h2>
                <div className="space-y-3">
                  {pendingItems.map(item => (
                    <ChecklistItem
                      key={item.id}
                      item={item}
                      onToggle={() => togglePaid(item.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Paid items */}
            {paidItems.length > 0 && (
              <div>
                <h2 className="text-body font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="text-success">●</span>
                  결제 완료
                  <span className="text-caption text-muted-foreground">({paidItems.length})</span>
                </h2>
                <div className="space-y-3">
                  {paidItems.map(item => (
                    <ChecklistItem
                      key={item.id}
                      item={item}
                      onToggle={() => togglePaid(item.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

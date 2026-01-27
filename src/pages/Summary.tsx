import { useState, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMultipleBudgets } from '@/hooks/useMultipleBudgets';
import { BudgetDonutChart } from '@/components/BudgetDonutChart';
import { BUDGET_CATEGORIES, formatKoreanWon } from '@/lib/budget-categories';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  ClipboardList,
  Check,
  Link as LinkIcon,
  TrendingDown,
  TrendingUp,
  Minus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LogoutButton } from '@/components/LogoutButton';
import { supabase } from '@/integrations/supabase/client';
import html2canvas from 'html2canvas';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { COST_SPLIT_OPTIONS, CostSplitType } from '@/components/BudgetTable';

const CHART_COLORS = [
  'hsl(213, 100%, 50%)',
  'hsl(145, 65%, 42%)',
  'hsl(38, 92%, 50%)',
  'hsl(340, 75%, 55%)',
  'hsl(262, 83%, 58%)',
];

const COST_SPLIT_COLORS: Record<CostSplitType, string> = {
  'groom': 'hsl(221, 83%, 53%)',
  'bride': 'hsl(340, 75%, 55%)',
  'together': 'hsl(145, 65%, 42%)',
  '-': 'hsl(var(--muted-foreground))',
};

export default function Summary() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { 
    budgets, 
    activeBudgetId, 
    setActiveBudgetId,
    items, 
    loading: budgetLoading, 
    getTotal, 
    getBudgetsForComparison 
  } = useMultipleBudgets();
  const { toast } = useToast();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [viewMode, setViewMode] = useState<'individual' | 'comparison'>('comparison');

  const total = getTotal();
  const budgetsForComparison = getBudgetsForComparison();

  // Calculate category total for specific items
  const getCategoryTotal = (categoryId: string, budgetItems: typeof items) => {
    return budgetItems
      .filter(item => item.category === categoryId)
      .reduce((sum, item) => sum + item.amount, 0);
  };

  // Get total for specific budget items
  const getBudgetTotal = (budgetItems: typeof items) => {
    return budgetItems.reduce((sum, item) => sum + item.amount, 0);
  };

  // Find min and max budgets
  const budgetTotals = budgetsForComparison.map(b => ({
    ...b,
    total: getBudgetTotal(b.items)
  }));
  const sortedByTotal = [...budgetTotals].sort((a, b) => a.total - b.total);
  const minBudget = sortedByTotal[0];
  const maxBudget = sortedByTotal[sortedByTotal.length - 1];
  const difference = maxBudget?.total - minBudget?.total || 0;

  // Auth check
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // Loading state
  if (authLoading || budgetLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">📊</div>
          <div className="text-muted-foreground">결과를 불러오고 있어요...</div>
        </div>
      </div>
    );
  }

  const handleDownloadImage = async () => {
    if (!summaryRef.current) return;
    
    try {
      const canvas = await html2canvas(summaryRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      
      const link = document.createElement('a');
      link.download = '결혼예산_요약.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast({
        title: '이미지가 저장되었어요! 📸',
        description: '갤러리에서 확인해보세요',
      });
    } catch (error) {
      toast({
        title: '이미지 저장 중 오류가 발생했어요',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateShareLink = async () => {
    if (!activeBudgetId) return;
    
    setIsGeneratingShare(true);
    
    try {
      const { data: existing } = await supabase
        .from('shared_budgets')
        .select('share_token')
        .eq('budget_id', activeBudgetId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (existing) {
        const url = `${window.location.origin}/shared/${existing.share_token}`;
        setShareUrl(url);
      } else {
        const { data: newShare, error } = await supabase
          .from('shared_budgets')
          .insert({ budget_id: activeBudgetId })
          .select('share_token')
          .single();
        
        if (error) throw error;
        
        const url = `${window.location.origin}/shared/${newShare.share_token}`;
        setShareUrl(url);
      }
      
      setShareDialogOpen(true);
    } catch (error: any) {
      toast({
        title: '공유 링크 생성 중 오류가 발생했어요',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingShare(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: '링크가 복사되었어요! 📋',
        description: '원하는 곳에 붙여넣기하세요',
      });
    } catch {
      toast({
        title: '복사에 실패했어요',
        variant: 'destructive',
      });
    }
  };


  // Chart data for comparison
  const comparisonChartData = budgetsForComparison.map((budget, index) => ({
    name: budget.name,
    total: getBudgetTotal(budget.items),
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  // Category comparison data
  const categoryComparisonData = BUDGET_CATEGORIES.map(category => {
    const result: Record<string, any> = { category: category.name, icon: category.icon };
    budgetsForComparison.forEach(budget => {
      result[budget.name] = getCategoryTotal(category.id, budget.items);
    });
    return result;
  }).filter(data => {
    // Filter out categories with all zeros
    return budgetsForComparison.some(b => data[b.name] > 0);
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-background/80 backdrop-blur-lg z-40 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/budget')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-subheading font-semibold">예산 요약</h1>
          <LogoutButton />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-4 max-w-4xl mx-auto w-full">
        {/* View mode toggle */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-xl bg-muted p-1">
            <Button
              variant={viewMode === 'comparison' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('comparison')}
              className="rounded-lg"
            >
              전체 비교
            </Button>
            <Button
              variant={viewMode === 'individual' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('individual')}
              className="rounded-lg"
            >
              개별 보기
            </Button>
          </div>
        </div>

        {viewMode === 'comparison' ? (
          <div ref={summaryRef} className="space-y-6">
            {/* Summary cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {budgetTotals.map((budget, index) => (
                <Card 
                  key={budget.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                    budget.id === minBudget?.id ? 'ring-2 ring-green-500' : ''
                  } ${budget.id === maxBudget?.id && budgets.length > 1 ? 'ring-2 ring-orange-500' : ''}`}
                  onClick={() => {
                    setActiveBudgetId(budget.id);
                    setViewMode('individual');
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{budget.name}</span>
                    {budget.id === minBudget?.id && budgets.length > 1 && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" /> 최저
                      </span>
                    )}
                    {budget.id === maxBudget?.id && budgets.length > 1 && minBudget?.id !== maxBudget?.id && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> 최고
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold" style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}>
                    {formatKoreanWon(budget.total)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ₩{budget.total.toLocaleString()}
                  </div>
                </Card>
              ))}
            </div>

            {/* Difference highlight */}
            {budgets.length > 1 && difference > 0 && (
              <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Minus className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">최저 vs 최고 차이</p>
                      <p className="text-xl font-bold text-primary">{formatKoreanWon(difference)}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-muted-foreground">최저: {minBudget?.name}</div>
                    <div className="text-muted-foreground">최고: {maxBudget?.name}</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Total comparison chart */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">옵션별 총 예산 비교</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={comparisonChartData} layout="vertical">
                  <XAxis type="number" tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip 
                    formatter={(value: number) => formatKoreanWon(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                    }}
                  />
                  <Bar dataKey="total" radius={[0, 8, 8, 0]}>
                    {comparisonChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Category breakdown comparison */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">카테고리별 비교</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">카테고리</th>
                      {budgetsForComparison.map((budget, index) => (
                        <th 
                          key={budget.id} 
                          className="text-right py-2 px-2 text-sm font-medium"
                          style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}
                        >
                          {budget.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {categoryComparisonData.map((row, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-3 px-2">
                          <span className="mr-2">{row.icon}</span>
                          <span className="text-sm">{row.category}</span>
                        </td>
                        {budgetsForComparison.map((budget, budgetIdx) => {
                          const value = row[budget.name] as number;
                          const maxInRow = Math.max(...budgetsForComparison.map(b => row[b.name] as number));
                          const minInRow = Math.min(...budgetsForComparison.filter(b => row[b.name] > 0).map(b => row[b.name] as number));
                          const isMax = value === maxInRow && budgets.length > 1;
                          const isMin = value === minInRow && value > 0 && budgets.length > 1 && maxInRow !== minInRow;
                          
                          return (
                            <td 
                              key={budget.id} 
                              className={`text-right py-3 px-2 text-sm ${
                                isMin ? 'text-green-600 font-medium' : 
                                isMax ? 'text-orange-600 font-medium' : ''
                              }`}
                            >
                              {value > 0 ? formatKoreanWon(value) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {/* Total row */}
                    <tr className="bg-muted/50 font-semibold">
                      <td className="py-3 px-2 text-sm">💰 총합</td>
                      {budgetsForComparison.map((budget, index) => (
                        <td 
                          key={budget.id} 
                          className="text-right py-3 px-2 text-sm"
                          style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}
                        >
                          {formatKoreanWon(getBudgetTotal(budget.items))}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Cost Split Summary */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">분담별 비용 비교</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">분담</th>
                      {budgetsForComparison.map((budget, index) => (
                        <th 
                          key={budget.id} 
                          className="text-right py-2 px-2 text-sm font-medium"
                          style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}
                        >
                          {budget.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COST_SPLIT_OPTIONS.map((splitOpt) => {
                      const splitTotals = budgetsForComparison.map(budget => ({
                        budgetId: budget.id,
                        total: budget.items
                          .filter(item => (item.cost_split || '-') === splitOpt.value)
                          .reduce((sum, item) => sum + item.amount, 0)
                      }));
                      const hasAnyValue = splitTotals.some(t => t.total > 0);
                      if (!hasAnyValue && splitOpt.value === '-') return null;
                      
                      return (
                        <tr key={splitOpt.value} className="border-b last:border-0">
                          <td className="py-3 px-2">
                            <span 
                              className="inline-block w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: COST_SPLIT_COLORS[splitOpt.value] }}
                            />
                            <span className="text-sm">{splitOpt.label}</span>
                          </td>
                          {splitTotals.map((st) => (
                            <td key={st.budgetId} className="text-right py-3 px-2 text-sm font-medium">
                              {st.total > 0 ? formatKoreanWon(st.total) : '-'}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        ) : (
          /* Individual budget view */
          <div ref={summaryRef}>
            {/* Budget tabs */}
            <Tabs value={activeBudgetId || ''} onValueChange={setActiveBudgetId} className="mb-6">
              <TabsList className="w-full justify-start overflow-x-auto">
                {budgets.map(budget => (
                  <TabsTrigger key={budget.id} value={budget.id} className="min-w-fit">
                    {budget.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <Card className="p-6 mb-6">
              {/* Congrats message */}
              <div className="text-center mb-6">
                <span className="text-4xl mb-2 block">🎉</span>
                <h2 className="text-heading text-foreground">
                  {budgets.find(b => b.id === activeBudgetId)?.name || '예산'} 요약
                </h2>
                <p className="text-body text-muted-foreground">예산 정리가 완료되었어요</p>
              </div>

              {/* Donut chart */}
              <BudgetDonutChart items={items} />

              {/* Category breakdown */}
              <div className="mt-8 space-y-3">
                {BUDGET_CATEGORIES.map(category => {
                  const categoryTotal = getCategoryTotal(category.id, items);
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
            </Card>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3 mt-6">
          <Button
            onClick={handleDownloadImage}
            variant="outline"
            className="w-full h-14 text-body font-medium rounded-xl gap-2"
          >
            <Download className="h-5 w-5" />
            이미지로 저장
          </Button>
          
          <Button
            onClick={handleGenerateShareLink}
            disabled={isGeneratingShare}
            variant="outline"
            className="w-full h-14 text-body font-medium rounded-xl gap-2"
          >
            <Share2 className="h-5 w-5" />
            {isGeneratingShare ? '링크 생성 중...' : '링크 공유하기'}
          </Button>
          
          <Button
            onClick={() => navigate('/checklist')}
            className="w-full h-14 text-body font-medium rounded-xl gap-2"
          >
            <ClipboardList className="h-5 w-5" />
            체크리스트 보기
          </Button>
        </div>
      </main>

      {/* Share dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-sm mx-4 sm:mx-auto p-6 bg-card border-border shadow-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-center text-xl font-bold text-foreground">
              공유 링크가 생성되었어요!
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              링크를 복사해서 공유해보세요
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3 p-4 bg-secondary border border-border rounded-xl">
              <LinkIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-foreground truncate flex-1 font-medium">{shareUrl}</span>
            </div>
            <Button
              onClick={handleCopyLink}
              className="w-full h-12 gap-2 text-base font-semibold rounded-xl shadow-lg"
            >
              <Check className="h-5 w-5" />
              링크 복사하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

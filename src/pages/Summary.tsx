import { useState, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBudget } from '@/hooks/useBudget';
import { BudgetDonutChart } from '@/components/BudgetDonutChart';
import { BUDGET_CATEGORIES, formatKoreanWon } from '@/lib/budget-categories';
import { Button } from '@/components/ui/button';
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
  LogOut,
  Check,
  Link as LinkIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import html2canvas from 'html2canvas';

export default function Summary() {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { budget, items, loading: budgetLoading, getTotal, getCategoryTotal } = useBudget();
  const { toast } = useToast();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);

  const total = getTotal();

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
    if (!budget) return;
    
    setIsGeneratingShare(true);
    
    try {
      // Check if share link already exists
      const { data: existing } = await supabase
        .from('shared_budgets')
        .select('share_token')
        .eq('budget_id', budget.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (existing) {
        const url = `${window.location.origin}/shared/${existing.share_token}`;
        setShareUrl(url);
      } else {
        // Create new share link
        const { data: newShare, error } = await supabase
          .from('shared_budgets')
          .insert({ budget_id: budget.id })
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-background/80 backdrop-blur-lg z-40 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/budget')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-subheading font-semibold">예산 요약</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="rounded-full"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 py-4 max-w-lg mx-auto w-full">
        {/* Summary card for export */}
        <div 
          ref={summaryRef}
          className="bg-card rounded-2xl shadow-toss-lg p-6 mb-6"
        >
          {/* Congrats message */}
          <div className="text-center mb-6">
            <span className="text-4xl mb-2 block">🎉</span>
            <h2 className="text-heading text-foreground">축하해요!</h2>
            <p className="text-body text-muted-foreground">예산 정리가 완료되었어요</p>
          </div>

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

        {/* Action buttons */}
        <div className="space-y-3">
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
        <DialogContent className="max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center">공유 링크가 생성되었어요!</DialogTitle>
            <DialogDescription className="text-center">
              링크를 복사해서 공유해보세요
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <div className="flex items-center gap-2 p-3 bg-secondary rounded-xl">
              <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-caption text-foreground truncate flex-1">{shareUrl}</span>
            </div>
            <Button
              onClick={handleCopyLink}
              className="w-full h-12 mt-4 gap-2"
            >
              <Check className="h-4 w-4" />
              링크 복사하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

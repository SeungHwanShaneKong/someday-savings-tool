import { useState, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBudget } from '@/hooks/useBudget';
import { BUDGET_CATEGORIES } from '@/lib/budget-categories';
import { ProgressBar } from '@/components/ProgressBar';
import { FloatingTotalBar } from '@/components/FloatingTotalBar';
import { CategoryStep } from '@/components/CategoryStep';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

export default function BudgetFlow() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { items, loading: budgetLoading, updateAmount, getTotal } = useBudget();
  const [currentStep, setCurrentStep] = useState(0);

  const currentCategory = BUDGET_CATEGORIES[currentStep];
  const totalSteps = BUDGET_CATEGORIES.length;
  const isLastStep = currentStep === totalSteps - 1;

  const categoryItems = items.filter(item => item.category === currentCategory?.id);

  const handleAmountChange = useCallback((subCategoryId: string, amount: number) => {
    if (currentCategory) {
      updateAmount(currentCategory.id, subCategoryId, amount);
    }
  }, [currentCategory, updateAmount]);

  const handleNext = () => {
    if (isLastStep) {
      navigate('/summary');
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep === 0) {
      navigate('/');
    } else {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Auth check
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // Loading state
  if (authLoading || budgetLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">💒</div>
          <div className="text-muted-foreground">예산 정보를 불러오고 있어요...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-background/80 backdrop-blur-lg z-40 px-4 pt-4 pb-2">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <button
              onClick={() => navigate('/summary')}
              className="text-caption text-primary font-medium"
            >
              건너뛰기
            </button>
          </div>
          <ProgressBar currentStep={currentStep + 1} totalSteps={totalSteps} />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 py-8 max-w-lg mx-auto w-full">
        {currentCategory && (
          <CategoryStep
            key={currentCategory.id}
            category={currentCategory}
            items={categoryItems}
            onAmountChange={handleAmountChange}
          />
        )}

        {/* Encouragement message */}
        <div className="mt-8 text-center">
          <p className="text-caption text-muted-foreground">
            {currentStep === 0 && '차근차근 입력해볼까요? 💪'}
            {currentStep === 1 && '잘하고 있어요! 👍'}
            {currentStep === 2 && '벌써 절반 넘었어요! 🎉'}
            {currentStep === 3 && '거의 다 왔어요! ✨'}
            {currentStep === 4 && '마지막 단계예요! 🏁'}
          </p>
        </div>

        {/* Navigation buttons */}
        <div className="mt-8">
          <Button
            onClick={handleNext}
            className="w-full h-14 text-body-lg font-semibold rounded-xl"
          >
            {isLastStep ? (
              <>
                <Check className="mr-2 h-5 w-5" />
                완료하기
              </>
            ) : (
              <>
                다음
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </main>

      {/* Floating total bar */}
      <FloatingTotalBar total={getTotal()} />
    </div>
  );
}

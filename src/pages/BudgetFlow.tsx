import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMultipleBudgets } from '@/hooks/useMultipleBudgets';
import { BudgetTable } from '@/components/BudgetTable';
import { BudgetComparisonDashboard } from '@/components/BudgetComparisonDashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Trash2, 
  Pencil, 
  Check, 
  X,
  ArrowLeft,
  BarChart3,
  Table2,
  Copy,
  ChevronDown
} from 'lucide-react';
import { formatKoreanWon } from '@/lib/budget-categories';
import { LogoutButton } from '@/components/LogoutButton';
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
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function BudgetFlow() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { 
    budgets, 
    activeBudgetId, 
    setActiveBudgetId, 
    items, 
    loading: budgetLoading,
    createNewBudget,
    copyBudget,
    renameBudget,
    deleteBudget,
    updateAmount,
    togglePaid,
    updateNotes,
    renameItem,
    updateCostSplit,
    addCustomItem,
    deleteCustomItem,
    deleteItem,
    getTotal,
    getBudgetsForComparison,
  } = useMultipleBudgets();

  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'comparison'>('table');

  const handleCreateBudget = async () => {
    const newName = `옵션 ${budgets.length + 1}`;
    await createNewBudget(newName);
  };

  const handleCopyBudget = async (sourceBudgetId: string) => {
    const sourceBudget = budgets.find(b => b.id === sourceBudgetId);
    if (sourceBudget) {
      const newName = `${sourceBudget.name} (복사본)`;
      await copyBudget(sourceBudgetId, newName);
    }
  };

  const handleStartEdit = (budgetId: string, currentName: string) => {
    setEditingBudgetId(budgetId);
    setEditingName(currentName);
  };

  const handleSaveEdit = async () => {
    if (editingBudgetId && editingName.trim()) {
      await renameBudget(editingBudgetId, editingName.trim());
    }
    setEditingBudgetId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingBudgetId(null);
    setEditingName('');
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur-lg z-40 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">결혼 예산 시뮬레이터</h1>
                <p className="text-sm text-muted-foreground">
                  여러 옵션을 비교해보세요
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="gap-1"
                >
                  <Table2 className="h-4 w-4" />
                  <span className="hidden sm:inline">표</span>
                </Button>
                <Button
                  variant={viewMode === 'comparison' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('comparison')}
                  className="gap-1"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">비교</span>
                </Button>
              </div>
              <Button
                onClick={() => navigate('/summary')}
                variant="outline"
                className="gap-2"
              >
                요약 보기
              </Button>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Tabs section - Budget Options (hidden in comparison mode) */}
      {viewMode === 'table' && (
        <div className="bg-secondary/50 border-b border-border">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center gap-2 py-3 overflow-x-auto">
              {budgets.map((budget) => (
                <div
                  key={budget.id}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all
                    ${activeBudgetId === budget.id 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'bg-background hover:bg-muted border border-border'
                    }
                  `}
                  onClick={() => setActiveBudgetId(budget.id)}
                >
                  {editingBudgetId === budget.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-7 w-24 text-sm bg-white text-foreground"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveEdit}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium text-sm whitespace-nowrap">{budget.name}</span>
                      {activeBudgetId === budget.id && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6 hover:bg-primary-foreground/20"
                            onClick={() => handleStartEdit(budget.id, budget.name)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          {budgets.length > 1 && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-6 w-6 hover:bg-destructive/20"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>예산 삭제</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    "{budget.name}"을(를) 정말 삭제하시겠어요? 이 작업은 되돌릴 수 없어요.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>취소</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteBudget(budget.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    삭제
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4" />
                    옵션 추가
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-popover z-50">
                  <DropdownMenuItem onClick={handleCreateBudget}>
                    <Plus className="h-4 w-4 mr-2" />
                    새 옵션 추가
                  </DropdownMenuItem>
                  {budgets.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                        기존 옵션 복사
                      </div>
                      {budgets.map(budget => (
                        <DropdownMenuItem 
                          key={budget.id}
                          onClick={() => handleCopyBudget(budget.id)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          {budget.name}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {viewMode === 'table' ? (
          <>
            <div className="bg-card rounded-xl border border-border shadow-toss overflow-hidden">
              <BudgetTable
                items={items}
                onAmountChange={updateAmount}
                onTogglePaid={togglePaid}
                onNotesChange={updateNotes}
                onRenameItem={renameItem}
                onCostSplitChange={updateCostSplit}
                onAddCustomItem={addCustomItem}
                onDeleteItem={deleteItem}
              />
            </div>

            {/* Total summary card */}
            <div className="mt-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6 border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">현재 예산 총액</p>
                  <p className="text-3xl font-bold text-primary">
                    {formatKoreanWon(getTotal())}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">원화</p>
                  <p className="text-xl font-semibold text-foreground">
                    ₩{getTotal().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <BudgetComparisonDashboard budgets={getBudgetsForComparison()} />
        )}
      </main>
    </div>
  );
}
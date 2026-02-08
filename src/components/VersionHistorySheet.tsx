import { useState } from 'react';
import { Clock, RotateCcw, Trash2, Undo2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
import { formatKoreanWon } from '@/lib/budget-categories';
import { cn } from '@/lib/utils';

interface BudgetSnapshot {
  id: string;
  name: string;
  created_at: string;
  snapshot_data: any;
}

interface VersionHistorySheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  snapshots: BudgetSnapshot[];
  canUndoRestore: boolean;
  isRestoring: boolean;
  onRestore: (snapshotId: string) => Promise<void>;
  onDelete: (snapshotId: string) => Promise<void>;
  onUndoRestore: () => Promise<boolean | void>;
  isFullBackupData: (data: any) => boolean;
  trigger: React.ReactNode;
}

export function VersionHistorySheet({
  isOpen,
  onOpenChange,
  snapshots,
  canUndoRestore,
  isRestoring,
  onRestore,
  onDelete,
  onUndoRestore,
  isFullBackupData,
  trigger,
}: VersionHistorySheetProps) {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);

  const handleRestore = async () => {
    if (selectedSnapshotId) {
      await onRestore(selectedSnapshotId);
      setSelectedSnapshotId(null);
      onOpenChange(false);
    }
  };

  const handleUndoRestore = async () => {
    await onUndoRestore();
    onOpenChange(false);
  };

  const getSnapshotInfo = (snapshot: BudgetSnapshot) => {
    let total = 0;
    let budgetCount = 0;

    if (isFullBackupData(snapshot.snapshot_data)) {
      const fullData = snapshot.snapshot_data;
      budgetCount = fullData.budgets.length;
      total = fullData.budgets.reduce(
        (sum: number, budget: any) =>
          sum + budget.items.reduce((itemSum: number, item: any) => itemSum + item.amount, 0),
        0
      );
    } else {
      total = snapshot.snapshot_data.reduce(
        (sum: number, item: any) => sum + item.amount,
        0
      );
    }

    return { total, budgetCount };
  };

  const selectedSnapshot = snapshots.find(s => s.id === selectedSnapshotId);
  const selectedInfo = selectedSnapshot ? getSnapshotInfo(selectedSnapshot) : null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) setSelectedSnapshotId(null);
    }}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="flex flex-col p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <SheetHeader>
            <SheetTitle>버전 기록</SheetTitle>
            <SheetDescription>
              초기화 전 저장된 데이터로 복원할 수 있어요
            </SheetDescription>
          </SheetHeader>

          {/* Undo Last Restore */}
          {canUndoRestore && (
            <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm">
                  <p className="font-medium text-primary">마지막 복원 실행 취소</p>
                  <p className="text-xs text-muted-foreground">복원 전 상태로 돌아갑니다</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleUndoRestore}
                  disabled={isRestoring}
                  className="gap-1"
                >
                  <Undo2 className="h-3 w-3" />
                  취소
                </Button>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Snapshot List */}
        <ScrollArea className="flex-1 px-6">
          <div className="py-4">
            {snapshots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-center">저장된 버전이 없어요</p>
                <p className="text-sm text-center mt-1">
                  초기화하면 자동으로 백업됩니다
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {snapshots.map((snapshot) => {
                  const { total, budgetCount } = getSnapshotInfo(snapshot);
                  const isSelected = selectedSnapshotId === snapshot.id;

                  return (
                    <div
                      key={snapshot.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedSnapshotId(isSelected ? null : snapshot.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSelectedSnapshotId(isSelected ? null : snapshot.id);
                        }
                      }}
                      className={cn(
                        'p-4 border-2 rounded-xl transition-all cursor-pointer',
                        'hover:bg-accent/50',
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border bg-card'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Selection Indicator */}
                        <div
                          className={cn(
                            'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                            isSelected
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground/30 bg-background'
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>

                        {/* Snapshot Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{snapshot.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(snapshot.created_at).toLocaleString('ko-KR')}
                          </p>
                          {budgetCount > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {budgetCount}개 옵션 포함
                            </p>
                          )}
                          <p className="text-sm text-primary font-medium mt-2">
                            총액: {formatKoreanWon(total)}
                          </p>
                        </div>

                        {/* Delete Button */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>버전 삭제</AlertDialogTitle>
                              <AlertDialogDescription>
                                이 버전을 삭제하면 복원할 수 없어요. 정말 삭제하시겠어요?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>취소</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  if (selectedSnapshotId === snapshot.id) {
                                    setSelectedSnapshotId(null);
                                  }
                                  onDelete(snapshot.id);
                                }}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                삭제
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* Bottom padding for floating bar */}
          <div className="h-24" />
        </ScrollArea>

        {/* Floating Restore Bar - Bottom Sticky */}
        {snapshots.length > 0 && (
          <>
            <Separator />
            <div className="p-4 pb-safe bg-card border-t border-border">
              {selectedSnapshot ? (
                <div className="space-y-3">
                  {/* Selected Snapshot Info */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">선택된 버전</span>
                    <span className="font-medium text-primary truncate max-w-[60%] text-right">
                      {formatKoreanWon(selectedInfo?.total || 0)}
                    </span>
                  </div>
                  
                  {/* Full-width Restore Button */}
                  <Button
                    onClick={handleRestore}
                    disabled={isRestoring}
                    className="w-full h-12 text-base font-medium gap-2"
                  >
                    <RotateCcw className="h-5 w-5" />
                    이 버전으로 복원하기
                  </Button>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground">
                    복원할 버전을 선택해주세요
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

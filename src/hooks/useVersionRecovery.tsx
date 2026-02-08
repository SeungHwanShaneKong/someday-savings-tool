import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { BUDGET_CATEGORIES } from '@/lib/budget-categories';
import { ExtendedBudgetItem } from '@/components/BudgetTable';
import { Budget } from './useBudget';
import { BudgetSnapshot, FullBackupData } from './useMultipleBudgets';

interface RestoreProgress {
  phase: 'preparing' | 'backup' | 'deleting' | 'restoring' | 'validating' | 'complete' | 'error';
  current: number;
  total: number;
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  itemCount: number;
  budgetCount: number;
}

export function useVersionRecovery() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRestoring, setIsRestoring] = useState(false);
  const [progress, setProgress] = useState<RestoreProgress | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<BudgetSnapshot | null>(null);

  // Helper to check if snapshot data is full backup format
  const isFullBackupData = (data: ExtendedBudgetItem[] | FullBackupData): data is FullBackupData => {
    return data && typeof data === 'object' && 'budgets' in data && Array.isArray((data as FullBackupData).budgets);
  };

  // Validate schema consistency
  const validateSnapshotData = useCallback((
    snapshotData: ExtendedBudgetItem[] | FullBackupData
  ): ValidationResult => {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      itemCount: 0,
      budgetCount: 0,
    };

    const validCategories = BUDGET_CATEGORIES.map(c => c.id);

    if (isFullBackupData(snapshotData)) {
      result.budgetCount = snapshotData.budgets.length;
      
      for (const budget of snapshotData.budgets) {
        if (!budget.name || typeof budget.name !== 'string') {
          result.warnings.push(`예산 이름이 비어있습니다.`);
        }
        
        for (const item of budget.items) {
          result.itemCount++;
          
          // Validate required fields
          if (!item.category) {
            result.errors.push(`항목에 카테고리가 없습니다.`);
            result.isValid = false;
          } else if (!validCategories.includes(item.category)) {
            result.warnings.push(`알 수 없는 카테고리: ${item.category}`);
          }
          
          if (typeof item.amount !== 'number') {
            result.warnings.push(`금액이 숫자가 아닙니다.`);
          }
          
          // Check for null values in critical fields
          if (item.amount === null || item.amount === undefined) {
            item.amount = 0; // Auto-fix
          }
        }
      }
    } else {
      result.budgetCount = 1;
      
      for (const item of snapshotData) {
        result.itemCount++;
        
        if (!item.category || !validCategories.includes(item.category)) {
          result.warnings.push(`알 수 없는 카테고리: ${item.category}`);
        }
        
        if (typeof item.amount !== 'number' || item.amount === null) {
          item.amount = 0;
        }
      }
    }

    return result;
  }, []);

  // Create pre-restoration backup (for undo)
  const createUndoBackup = useCallback(async (
    budgets: Budget[],
    allBudgetsItems: Record<string, ExtendedBudgetItem[]>
  ): Promise<BudgetSnapshot | null> => {
    if (!user || budgets.length === 0) return null;

    try {
      const backupData: FullBackupData = {
        budgets: budgets.map(budget => ({
          id: budget.id,
          name: budget.name,
          items: allBudgetsItems[budget.id] || [],
        }))
      };

      const { data, error } = await supabase
        .from('budget_snapshots')
        .insert({
          budget_id: budgets[0].id,
          user_id: user.id,
          name: `복원 전 자동 백업 (${new Date().toLocaleString('ko-KR')})`,
          snapshot_data: JSON.parse(JSON.stringify(backupData)),
        })
        .select()
        .single();

      if (error) throw error;

      const typedSnapshot: BudgetSnapshot = {
        ...data,
        snapshot_data: data.snapshot_data as unknown as FullBackupData
      };

      setUndoSnapshot(typedSnapshot);
      return typedSnapshot;
    } catch (error: any) {
      console.error('Undo backup creation failed:', error);
      return null;
    }
  }, [user]);

  // High-performance batch delete
  const batchDeleteBudgets = useCallback(async (budgetIds: string[]): Promise<boolean> => {
    if (budgetIds.length === 0) return true;

    try {
      // Delete all items in parallel using Promise.all for speed
      await Promise.all(
        budgetIds.map(id => 
          supabase.from('budget_items').delete().eq('budget_id', id)
        )
      );

      // Delete all budgets in one batch call
      const { error } = await supabase
        .from('budgets')
        .delete()
        .in('id', budgetIds);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Batch delete failed:', error);
      return false;
    }
  }, []);

  // High-performance batch insert with chunking for large datasets
  const batchInsertItems = useCallback(async (
    items: Omit<ExtendedBudgetItem, 'id'>[],
    chunkSize = 100
  ): Promise<ExtendedBudgetItem[]> => {
    const allInserted: ExtendedBudgetItem[] = [];
    
    // Process in chunks for better performance with large datasets
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const { data, error } = await supabase
        .from('budget_items')
        .insert(chunk)
        .select();

      if (error) throw error;
      allInserted.push(...(data || []) as ExtendedBudgetItem[]);
    }

    return allInserted;
  }, []);

  // Optimized full backup restoration
  const restoreFullBackup = useCallback(async (
    snapshotData: FullBackupData,
    currentBudgets: Budget[],
    currentAllBudgetsItems: Record<string, ExtendedBudgetItem[]>,
    createUndoBackupFlag: boolean,
    onStateUpdate: (
      budgets: Budget[],
      activeBudgetId: string | null,
      items: ExtendedBudgetItem[],
      allBudgetsItems: Record<string, ExtendedBudgetItem[]>,
      newSnapshot?: BudgetSnapshot
    ) => void
  ): Promise<boolean> => {
    if (!user) return false;

    setIsRestoring(true);
    
    try {
      // Phase 1: Preparation
      setProgress({
        phase: 'preparing',
        current: 0,
        total: 5,
        message: '복원 준비 중...'
      });

      // Phase 2: Create undo backup (if requested)
      let undoBackupSnapshot: BudgetSnapshot | null = null;
      if (createUndoBackupFlag && currentBudgets.length > 0) {
        setProgress({
          phase: 'backup',
          current: 1,
          total: 5,
          message: '실행 취소용 백업 생성 중...'
        });
        undoBackupSnapshot = await createUndoBackup(currentBudgets, currentAllBudgetsItems);
      }

      // Phase 3: Validate data
      setProgress({
        phase: 'validating',
        current: 2,
        total: 5,
        message: '데이터 무결성 검사 중...'
      });
      
      const validation = validateSnapshotData(snapshotData);
      if (!validation.isValid) {
        throw new Error(`데이터 무결성 오류: ${validation.errors.join(', ')}`);
      }

      // Phase 4: Delete existing data (batch)
      setProgress({
        phase: 'deleting',
        current: 3,
        total: 5,
        message: '기존 데이터 정리 중...'
      });
      
      const budgetIds = currentBudgets.map(b => b.id);
      await batchDeleteBudgets(budgetIds);

      // Phase 5: Restore all budgets in parallel
      setProgress({
        phase: 'restoring',
        current: 4,
        total: 5,
        message: `${snapshotData.budgets.length}개 예산 복원 중...`
      });

      const newBudgets: Budget[] = [];
      const newAllBudgetsItems: Record<string, ExtendedBudgetItem[]> = {};

      // Create all budgets first (parallel)
      const budgetInsertPromises = snapshotData.budgets.map(savedBudget =>
        supabase
          .from('budgets')
          .insert({ user_id: user.id, name: savedBudget.name })
          .select()
          .single()
      );

      const budgetResults = await Promise.all(budgetInsertPromises);

      // Prepare items for batch insert
      const allItemsToInsert: { budgetId: string; items: Omit<ExtendedBudgetItem, 'id'>[] }[] = [];

      for (let i = 0; i < budgetResults.length; i++) {
        const result = budgetResults[i];
        if (result.error) throw result.error;
        
        const newBudget = result.data as Budget;
        newBudgets.push(newBudget);

        const savedBudget = snapshotData.budgets[i];
        const itemsToInsert = savedBudget.items.map(item => ({
          budget_id: newBudget.id,
          category: item.category,
          sub_category: item.sub_category,
          amount: item.amount ?? 0,
          is_paid: item.is_paid ?? false,
          notes: item.notes,
          unit_price: item.unit_price,
          quantity: item.quantity,
          custom_name: item.custom_name,
          is_custom: item.is_custom ?? false,
          cost_split: item.cost_split,
        }));

        allItemsToInsert.push({ budgetId: newBudget.id, items: itemsToInsert });
      }

      // Insert all items in parallel batches
      const itemInsertPromises = allItemsToInsert.map(async ({ budgetId, items }) => {
        const inserted = await batchInsertItems(items as any);
        return { budgetId, items: inserted };
      });

      const itemResults = await Promise.all(itemInsertPromises);
      
      for (const { budgetId, items } of itemResults) {
        newAllBudgetsItems[budgetId] = items;
      }

      // Phase 6: Complete
      setProgress({
        phase: 'complete',
        current: 5,
        total: 5,
        message: '복원 완료!'
      });

      // Update state via callback
      onStateUpdate(
        newBudgets,
        newBudgets[0]?.id || null,
        newAllBudgetsItems[newBudgets[0]?.id] || [],
        newAllBudgetsItems,
        undoBackupSnapshot || undefined
      );

      toast({
        title: '복원이 완료되었어요! ✨',
        description: `${validation.budgetCount}개 예산, ${validation.itemCount}개 항목이 복원되었습니다.`,
      });

      return true;
    } catch (error: any) {
      setProgress({
        phase: 'error',
        current: 0,
        total: 5,
        message: error.message
      });

      toast({
        title: '복원 중 오류가 발생했어요',
        description: error.message,
        variant: 'destructive',
      });

      return false;
    } finally {
      setIsRestoring(false);
      // Clear progress after a delay
      setTimeout(() => setProgress(null), 2000);
    }
  }, [user, createUndoBackup, validateSnapshotData, batchDeleteBudgets, batchInsertItems, toast]);

  // Optimized legacy restoration
  const restoreLegacyBackup = useCallback(async (
    snapshotData: ExtendedBudgetItem[],
    activeBudgetId: string,
    currentItems: ExtendedBudgetItem[],
    onStateUpdate: (items: ExtendedBudgetItem[]) => void
  ): Promise<boolean> => {
    if (!user || !activeBudgetId) return false;

    setIsRestoring(true);

    try {
      setProgress({
        phase: 'preparing',
        current: 0,
        total: 3,
        message: '복원 준비 중...'
      });

      // Validate
      const validation = validateSnapshotData(snapshotData);
      if (!validation.isValid) {
        throw new Error(`데이터 무결성 오류: ${validation.errors.join(', ')}`);
      }

      setProgress({
        phase: 'restoring',
        current: 1,
        total: 3,
        message: `${snapshotData.length}개 항목 복원 중...`
      });

      // Batch update using parallel promises
      const updatePromises = snapshotData.map(savedItem => {
        const currentItem = currentItems.find(i => i.id === savedItem.id);
        if (currentItem) {
          return supabase
            .from('budget_items')
            .update({
              amount: savedItem.amount ?? 0,
              is_paid: savedItem.is_paid ?? false,
              notes: savedItem.notes,
              unit_price: savedItem.unit_price,
              quantity: savedItem.quantity,
              cost_split: savedItem.cost_split,
              custom_name: savedItem.custom_name,
            })
            .eq('id', savedItem.id);
        }
        return Promise.resolve({ error: null });
      });

      await Promise.all(updatePromises);

      setProgress({
        phase: 'complete',
        current: 3,
        total: 3,
        message: '복원 완료!'
      });

      onStateUpdate(snapshotData);

      toast({
        title: '복원이 완료되었어요! ✨',
        description: `${snapshotData.length}개 항목이 복원되었습니다.`,
      });

      return true;
    } catch (error: any) {
      setProgress({
        phase: 'error',
        current: 0,
        total: 3,
        message: error.message
      });

      toast({
        title: '복원 중 오류가 발생했어요',
        description: error.message,
        variant: 'destructive',
      });

      return false;
    } finally {
      setIsRestoring(false);
      setTimeout(() => setProgress(null), 2000);
    }
  }, [user, validateSnapshotData, toast]);

  // Undo last restoration (restore from pre-restoration backup)
  const undoLastRestore = useCallback(async (
    currentBudgets: Budget[],
    currentAllBudgetsItems: Record<string, ExtendedBudgetItem[]>,
    onStateUpdate: (
      budgets: Budget[],
      activeBudgetId: string | null,
      items: ExtendedBudgetItem[],
      allBudgetsItems: Record<string, ExtendedBudgetItem[]>
    ) => void
  ): Promise<boolean> => {
    if (!undoSnapshot || !user) {
      toast({
        title: '되돌릴 수 없어요',
        description: '이전 복원 기록이 없습니다.',
        variant: 'destructive',
      });
      return false;
    }

    const snapshotData = undoSnapshot.snapshot_data;
    if (!isFullBackupData(snapshotData)) {
      toast({
        title: '되돌릴 수 없어요',
        description: '백업 형식이 호환되지 않습니다.',
        variant: 'destructive',
      });
      return false;
    }

    // Restore without creating another undo backup
    const success = await restoreFullBackup(
      snapshotData,
      currentBudgets,
      currentAllBudgetsItems,
      false, // Don't create undo backup for undo operation
      (budgets, activeBudgetId, items, allBudgetsItems) => {
        onStateUpdate(budgets, activeBudgetId, items, allBudgetsItems);
      }
    );

    if (success) {
      setUndoSnapshot(null);
      toast({
        title: '복원이 취소되었어요',
        description: '이전 상태로 돌아갔습니다.',
      });
    }

    return success;
  }, [undoSnapshot, user, restoreFullBackup, toast]);

  return {
    isRestoring,
    progress,
    undoSnapshot,
    isFullBackupData,
    validateSnapshotData,
    restoreFullBackup,
    restoreLegacyBackup,
    undoLastRestore,
    canUndo: !!undoSnapshot,
  };
}

import { useState, useEffect, useCallback, useRef } from 'react'; // [CL-HOME-FIX-20260315-120000]
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { BUDGET_CATEGORIES } from '@/lib/budget-categories';
import { useToast } from '@/hooks/use-toast';
import { Budget } from './useBudget';
import { ExtendedBudgetItem } from '@/components/BudgetTable';
import { useVersionRecovery } from './useVersionRecovery';

// Snapshot data can be either:
// - Legacy: ExtendedBudgetItem[] (single budget)
// - New: { budgets: { id: string; name: string; items: ExtendedBudgetItem[] }[] } (all budgets)
export interface FullBackupData {
  budgets: { id: string; name: string; items: ExtendedBudgetItem[] }[];
}

export interface BudgetSnapshot {
  id: string;
  budget_id: string;
  user_id: string;
  name: string;
  snapshot_data: ExtendedBudgetItem[] | FullBackupData;
  created_at: string;
}

// [CL-HOME-FIX-20260315-120000] sessionStorage 키 — 네비게이션 간 activeBudgetId 유지
const ACTIVE_BUDGET_KEY = 'wedding_active_budget_id';

export function useMultipleBudgets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  // [CL-HOME-FIX-20260315-120000] sessionStorage에서 복원하여 네비게이션 간 유지
  const [activeBudgetId, setActiveBudgetIdRaw] = useState<string | null>(() => {
    try { return sessionStorage.getItem(ACTIVE_BUDGET_KEY); } catch { return null; }
  });
  const [items, setItems] = useState<ExtendedBudgetItem[]>([]);
  const [allBudgetsItems, setAllBudgetsItems] = useState<Record<string, ExtendedBudgetItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<BudgetSnapshot[]>([]);

  // [CL-HOME-FIX-20260315-120000] 가드 ref — 중복 fetch/생성 방지
  const isCreatingRef = useRef(false);
  const hasFetchedRef = useRef(false);

  // [CL-HOME-FIX-20260315-120000] setter 래핑 — sessionStorage 동기화
  const setActiveBudgetId = useCallback((id: string | null) => {
    setActiveBudgetIdRaw(id);
    try {
      if (id) sessionStorage.setItem(ACTIVE_BUDGET_KEY, id);
      else sessionStorage.removeItem(ACTIVE_BUDGET_KEY);
    } catch { /* SSR/private browsing fallback */ }
  }, []);

  // Use the optimized version recovery hook
  const versionRecovery = useVersionRecovery();

  // [CL-HOME-FIX-20260315-120000] Fetch all budgets for the user — updated_at DESC + 가드
  const fetchBudgets = useCallback(async () => {
    if (!user) return;

    try {
      const { data: existingBudgets, error: fetchError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false }); // 최근 편집순

      if (fetchError) throw fetchError;

      if (existingBudgets && existingBudgets.length > 0) {
        setBudgets(existingBudgets);

        // [CL-HOME-FIX-20260315-120000] sessionStorage 저장값이 유효하면 유지, 아니면 첫 번째(최근 편집)
        setActiveBudgetIdRaw(prev => {
          const valid = prev && existingBudgets.find(b => b.id === prev);
          const nextId = valid ? prev : existingBudgets[0].id;
          try { if (nextId) sessionStorage.setItem(ACTIVE_BUDGET_KEY, nextId); } catch {}
          return nextId;
        });

        // Fetch all items for all budgets (for comparison dashboard)
        const { data: allItems, error: allItemsError } = await supabase
          .from('budget_items')
          .select('*')
          .in('budget_id', existingBudgets.map(b => b.id));

        if (!allItemsError && allItems) {
          const grouped: Record<string, ExtendedBudgetItem[]> = {};
          allItems.forEach(item => {
            if (!grouped[item.budget_id]) grouped[item.budget_id] = [];
            grouped[item.budget_id].push(item as ExtendedBudgetItem);
          });
          setAllBudgetsItems(grouped);
        }
      } else {
        // [CL-HOME-FIX-20260315-120000] 중복 생성 가드 — 레이스 컨디션 방지
        if (!isCreatingRef.current) {
          isCreatingRef.current = true;
          await createNewBudget('옵션 1');
          isCreatingRef.current = false;
        }
      }
    } catch (error: any) {
      toast({
        title: '오류가 발생했어요',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]); // [CL-HOME-FIX-20260315-120000] activeBudgetId 의존성 제거

  // Fetch items for active budget
  const fetchItems = useCallback(async () => {
    if (!activeBudgetId) return;

    try {
      const { data: budgetItems, error: itemsError } = await supabase
        .from('budget_items')
        .select('*')
        .eq('budget_id', activeBudgetId);

      if (itemsError) throw itemsError;
      setItems((budgetItems || []) as ExtendedBudgetItem[]);
    } catch (error: any) {
      toast({
        title: '오류가 발생했어요',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [activeBudgetId, toast]);

  // Create a new budget
  const createNewBudget = async (name: string) => {
    if (!user) return null;

    try {
      const { data: newBudget, error: createError } = await supabase
        .from('budgets')
        .insert({ user_id: user.id, name })
        .select()
        .single();

      if (createError) throw createError;

      // Initialize with empty items for all categories
      const initialItems: Omit<ExtendedBudgetItem, 'id'>[] = [];
      BUDGET_CATEGORIES.forEach(category => {
        category.subCategories.forEach(sub => {
          initialItems.push({
            budget_id: newBudget.id,
            category: category.id,
            sub_category: sub.id,
            amount: 0,
            is_paid: false,
            notes: null,
            unit_price: null,
            quantity: null,
            custom_name: null,
            is_custom: false,
          });
        });
      });

      const { data: insertedItems } = await supabase
        .from('budget_items')
        .insert(initialItems)
        .select();

      setBudgets(prev => [...prev, newBudget]);
      
      // Also update allBudgetsItems for immediate comparison dashboard update
      if (insertedItems) {
        setAllBudgetsItems(prev => ({
          ...prev,
          [newBudget.id]: insertedItems as ExtendedBudgetItem[]
        }));
      }
      
      setActiveBudgetId(newBudget.id);
      
      return newBudget;
    } catch (error: any) {
      toast({
        title: '예산 생성 중 오류가 발생했어요',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  // Copy an existing budget to create a new one
  const copyBudget = async (sourceBudgetId: string, newName: string) => {
    if (!user) return null;

    try {
      // First get all items from the source budget
      const { data: sourceItems, error: fetchError } = await supabase
        .from('budget_items')
        .select('*')
        .eq('budget_id', sourceBudgetId);

      if (fetchError) throw fetchError;

      // Create the new budget
      const { data: newBudget, error: createError } = await supabase
        .from('budgets')
        .insert({ user_id: user.id, name: newName })
        .select()
        .single();

      if (createError) throw createError;

      // Copy all items from source to new budget
      if (sourceItems && sourceItems.length > 0) {
        const copiedItems = sourceItems.map(item => ({
          budget_id: newBudget.id,
          category: item.category,
          sub_category: item.sub_category,
          amount: item.amount,
          is_paid: item.is_paid,
          notes: item.notes,
          unit_price: item.unit_price,
          quantity: item.quantity,
          custom_name: item.custom_name,
          is_custom: item.is_custom,
          cost_split: item.cost_split,
        }));

        const { data: insertedItems, error: insertError } = await supabase
          .from('budget_items')
          .insert(copiedItems)
          .select();

        if (insertError) throw insertError;

        // Update local state
        if (insertedItems) {
          setAllBudgetsItems(prev => ({
            ...prev,
            [newBudget.id]: insertedItems as ExtendedBudgetItem[]
          }));
        }
      }

      setBudgets(prev => [...prev, newBudget]);
      setActiveBudgetId(newBudget.id);

      toast({
        title: '예산이 복사되었어요',
        description: `"${newName}" 옵션이 생성되었습니다.`,
      });
      
      return newBudget;
    } catch (error: any) {
      toast({
        title: '예산 복사 중 오류가 발생했어요',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  // Rename a budget
  const renameBudget = async (budgetId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .update({ name: newName })
        .eq('id', budgetId);

      if (error) throw error;

      setBudgets(prev => 
        prev.map(b => b.id === budgetId ? { ...b, name: newName } : b)
      );
    } catch (error: any) {
      toast({
        title: '이름 변경 중 오류가 발생했어요',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Delete a budget
  const deleteBudget = async (budgetId: string) => {
    if (budgets.length <= 1) {
      toast({
        title: '삭제할 수 없어요',
        description: '최소 하나의 예산은 유지해야 해요.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // [CL-FK-BUDGET-DELETE-20260412-124100] Unlink checklist items first (FK constraint)
      await supabase
        .from('user_checklist_items')
        .update({ budget_id: null })
        .eq('budget_id', budgetId);

      // Delete items first
      await supabase.from('budget_items').delete().eq('budget_id', budgetId);

      // Delete budget
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId);

      if (error) throw error;

      const newBudgets = budgets.filter(b => b.id !== budgetId);
      setBudgets(newBudgets);
      
      if (activeBudgetId === budgetId && newBudgets.length > 0) {
        setActiveBudgetId(newBudgets[0].id);
      }
    } catch (error: any) {
      toast({
        title: '삭제 중 오류가 발생했어요',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Update item
  const updateItem = async (itemId: string, updates: Partial<ExtendedBudgetItem>) => {
    try {
      const { error } = await supabase
        .from('budget_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;

      setItems(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, ...updates } : item
        )
      );
      
      // Also update allBudgetsItems for real-time comparison dashboard sync
      if (activeBudgetId) {
        setAllBudgetsItems(prev => ({
          ...prev,
          [activeBudgetId]: (prev[activeBudgetId] || []).map(item =>
            item.id === itemId ? { ...item, ...updates } : item
          )
        }));
        // [CL-HOME-FIX-20260315-120000] budget updated_at 갱신 → 최근 편집 옵션 우선 표시
        supabase.from('budgets')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', activeBudgetId)
          .then();
      }
    } catch (error: any) {
      toast({
        title: '저장 중 오류가 발생했어요',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Update amount with optional unit price and quantity
  const updateAmount = async (
    category: string, 
    subCategory: string, 
    amount: number,
    unitPrice?: number,
    quantity?: number
  ) => {
    const item = items.find(i => i.category === category && i.sub_category === subCategory);
    if (item) {
      const updates: Partial<ExtendedBudgetItem> = { amount };
      if (unitPrice !== undefined) updates.unit_price = unitPrice;
      if (quantity !== undefined) updates.quantity = quantity;
      await updateItem(item.id, updates);
    }
  };

  // Toggle paid
  const togglePaid = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      await updateItem(itemId, { is_paid: !item.is_paid });
    }
  };

  // Update notes
  const updateNotes = async (itemId: string, notes: string) => {
    await updateItem(itemId, { notes });
  };

  // Rename an item
  const renameItem = async (itemId: string, newName: string) => {
    await updateItem(itemId, { custom_name: newName });
  };

  // Update cost split
  const updateCostSplit = async (itemId: string, costSplit: string) => {
    await updateItem(itemId, { cost_split: costSplit } as any);
  };

  // Add a custom item
  const addCustomItem = async (categoryId: string, name: string) => {
    if (!activeBudgetId) return;

    try {
      const customSubCategoryId = `custom-${Date.now()}`;
      const { data: newItem, error } = await supabase
        .from('budget_items')
        .insert({
          budget_id: activeBudgetId,
          category: categoryId,
          sub_category: customSubCategoryId,
          amount: 0,
          is_paid: false,
          notes: null,
          custom_name: name,
          is_custom: true,
        })
        .select()
        .single();

      if (error) throw error;

      const typedNewItem = newItem as ExtendedBudgetItem;
      setItems(prev => [...prev, typedNewItem]);
      
      // Also update allBudgetsItems for real-time comparison dashboard sync
      setAllBudgetsItems(prev => ({
        ...prev,
        [activeBudgetId]: [...(prev[activeBudgetId] || []), typedNewItem]
      }));
      
      toast({
        title: '항목이 추가되었어요',
        description: `${name} 항목이 추가되었습니다.`,
      });
    } catch (error: any) {
      toast({
        title: '항목 추가 중 오류가 발생했어요',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Delete any item (custom or default)
  const deleteItem = async (itemId: string) => {
    if (!activeBudgetId) return;
    
    try {
      const { error } = await supabase
        .from('budget_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setItems(prev => prev.filter(item => item.id !== itemId));
      
      // Also update allBudgetsItems for real-time comparison dashboard sync
      setAllBudgetsItems(prev => ({
        ...prev,
        [activeBudgetId]: (prev[activeBudgetId] || []).filter(item => item.id !== itemId)
      }));
      
      toast({
        title: '항목이 삭제되었어요',
      });
    } catch (error: any) {
      toast({
        title: '삭제 중 오류가 발생했어요',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Alias for backward compatibility
  const deleteCustomItem = deleteItem;

  // Get total
  const getTotal = () => items.reduce((sum, item) => sum + item.amount, 0);

  // Get all budgets with their items for comparison
  const getBudgetsForComparison = () => {
    return budgets.map(budget => ({
      id: budget.id,
      name: budget.name,
      items: allBudgetsItems[budget.id] || [],
    }));
  };

  // Fetch ALL snapshots for the user (not just active budget)
  const fetchSnapshots = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('budget_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedSnapshots = (data || []).map(item => ({
        ...item,
        snapshot_data: item.snapshot_data as unknown as (ExtendedBudgetItem[] | FullBackupData)
      }));
      setSnapshots(typedSnapshots);
    } catch (error: any) {
      console.error('Failed to fetch snapshots:', error);
    }
  }, [user]);

  // Create a comprehensive snapshot of ALL budgets before reset
  const createFullBackupSnapshot = async () => {
    if (!user || budgets.length === 0) return null;

    try {
      const snapshotName = `초기화 전 백업 (${new Date().toLocaleString('ko-KR')})`;
      
      // Collect all items from all budgets
      const allItemsData: { budgets: { id: string; name: string; items: ExtendedBudgetItem[] }[] } = {
        budgets: budgets.map(budget => ({
          id: budget.id,
          name: budget.name,
          items: allBudgetsItems[budget.id] || [],
        }))
      };

      // Use the first budget id for the snapshot (it will be deleted but we need a reference)
      const { data, error } = await supabase
        .from('budget_snapshots')
        .insert({
          budget_id: budgets[0].id, // Reference budget (will be recreated)
          user_id: user.id,
          name: snapshotName,
          snapshot_data: JSON.parse(JSON.stringify(allItemsData)),
        })
        .select()
        .single();

      if (error) throw error;

      const typedSnapshot: BudgetSnapshot = {
        ...data,
        snapshot_data: data.snapshot_data as unknown as ExtendedBudgetItem[]
      };

      setSnapshots(prev => [typedSnapshot, ...prev]);

      toast({
        title: '스냅샷이 저장되었어요',
        description: snapshotName,
      });

      return typedSnapshot;
    } catch (error: any) {
      toast({
        title: '스냅샷 저장 중 오류가 발생했어요',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  // Create a snapshot for single budget (backward compatibility)
  const createSnapshot = async (name?: string) => {
    if (!activeBudgetId || !user) return null;

    try {
      const snapshotName = name || `백업 (${new Date().toLocaleString('ko-KR')})`;
      
      const { data, error } = await supabase
        .from('budget_snapshots')
        .insert({
          budget_id: activeBudgetId,
          user_id: user.id,
          name: snapshotName,
          snapshot_data: JSON.parse(JSON.stringify(items)),
        })
        .select()
        .single();

      if (error) throw error;

      const typedSnapshot: BudgetSnapshot = {
        ...data,
        snapshot_data: data.snapshot_data as unknown as ExtendedBudgetItem[]
      };

      setSnapshots(prev => [typedSnapshot, ...prev]);
      return typedSnapshot;
    } catch (error: any) {
      console.error('Snapshot creation failed:', error);
      return null;
    }
  };

  // Full reset: backup all budgets, delete all, recreate fresh "옵션 1"
  const resetBudget = async (saveSnapshot = true) => {
    if (!user) return false;

    try {
      // [CL-RESET-DATALOSS-FIX-20260418-235000] Step 0: 초기화 전 DB에서 최신 데이터 강제 fetch
      // allBudgetsItems 캐시가 stale할 수 있으므로 DB 직접 조회로 완전성 보장
      let latestAllItems = allBudgetsItems;
      const { data: freshItems } = await supabase
        .from('budget_items')
        .select('*')
        .in('budget_id', budgets.map(b => b.id));

      if (freshItems && freshItems.length > 0) {
        const freshGrouped: Record<string, ExtendedBudgetItem[]> = {};
        freshItems.forEach(item => {
          if (!freshGrouped[item.budget_id]) freshGrouped[item.budget_id] = [];
          freshGrouped[item.budget_id].push(item as ExtendedBudgetItem);
        });
        setAllBudgetsItems(freshGrouped);
        latestAllItems = freshGrouped;
      }

      // Step 1: Create fresh "옵션 1" with default categories FIRST (for snapshot reference)
      const { data: newBudget, error: createError } = await supabase
        .from('budgets')
        .insert({ user_id: user.id, name: '옵션 1' })
        .select()
        .single();

      if (createError) throw createError;

      // [CL-RESET-DATALOSS-FIX-20260418-235000] Step 2: 초기화 전 무조건 백업 — 데이터 유실 방지
      // 기존: amount>0 || notes || is_custom 일 때만 백업 → is_paid만 체크한 경우 등 유실
      // 수정: budgets가 1개라도 있으면 무조건 백업 (빈 데이터라도 복원 가능성 보장)
      if (saveSnapshot && budgets.length > 0) {
        const hasAnyItems = Object.values(latestAllItems).some(
          items => items.length > 0
        );

        if (hasAnyItems) {
          const snapshotName = `초기화 전 백업 (${new Date().toLocaleString('ko-KR')})`;

          // Collect all items from all OLD budgets — latestAllItems 사용 (DB 최신)
          const allItemsData: FullBackupData = {
            budgets: budgets.map(budget => ({
              id: budget.id,
              name: budget.name,
              items: latestAllItems[budget.id] || [],
            }))
          };

          // Use the NEW budget id for the snapshot so it won't be orphaned
          const { data: snapshotData, error: snapshotError } = await supabase
            .from('budget_snapshots')
            .insert({
              budget_id: newBudget.id, // Use NEW budget so it persists
              user_id: user.id,
              name: snapshotName,
              snapshot_data: JSON.parse(JSON.stringify(allItemsData)),
            })
            .select()
            .single();

          if (snapshotError) {
            console.error('Snapshot creation failed:', snapshotError);
          } else {
            const typedSnapshot: BudgetSnapshot = {
              ...snapshotData,
              snapshot_data: snapshotData.snapshot_data as unknown as FullBackupData
            };
            setSnapshots(prev => [typedSnapshot, ...prev]);
            
            toast({
              title: '백업이 생성되었어요',
              description: snapshotName,
            });
          }
        }
      }

      // [CL-FK-BUDGET-DELETE-20260412-124100] Step 2.5: Unlink checklist items from all budgets (FK constraint)
      for (const budget of budgets) {
        await supabase
          .from('user_checklist_items')
          .update({ budget_id: null })
          .eq('budget_id', budget.id);
      }

      // Step 3: Delete all OLD budget items
      for (const budget of budgets) {
        await supabase.from('budget_items').delete().eq('budget_id', budget.id);
      }

      // Step 4: Delete all OLD budgets
      for (const budget of budgets) {
        await supabase.from('budgets').delete().eq('id', budget.id);
      }

      // Step 5: Initialize new budget with empty items for all categories in correct order
      const initialItems: Omit<ExtendedBudgetItem, 'id'>[] = [];
      BUDGET_CATEGORIES.forEach(category => {
        category.subCategories.forEach(sub => {
          initialItems.push({
            budget_id: newBudget.id,
            category: category.id,
            sub_category: sub.id,
            amount: 0,
            is_paid: false,
            notes: null,
            unit_price: null,
            quantity: null,
            custom_name: null,
            is_custom: false,
          });
        });
      });

      const { data: insertedItems, error: insertError } = await supabase
        .from('budget_items')
        .insert(initialItems)
        .select();

      if (insertError) throw insertError;

      // Step 6: Update local state
      setBudgets([newBudget]);
      setActiveBudgetId(newBudget.id);
      setItems((insertedItems || []) as ExtendedBudgetItem[]);
      setAllBudgetsItems({
        [newBudget.id]: (insertedItems || []) as ExtendedBudgetItem[]
      });

      toast({
        title: '초기화가 완료되었어요',
        description: '모든 데이터가 초기 상태로 돌아갔습니다. 버전 기록에서 복원할 수 있어요.',
      });

      return true;
    } catch (error: any) {
      toast({
        title: '초기화 중 오류가 발생했어요',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  // Helper to check if snapshot data is full backup format
  const isFullBackupData = (data: ExtendedBudgetItem[] | FullBackupData): data is FullBackupData => {
    return data && typeof data === 'object' && 'budgets' in data && Array.isArray((data as FullBackupData).budgets);
  };

  // Optimized restore from a snapshot (handles both legacy and new format)
  const restoreFromSnapshot = async (snapshotId: string) => {
    if (!user) return false;

    const snapshot = snapshots.find(s => s.id === snapshotId);
    if (!snapshot) {
      toast({
        title: '스냅샷을 찾을 수 없어요',
        variant: 'destructive',
      });
      return false;
    }

    const snapshotData = snapshot.snapshot_data;

    // Check if this is the new full backup format
    if (isFullBackupData(snapshotData)) {
      // Use optimized version recovery
      const success = await versionRecovery.restoreFullBackup(
        snapshotData,
        budgets,
        allBudgetsItems,
        true, // Create undo backup
        (newBudgets, newActiveBudgetId, newItems, newAllBudgetsItems, undoBackup) => {
          setBudgets(newBudgets);
          setActiveBudgetId(newActiveBudgetId);
          setItems(newItems);
          setAllBudgetsItems(newAllBudgetsItems);
          if (undoBackup) {
            setSnapshots(prev => [undoBackup, ...prev]);
          }
        }
      );
      return success;
    } else {
      // Legacy format: use optimized legacy restore
      if (!activeBudgetId) return false;
      
      const success = await versionRecovery.restoreLegacyBackup(
        snapshotData,
        activeBudgetId,
        items,
        (newItems) => {
          setItems(newItems);
          setAllBudgetsItems(prev => ({
            ...prev,
            [activeBudgetId]: newItems
          }));
        }
      );

      if (success) {
        toast({
          title: '스냅샷에서 복원되었어요',
          description: snapshot.name,
        });
      }

      return success;
    }
  };

  // Undo last restoration
  const undoLastRestore = async () => {
    return await versionRecovery.undoLastRestore(
      budgets,
      allBudgetsItems,
      (newBudgets, newActiveBudgetId, newItems, newAllBudgetsItems) => {
        setBudgets(newBudgets);
        setActiveBudgetId(newActiveBudgetId);
        setItems(newItems);
        setAllBudgetsItems(newAllBudgetsItems);
      }
    );
  };

  // Delete a snapshot
  const deleteSnapshot = async (snapshotId: string) => {
    try {
      const { error } = await supabase
        .from('budget_snapshots')
        .delete()
        .eq('id', snapshotId);

      if (error) throw error;

      setSnapshots(prev => prev.filter(s => s.id !== snapshotId));

      toast({
        title: '스냅샷이 삭제되었어요',
      });
    } catch (error: any) {
      toast({
        title: '스냅샷 삭제 중 오류가 발생했어요',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // [CL-HOME-FIX-20260315-120000] user.id 기반으로 안정화 — 객체 참조 변경에 의한 중복 호출 방지
  useEffect(() => {
    if (user && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchBudgets();
    } else if (!user) {
      hasFetchedRef.current = false;
      isCreatingRef.current = false;
      setBudgets([]);
      setItems([]);
      setActiveBudgetId(null);
      setLoading(false);
    }
  }, [user?.id]);

  // [CL-PERF-WATERFALL-20260418-230000] 중복 fetchItems 제거 — allBudgetsItems에서 파생
  useEffect(() => {
    if (activeBudgetId) {
      // allBudgetsItems에 이미 데이터가 있으면 중복 API 호출 제거
      const cached = allBudgetsItems[activeBudgetId];
      if (cached && cached.length > 0) {
        setItems(cached);
      } else {
        fetchItems();
      }
      fetchSnapshots();
    }
  }, [activeBudgetId, fetchSnapshots]); // fetchItems 의존성 제거로 불필요 실행 방지

  return {
    budgets,
    activeBudgetId,
    setActiveBudgetId,
    items,
    loading,
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
    refetch: fetchBudgets,
    // New snapshot/reset functions
    snapshots,
    createSnapshot,
    resetBudget,
    restoreFromSnapshot,
    deleteSnapshot,
    isFullBackupData,
    // Optimized version recovery
    undoLastRestore,
    isRestoring: versionRecovery.isRestoring,
    restoreProgress: versionRecovery.progress,
    canUndoRestore: versionRecovery.canUndo,
  };
}
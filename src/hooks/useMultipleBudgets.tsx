import { useState, useEffect, useCallback, useRef, useMemo } from 'react'; // [CL-HOME-FIX-20260315-120000]
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { BUDGET_CATEGORIES } from '@/lib/budget-categories';
import { useToast } from '@/hooks/use-toast';
import { Budget } from './useBudget';
import { ExtendedBudgetItem } from '@/components/BudgetTable';
import { useVersionRecovery } from './useVersionRecovery';
// [CL-COEDIT-E2E-20260620-130000] 실시간 공동편집 — 충돌 refs/applier 배선
import { type PendingOp, upsertById } from '@/lib/collab/conflict-resolution';
import type { RealtimeApplier, ItemRow } from './useRealtimeBudget';

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

  // [CL-COEDIT-E2E-20260620-130000] 충돌 제로(field-level LWW) 배선용 refs
  //  - itemsRef         : 최신 items 스냅샷(롤백/getLocal용, 렌더마다 동기화)
  //  - pendingWritesRef : itemId→PendingOp(내 낙관적 쓰기 — 실시간 에코 억제)
  //  - localUpdatedAtRef: itemId→서버 updated_at 기지값(단조 게이트)
  //  - editingColumnsRef: itemId→입력 중 컬럼(원격 머지에서 버퍼 보호; 기본 빈셋)
  const itemsRef = useRef<ExtendedBudgetItem[]>([]);
  itemsRef.current = items;
  const pendingWritesRef = useRef<Map<string, PendingOp>>(new Map());
  const localUpdatedAtRef = useRef<Map<string, string>>(new Map());
  const editingColumnsRef = useRef<Map<string, Set<string>>>(new Map());

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
      // [CL-COEDIT-E2E-20260620-130000] owned ∪ shared 로딩 + isShared 주입 (비파괴: 협업 0이면 owned만)
      const { data: ownedRaw, error: fetchError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id);
      if (fetchError) throw fetchError;
      const owned = (ownedRaw ?? []) as Budget[];
      const ownedIdSet = new Set(owned.map(b => b.id));

      // 내가 협업자로 연결된(남이 공유해 준) 예산 id
      const { data: memRows } = await supabase
        .from('budget_collaborators')
        .select('budget_id')
        .eq('user_id', user.id);
      const memberOfIds = [...new Set((memRows ?? []).map((r: { budget_id: string }) => r.budget_id))]
        .filter(id => !ownedIdSet.has(id));

      // 내 소유 예산 중 협업자가 있는 것(= 공동 예산)
      let sharedOwnedIds = new Set<string>();
      if (owned.length > 0) {
        const { data: collabRows } = await supabase
          .from('budget_collaborators')
          .select('budget_id')
          .in('budget_id', owned.map(b => b.id));
        sharedOwnedIds = new Set((collabRows ?? []).map((r: { budget_id: string }) => r.budget_id));
      }

      // 남이 공유해 준 예산 본문
      let sharedFromOthers: Budget[] = [];
      if (memberOfIds.length > 0) {
        const { data: sharedRows } = await supabase
          .from('budgets')
          .select('*')
          .in('id', memberOfIds);
        sharedFromOthers = (sharedRows ?? []) as Budget[];
      }

      const existingBudgets: Budget[] = [
        ...owned.map(b => ({ ...b, isShared: sharedOwnedIds.has(b.id) })),
        ...sharedFromOthers.map(b => ({ ...b, isShared: true })),
      ].sort((a, b) => (a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0));

      if (existingBudgets.length > 0) {
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
  // [CL-COEDIT-E2E-20260620-130000] 낙관적 + 충돌 제로 배선
  //  1) 즉시 낙관적 반영(입력 반응성) → 2) pending 등록(에코 억제)
  //  3) .select() 로 서버 updated_at ACK 수신(단조 게이트·에코 일치) → 4) 실패 시 낙관적 롤백
  // 비파괴: 단독사용자(공유 0)는 pending/ACK가 부수효과 없이 흐르고 최종 상태 동일.
  const updateItem = async (itemId: string, updates: Partial<ExtendedBudgetItem>) => {
    // 롤백용 직전 스냅샷
    const prevItem = itemsRef.current.find(i => i.id === itemId);

    // 1) 낙관적 로컬 반영
    setItems(prev =>
      prev.map(item => (item.id === itemId ? { ...item, ...updates } : item))
    );
    if (activeBudgetId) {
      setAllBudgetsItems(prev => ({
        ...prev,
        [activeBudgetId]: (prev[activeBudgetId] || []).map(item =>
          item.id === itemId ? { ...item, ...updates } : item
        ),
      }));
    }

    // 2) pending 등록 — 이 쓰기가 건드린 컬럼(실시간 자기에코 억제용)
    pendingWritesRef.current.set(itemId, { columns: new Set(Object.keys(updates)) });

    try {
      // 3) .select().single() — 트리거가 찍은 서버 updated_at 수신
      const { data, error } = await supabase
        .from('budget_items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;

      const serverUpdatedAt = (data as { updated_at?: string } | null)?.updated_at;
      if (serverUpdatedAt) {
        localUpdatedAtRef.current.set(itemId, serverUpdatedAt); // 단조 게이트 기지값
        const p = pendingWritesRef.current.get(itemId);
        if (p) p.ackedUpdatedAt = serverUpdatedAt;               // 에코 ack 일치
        setItems(prev =>
          prev.map(item =>
            item.id === itemId ? ({ ...item, updated_at: serverUpdatedAt }) : item
          )
        );
      }

      // 4) budget updated_at 갱신 → 최근 편집 옵션 우선 표시
      // (트리거가 budget_items→budgets 로 bubble 하지 않으므로 유지해야 정렬 비파괴.
      //  실시간은 budget_items 만 구독 → 이 budgets 쓰기는 항목 에코를 만들지 않음.)
      if (activeBudgetId) {
        supabase.from('budgets')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', activeBudgetId)
          .then();
      }
    } catch (error: any) {
      // 4') 낙관적 롤백 — 직전 값 복원
      if (prevItem) {
        setItems(prev => prev.map(item => (item.id === itemId ? prevItem : item)));
        if (activeBudgetId) {
          setAllBudgetsItems(prev => ({
            ...prev,
            [activeBudgetId]: (prev[activeBudgetId] || []).map(item =>
              item.id === itemId ? prevItem : item
            ),
          }));
        }
      }
      pendingWritesRef.current.delete(itemId);
      toast({
        title: '저장 중 오류가 발생했어요',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // [CL-COEDIT-E2E-20260620-130000] 실시간 머지 applier — useRealtimeBudget 에 주입.
  //  resolveRealtimeEvent(순수)가 에코/stale 가드 + 필드 머지를 끝낸 'merged row' 를 onUpsert 로 전달.
  //  pending/knownUpdatedAt 은 동일 Map 참조를 그대로 노출(in-place 변이라 항상 최신).
  const EMPTY_COLS = useMemo(() => new Set<string>(), []);
  const realtimeApplier: RealtimeApplier = useMemo(() => ({
    getLocal: (id: string) => {
      const found = itemsRef.current.find(i => i.id === id);
      return found ? (found as unknown as ItemRow) : undefined;
    },
    pending: pendingWritesRef.current,
    knownUpdatedAt: localUpdatedAtRef.current,
    editingColumns: (id: string) => editingColumnsRef.current.get(id) ?? EMPTY_COLS,
    onUpsert: (row: ItemRow) => {
      setItems(prev => upsertById(prev as unknown as ItemRow[], row) as unknown as ExtendedBudgetItem[]);
      if (activeBudgetId) {
        setAllBudgetsItems(prev => ({
          ...prev,
          [activeBudgetId]: upsertById((prev[activeBudgetId] || []) as unknown as ItemRow[], row) as unknown as ExtendedBudgetItem[],
        }));
      }
    },
    onDelete: (id: string) => {
      setItems(prev => prev.filter(i => i.id !== id));
      if (activeBudgetId) {
        setAllBudgetsItems(prev => ({
          ...prev,
          [activeBudgetId]: (prev[activeBudgetId] || []).filter(i => i.id !== id),
        }));
      }
      localUpdatedAtRef.current.delete(id);
      pendingWritesRef.current.delete(id);
    },
    setKnownUpdatedAt: (id: string, updatedAt: string) => {
      localUpdatedAtRef.current.set(id, updatedAt);
    },
  }), [activeBudgetId, EMPTY_COLS]);

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

      // [CL-FK-BUDGET-DELETE-20260412 / CL-QUALITY-PERF-20260621] FK 순서(unlink→items→budgets) 유지하되
      // 각 단계 내부는 병렬, budgets 삭제는 단일 .in() 배치로 — 3N 순차 왕복 → 3 배치(초기화 체감속도 개선).
      const budgetIds = budgets.map((b) => b.id);
      // Step 2.5: Unlink checklist items (FK constraint) — 병렬
      await Promise.all(
        budgetIds.map((id) =>
          supabase.from('user_checklist_items').update({ budget_id: null }).eq('budget_id', id),
        ),
      );
      // Step 3: Delete all OLD budget items — 병렬
      await Promise.all(budgetIds.map((id) => supabase.from('budget_items').delete().eq('budget_id', id)));
      // Step 4: Delete all OLD budgets — 단일 .in() 배치
      await supabase.from('budgets').delete().in('id', budgetIds);

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

  // [CL-COEDIT-OWNER-REFRESH-20260620] 탭 복귀(가시성/포커스) 시 예산 재조회 →
  // 파트너가 초대를 수락해 협업자가 생기면, 오너가 앱으로 돌아왔을 때 해당 예산이 자동으로 '우리'에 반영됨(수동 새로고침 불요).
  const lastFocusRefetchRef = useRef(0);
  useEffect(() => {
    if (!user) return;
    const maybeRefetch = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastFocusRefetchRef.current < 3000) return; // 쓰로틀: 과도한 재조회 방지
      lastFocusRefetchRef.current = now;
      void fetchBudgets();
    };
    document.addEventListener('visibilitychange', maybeRefetch);
    window.addEventListener('focus', maybeRefetch);
    return () => {
      document.removeEventListener('visibilitychange', maybeRefetch);
      window.removeEventListener('focus', maybeRefetch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // [CL-COEDIT-E2E-20260620-130000] 실시간 공동편집 applier(우리 모드에서 useRealtimeBudget 에 주입)
    realtimeApplier,
    editingColumnsRef,
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
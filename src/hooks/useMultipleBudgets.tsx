import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { BUDGET_CATEGORIES } from '@/lib/budget-categories';
import { useToast } from '@/hooks/use-toast';
import { Budget } from './useBudget';
import { ExtendedBudgetItem } from '@/components/BudgetTable';

export function useMultipleBudgets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [activeBudgetId, setActiveBudgetId] = useState<string | null>(null);
  const [items, setItems] = useState<ExtendedBudgetItem[]>([]);
  const [allBudgetsItems, setAllBudgetsItems] = useState<Record<string, ExtendedBudgetItem[]>>({});
  const [loading, setLoading] = useState(true);

  // Fetch all budgets for the user
  const fetchBudgets = useCallback(async () => {
    if (!user) return;

    try {
      const { data: existingBudgets, error: fetchError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      if (existingBudgets && existingBudgets.length > 0) {
        setBudgets(existingBudgets);
        
        // Set first budget as active if none selected
        if (!activeBudgetId || !existingBudgets.find(b => b.id === activeBudgetId)) {
          setActiveBudgetId(existingBudgets[0].id);
        }

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
        // Create first budget
        await createNewBudget('옵션 1');
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
  }, [user, activeBudgetId, toast]);

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

  // Delete a custom item
  const deleteCustomItem = async (itemId: string) => {
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

  useEffect(() => {
    if (user) {
      fetchBudgets();
    } else {
      setBudgets([]);
      setItems([]);
      setActiveBudgetId(null);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeBudgetId) {
      fetchItems();
    }
  }, [activeBudgetId, fetchItems]);

  return {
    budgets,
    activeBudgetId,
    setActiveBudgetId,
    items,
    loading,
    createNewBudget,
    renameBudget,
    deleteBudget,
    updateAmount,
    togglePaid,
    updateNotes,
    renameItem,
    addCustomItem,
    deleteCustomItem,
    getTotal,
    getBudgetsForComparison,
    refetch: fetchBudgets,
  };
}
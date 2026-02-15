import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { BUDGET_CATEGORIES, isIncomeItem, calculateNetTotal } from '@/lib/budget-categories';
import { useToast } from '@/hooks/use-toast';

export interface BudgetItem {
  id: string;
  budget_id: string;
  category: string;
  sub_category: string;
  amount: number;
  is_paid: boolean;
  notes: string | null;
}

export interface Budget {
  id: string;
  user_id: string;
  name: string;
  wedding_date: string | null;
  created_at: string;
  updated_at: string;
}

export function useBudget() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch or create budget
  const fetchOrCreateBudget = useCallback(async () => {
    if (!user) return;

    try {
      // First, try to fetch existing budget
      const { data: existingBudget, error: fetchError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingBudget) {
        setBudget(existingBudget);
        
        // Fetch budget items
        const { data: budgetItems, error: itemsError } = await supabase
          .from('budget_items')
          .select('*')
          .eq('budget_id', existingBudget.id);

        if (itemsError) throw itemsError;
        setItems(budgetItems || []);
      } else {
        // Create new budget
        const { data: newBudget, error: createError } = await supabase
          .from('budgets')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (createError) throw createError;
        setBudget(newBudget);

        // Initialize with empty items for all categories
        const initialItems: Omit<BudgetItem, 'id'>[] = [];
        BUDGET_CATEGORIES.forEach(category => {
          category.subCategories.forEach(sub => {
            initialItems.push({
              budget_id: newBudget.id,
              category: category.id,
              sub_category: sub.id,
              amount: 0,
              is_paid: false,
              notes: null,
            });
          });
        });

        const { data: createdItems, error: itemsError } = await supabase
          .from('budget_items')
          .insert(initialItems)
          .select();

        if (itemsError) throw itemsError;
        setItems(createdItems || []);
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
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchOrCreateBudget();
    } else {
      setBudget(null);
      setItems([]);
      setLoading(false);
    }
  }, [user, fetchOrCreateBudget]);

  // Update a single item
  const updateItem = async (itemId: string, updates: Partial<BudgetItem>) => {
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
    } catch (error: any) {
      toast({
        title: '저장 중 오류가 발생했어요',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Update amount for a specific item
  const updateAmount = async (category: string, subCategory: string, amount: number) => {
    const item = items.find(i => i.category === category && i.sub_category === subCategory);
    if (item) {
      await updateItem(item.id, { amount });
    }
  };

  // Toggle paid status
  const togglePaid = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      await updateItem(itemId, { is_paid: !item.is_paid });
    }
  };

  // Get items by category
  const getItemsByCategory = (categoryId: string) => 
    items.filter(item => item.category === categoryId);

  // Get total for a category
  const getCategoryTotal = (categoryId: string) => 
    getItemsByCategory(categoryId).reduce((sum, item) => sum + item.amount, 0);

  // Get overall total (net: expenses - income)
  const getTotal = () => calculateNetTotal(items);

  // Get paid total (net: expenses - income)
  const getPaidTotal = () => calculateNetTotal(items.filter(item => item.is_paid));

  // Get pending total (net: expenses - income)
  const getPendingTotal = () => calculateNetTotal(items.filter(item => !item.is_paid && item.amount > 0));

  return {
    budget,
    items,
    loading,
    updateAmount,
    updateItem,
    togglePaid,
    getItemsByCategory,
    getCategoryTotal,
    getTotal,
    getPaidTotal,
    getPendingTotal,
    refetch: fetchOrCreateBudget,
  };
}

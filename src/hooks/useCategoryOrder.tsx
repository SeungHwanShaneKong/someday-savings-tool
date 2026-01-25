import { useState, useEffect, useCallback } from 'react';
import { BUDGET_CATEGORIES, Category } from '@/lib/budget-categories';

const STORAGE_KEY = 'budget-category-order';

export function useCategoryOrder() {
  const [orderedCategories, setOrderedCategories] = useState<Category[]>(BUDGET_CATEGORIES);

  // Load order from localStorage on mount
  useEffect(() => {
    const savedOrder = localStorage.getItem(STORAGE_KEY);
    if (savedOrder) {
      try {
        const orderIds: string[] = JSON.parse(savedOrder);
        const reordered = orderIds
          .map(id => BUDGET_CATEGORIES.find(cat => cat.id === id))
          .filter((cat): cat is Category => cat !== undefined);
        
        // Add any new categories that might have been added to the default list
        BUDGET_CATEGORIES.forEach(cat => {
          if (!reordered.find(c => c.id === cat.id)) {
            reordered.push(cat);
          }
        });
        
        setOrderedCategories(reordered);
      } catch (e) {
        console.error('Failed to parse saved category order:', e);
      }
    }
  }, []);

  const reorderCategories = useCallback((activeId: string, overId: string) => {
    setOrderedCategories(prev => {
      const oldIndex = prev.findIndex(cat => cat.id === activeId);
      const newIndex = prev.findIndex(cat => cat.id === overId);
      
      if (oldIndex === -1 || newIndex === -1) return prev;
      
      const newOrder = [...prev];
      const [movedItem] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, movedItem);
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder.map(cat => cat.id)));
      
      return newOrder;
    });
  }, []);

  const resetOrder = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setOrderedCategories(BUDGET_CATEGORIES);
  }, []);

  return {
    orderedCategories,
    reorderCategories,
    resetOrder,
  };
}

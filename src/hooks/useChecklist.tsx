import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useWeddingDate } from './useWeddingDate';
import { useToast } from '@/hooks/use-toast';
import {
  CHECKLIST_TEMPLATES,
  PERIOD_ORDER,
  calculateDueDate,
  getActivePeriod,
  type ChecklistPeriod,
} from '@/lib/checklist-templates';
import { getPraiseForCount, getStreakMessage } from '@/lib/checklist-nudges';

export interface ChecklistItem {
  id: string;
  user_id: string;
  template_id: string | null;
  budget_id: string | null;
  title: string;
  period: ChecklistPeriod;
  sort_order: number;
  is_completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  notes: string | null;
  depends_on: string | null;
  category_link: string | null;
  sub_category_link: string | null;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistStats {
  total: number;
  completed: number;
  percentage: number;
  byPeriod: Record<
    ChecklistPeriod,
    { total: number; completed: number; percentage: number }
  >;
}

interface PraiseEvent {
  title: string;
  description: string;
  emoji: string;
}

export function useChecklist() {
  const { user } = useAuth();
  const { weddingDate } = useWeddingDate();
  const { toast } = useToast();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [praiseEvent, setPraiseEvent] = useState<PraiseEvent | null>(null);
  const previousCompletedRef = useRef(0);
  const dbAvailable = useRef(true); // Tracks if user_checklist_items table exists

  // ─── Fetch items ───
  const fetchItems = useCallback(async () => {
    if (!user || !dbAvailable.current) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('user_checklist_items')
        .select('*')
        .eq('user_id', user.id)
        .order('period')
        .order('sort_order');

      if (error) {
        if (error.code === '42P01' || error.message?.includes('relation')) {
          dbAvailable.current = false;
          return;
        }
        throw error;
      }
      setItems((data as ChecklistItem[]) || []);
    } catch (error: unknown) {
      if (dbAvailable.current) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn('[useChecklist] user_checklist_items table not ready:', msg);
        dbAvailable.current = false;
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ─── Auto-generate items from templates when D-day is set ───
  const generateFromTemplates = useCallback(async () => {
    if (!user || !weddingDate || !dbAvailable.current) return;

    try {
      // Check if items already exist
      const { count } = await (supabase as any)
        .from('user_checklist_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_custom', false);

      if ((count ?? 0) > 0) return; // Already generated

      // Get user's first budget
      const { data: budgets } = await supabase
        .from('budgets')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1);

      const budgetId = budgets?.[0]?.id || null;

      // Calculate totals per period for due_date distribution
      const periodTotals: Record<string, number> = {};
      for (const t of CHECKLIST_TEMPLATES) {
        periodTotals[t.period] = (periodTotals[t.period] || 0) + 1;
      }

      // Create items from templates
      const newItems = CHECKLIST_TEMPLATES.map((template) => ({
        user_id: user.id,
        template_id: null, // Will be set if template syncing is needed
        budget_id: budgetId,
        title: template.title,
        period: template.period,
        sort_order: template.sortOrder,
        is_completed: false,
        due_date: calculateDueDate(
          weddingDate,
          template.period,
          template.sortOrder,
          periodTotals[template.period]
        ),
        notes: template.description || null,
        category_link: template.categoryLink || null,
        sub_category_link: template.subCategoryLink || null,
        is_custom: false,
      }));

      const { error } = await (supabase as any)
        .from('user_checklist_items')
        .insert(newItems);

      if (error) throw error;

      toast({
        title: '체크리스트가 생성되었어요! ✨',
        description: `D-day 기준 ${CHECKLIST_TEMPLATES.length}개 항목이 준비되었어요`,
      });

      await fetchItems();
    } catch (error: unknown) {
      const message = error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : String(error);
      console.error('Failed to generate checklist:', message);
      // Table may not exist on Lovable's project — suppress toast for DB errors
      if (message.includes('relation') || message.includes('42P01')) {
        dbAvailable.current = false;
        return;
      }
      toast({
        title: '체크리스트 생성 중 오류',
        description: message,
        variant: 'destructive',
      });
    }
  }, [user, weddingDate, fetchItems, toast]);

  // ─── Toggle completion ───
  const toggleItem = useCallback(
    async (itemId: string) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      const newCompleted = !item.is_completed;

      // Optimistic update
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? {
                ...i,
                is_completed: newCompleted,
                completed_at: newCompleted ? new Date().toISOString() : null,
              }
            : i
        )
      );

      try {
        const { error } = await (supabase as any)
          .from('user_checklist_items')
          .update({
            is_completed: newCompleted,
            completed_at: newCompleted ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', itemId);

        if (error) throw error;

        // Streak & Praise logic when completing
        if (newCompleted) {
          setStreak((prev) => prev + 1);

          const completedCount = items.filter((i) => i.is_completed).length + 1;

          // Check streak message
          const streakMsg = getStreakMessage(streak + 1);
          if (streakMsg) {
            toast({
              title: streakMsg.message,
              description: `${streak + 1}개 연속 완료!`,
            });
          }

          // Check praise milestone
          const praise = getPraiseForCount(completedCount);
          const prevPraise = getPraiseForCount(previousCompletedRef.current);
          if (
            praise &&
            (!prevPraise || praise.minCompleted > prevPraise.minCompleted)
          ) {
            setPraiseEvent({
              title: praise.title,
              description: praise.description,
              emoji: praise.emoji,
            });
          }

          previousCompletedRef.current = completedCount;
        } else {
          setStreak(0);
        }
      } catch (error: unknown) {
        // Revert optimistic update
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  is_completed: !newCompleted,
                  completed_at: !newCompleted ? new Date().toISOString() : null,
                }
              : i
          )
        );
        toast({
          title: '업데이트 실패',
          description: error instanceof Error ? error.message : String(error),
          variant: 'destructive',
        });
      }
    },
    [items, streak, toast]
  );

  // ─── Add custom item ───
  const addCustomItem = useCallback(
    async (title: string, period: ChecklistPeriod) => {
      if (!user) return;

      const periodItems = items.filter((i) => i.period === period);
      const maxOrder = Math.max(0, ...periodItems.map((i) => i.sort_order));

      try {
        const { data, error } = await (supabase as any)
          .from('user_checklist_items')
          .insert({
            user_id: user.id,
            title,
            period,
            sort_order: maxOrder + 1,
            is_custom: true,
            due_date: weddingDate
              ? calculateDueDate(weddingDate, period, maxOrder + 1, periodItems.length + 1)
              : null,
          })
          .select()
          .single();

        if (error) throw error;

        setItems((prev) => [...prev, data as ChecklistItem]);

        toast({
          title: '항목이 추가되었어요',
          description: title,
        });
      } catch (error: unknown) {
        toast({
          title: '추가 실패',
          description: error instanceof Error ? error.message : String(error),
          variant: 'destructive',
        });
      }
    },
    [user, items, weddingDate, toast]
  );

  // ─── Delete item ───
  const deleteItem = useCallback(
    async (itemId: string) => {
      try {
        const { error } = await (supabase as any)
          .from('user_checklist_items')
          .delete()
          .eq('id', itemId);

        if (error) throw error;

        setItems((prev) => prev.filter((i) => i.id !== itemId));

        toast({ title: '항목이 삭제되었어요' });
      } catch (error: unknown) {
        toast({
          title: '삭제 실패',
          description: error instanceof Error ? error.message : String(error),
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  // ─── Update notes ───
  const updateNotes = useCallback(
    async (itemId: string, notes: string) => {
      try {
        const { error } = await (supabase as any)
          .from('user_checklist_items')
          .update({ notes, updated_at: new Date().toISOString() })
          .eq('id', itemId);

        if (error) throw error;

        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, notes } : i))
        );
      } catch (error: unknown) {
        toast({
          title: '메모 저장 실패',
          description: error instanceof Error ? error.message : String(error),
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  // ─── Stats calculation ───
  const stats: ChecklistStats = {
    total: items.length,
    completed: items.filter((i) => i.is_completed).length,
    percentage:
      items.length > 0
        ? Math.round(
            (items.filter((i) => i.is_completed).length / items.length) * 100
          )
        : 0,
    byPeriod: PERIOD_ORDER.reduce(
      (acc, period) => {
        const periodItems = items.filter((i) => i.period === period);
        const completed = periodItems.filter((i) => i.is_completed).length;
        acc[period] = {
          total: periodItems.length,
          completed,
          percentage:
            periodItems.length > 0
              ? Math.round((completed / periodItems.length) * 100)
              : 0,
        };
        return acc;
      },
      {} as ChecklistStats['byPeriod']
    ),
  };

  const activePeriod = weddingDate ? getActivePeriod(weddingDate) : null;

  // ─── Effects ───
  useEffect(() => {
    if (user) {
      fetchItems();
    } else {
      setItems([]);
      setLoading(false);
    }
  }, [user, fetchItems]);

  // Auto-generate when wedding date becomes available
  useEffect(() => {
    if (user && weddingDate && items.length === 0 && !loading) {
      generateFromTemplates();
    }
  }, [user, weddingDate, items.length, loading, generateFromTemplates]);

  // Initialize previous completed count on first load
  useEffect(() => {
    previousCompletedRef.current = items.filter((i) => i.is_completed).length;
  }, [items]);

  return {
    items,
    loading,
    stats,
    activePeriod,
    streak,
    praiseEvent,
    setPraiseEvent,
    toggleItem,
    addCustomItem,
    deleteItem,
    updateNotes,
    refetch: fetchItems,
    generateFromTemplates,
    hasWeddingDate: !!weddingDate,
  };
}

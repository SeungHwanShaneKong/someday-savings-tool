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
  // [DDAY-INLINE-PICKER-2026-03-07] updateWeddingDate 노출하여 체크리스트 페이지에서 직접 D-day 설정 가능
  const { weddingDate, updateWeddingDate } = useWeddingDate();
  const { toast } = useToast();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [praiseEvent, setPraiseEvent] = useState<PraiseEvent | null>(null);
  const previousCompletedRef = useRef(0);
  const dbAvailable = useRef(true); // Tracks if user_checklist_items table exists
  const migrationDoneRef = useRef(false); // [CL-CHECKLIST-AUTO-MIGRATE-20260412-140000] 5→9 period 마이그레이션 1회만 실행

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

  // [CL-CHECKLIST-AUTO-MIGRATE-20260412-140000] Legacy 5단계 period → 9단계 자동 매핑
  const mapLegacyPeriod = useCallback((legacyPeriod: string, title: string): ChecklistPeriod => {
    if (legacyPeriod === 'D-12~10m') return 'D-12~10m';
    if (legacyPeriod === 'D-9~7m') {
      if (/예복|스냅|영상|혼주 메이크업|플래너|드레스|스튜디오|메이크업/.test(title)) return 'D-10~8m';
      if (/혼수 목록/.test(title)) return 'D-5~4m';
      if (/신혼여행/.test(title)) return 'D-8~6m';
      if (/예물|예단/.test(title)) return 'D-5~4m';
      if (/가전|가구/.test(title)) return 'D-4~3m';
      if (/예산 중간/.test(title)) return 'D-5~4m';
      return 'D-10~8m';
    }
    if (legacyPeriod === 'D-6~4m') {
      if (/촬영|부케|드레스 셀렉|신혼집/.test(title)) return 'D-6~5m';
      if (/항공|숙소|청첩장 스타일|예산 중간/.test(title)) return 'D-5~4m';
      if (/예물|예단|한복|혼수|청첩장|본식 드레스|식전 영상|아버지 예복|답례품 알아보기|축가|사회자/.test(title))
        return 'D-4~3m';
      return 'D-5~4m';
    }
    if (legacyPeriod === 'D-3~2m') {
      if (/피팅|리허설|입주|답례품 주문|예식장 최종|본식 스냅 사전|혼주 의상|신혼여행 최종/.test(title))
        return 'D-2~1m';
      return 'D-3~2m';
    }
    if (legacyPeriod === 'D-1m~D') return 'D-1~0';
    return legacyPeriod as ChecklistPeriod;
  }, []);

  const migrateAndSync = useCallback(async () => {
    if (!user || !weddingDate || !dbAvailable.current || migrationDoneRef.current) return;
    if (items.length === 0) return;

    migrationDoneRef.current = true; // 1회만 실행
    const LEGACY_PERIODS = new Set(['D-9~7m', 'D-6~4m', 'D-1m~D']);
    const NEW_PERIODS = new Set(PERIOD_ORDER as string[]);

    try {
      // 1) Legacy period → 새 period로 업데이트
      const legacyItems = items.filter(
        (i) => LEGACY_PERIODS.has(i.period as unknown as string) || !NEW_PERIODS.has(i.period as unknown as string)
      );
      if (legacyItems.length > 0) {
        for (const item of legacyItems) {
          const newPeriod = mapLegacyPeriod(item.period as unknown as string, item.title);
          if (newPeriod !== (item.period as unknown as string)) {
            await (supabase as any)
              .from('user_checklist_items')
              .update({ period: newPeriod, updated_at: new Date().toISOString() })
              .eq('id', item.id);
          }
        }
      }

      // 2) 신규 템플릿 항목 자동 시드
      const existingTitles = new Set(items.filter((i) => !i.is_custom).map((i) => i.title));
      const missingTemplates = CHECKLIST_TEMPLATES.filter((t) => !existingTitles.has(t.title));
      if (missingTemplates.length > 0) {
        const periodTotals: Record<string, number> = {};
        for (const t of CHECKLIST_TEMPLATES) {
          periodTotals[t.period] = (periodTotals[t.period] || 0) + 1;
        }
        const newItems = missingTemplates.map((t) => ({
          user_id: user.id,
          budget_id: null,
          title: t.title,
          period: t.period,
          sort_order: t.sortOrder,
          is_completed: false,
          due_date: calculateDueDate(weddingDate, t.period, t.sortOrder, periodTotals[t.period]),
          notes: t.description || null,
          category_link: t.categoryLink || null,
          sub_category_link: t.subCategoryLink || null,
          is_custom: false,
        }));
        await (supabase as any).from('user_checklist_items').insert(newItems);
      }

      // 3) 변경 사항 있으면 재조회
      if (legacyItems.length > 0 || missingTemplates.length > 0) {
        await fetchItems();
        toast({
          title: '체크리스트가 업데이트되었어요 ✨',
          description: `로드맵 9단계 기준으로 ${missingTemplates.length}개 항목 추가, ${legacyItems.length}개 항목 재분류됨`,
        });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[useChecklist] 자동 마이그레이션 실패:', msg);
      migrationDoneRef.current = false; // 실패 시 다음 번에 재시도
    }
  }, [user, weddingDate, items, fetchItems, mapLegacyPeriod, toast]);

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

  // [CL-CHECKLIST-AUTO-MIGRATE-20260412-140000] 기존 사용자 자동 업그레이드 (5→9 period + 신규 템플릿 시드)
  useEffect(() => {
    if (user && weddingDate && items.length > 0 && !loading && !migrationDoneRef.current) {
      migrateAndSync();
    }
  }, [user, weddingDate, items, loading, migrateAndSync]);

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
    updateWeddingDate, // [DDAY-INLINE-PICKER-2026-03-07] 체크리스트 페이지에서 직접 D-day 설정
    refetch: fetchItems,
    generateFromTemplates,
    hasWeddingDate: !!weddingDate,
    weddingDate, // [CL-TIMELINE-FIX-20260308-203000] AI 일정 최적화에 실제 결혼 날짜 전달
  };
}

/**
 * [CL-GAMIFY-INT-20260418-222329] profiles.gamification_state R/W 훅
 * - React Query 캐시 + optimistic update + 에러 rollback
 * - 없거나 null인 필드는 DEFAULT_GAMIFICATION_STATE로 fallback
 */
import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  DEFAULT_GAMIFICATION_STATE,
  type GamificationState,
  calculateLevel,
  pointsToNextLevel,
} from '@/lib/gamification/types';

/** profiles.gamification_state JSONB를 타입-safe하게 병합 */
function mergeGamificationState(
  partial: Partial<GamificationState> | null | undefined,
): GamificationState {
  return { ...DEFAULT_GAMIFICATION_STATE, ...(partial ?? {}) };
}

export function useGamificationState() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: ['gamificationState', userId],
    enabled: !!userId,
    queryFn: async (): Promise<GamificationState> => {
      if (!userId) throw new Error('not authenticated');
      const { data, error } = await supabase
        .from('profiles')
        .select('gamification_state')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return mergeGamificationState(
        data?.gamification_state as Partial<GamificationState> | null,
      );
    },
    staleTime: 30_000, // 30s
  });

  const mutation = useMutation({
    mutationFn: async (updates: Partial<GamificationState>) => {
      if (!userId) throw new Error('not authenticated');
      const current = qc.getQueryData<GamificationState>([
        'gamificationState',
        userId,
      ]) ?? DEFAULT_GAMIFICATION_STATE;
      const next = { ...current, ...updates };
      // 레벨 자동 계산
      next.level = calculateLevel(next.total_points);

      const { error } = await supabase
        .from('profiles')
        .update({ gamification_state: next })
        .eq('user_id', userId);
      if (error) throw error;
      return next;
    },
    onMutate: async (updates) => {
      if (!userId) return;
      await qc.cancelQueries({ queryKey: ['gamificationState', userId] });
      const prev = qc.getQueryData<GamificationState>([
        'gamificationState',
        userId,
      ]);
      if (prev) {
        const optimistic: GamificationState = { ...prev, ...updates };
        optimistic.level = calculateLevel(optimistic.total_points);
        qc.setQueryData(['gamificationState', userId], optimistic);
      }
      return { prev };
    },
    onError: (_err, _updates, ctx) => {
      // Rollback
      if (userId && ctx?.prev) {
        qc.setQueryData(['gamificationState', userId], ctx.prev);
      }
    },
    onSettled: () => {
      if (userId)
        qc.invalidateQueries({ queryKey: ['gamificationState', userId] });
    },
  });

  const state = query.data ?? DEFAULT_GAMIFICATION_STATE;
  const nextLevelPoints = useMemo(
    () => pointsToNextLevel(state.total_points),
    [state.total_points],
  );

  const addPoints = useCallback(
    (amount: number) => {
      if (!Number.isFinite(amount) || amount <= 0) return;
      mutation.mutate({ total_points: state.total_points + amount });
    },
    [mutation, state.total_points],
  );

  const appendUnlockedBadgeSlugs = useCallback(
    (slugs: ReadonlyArray<string>) => {
      if (slugs.length === 0) return;
      const merged = Array.from(
        new Set([...state.unlocked_badge_slugs, ...slugs]),
      );
      mutation.mutate({ unlocked_badge_slugs: merged });
    },
    [mutation, state.unlocked_badge_slugs],
  );

  return {
    state,
    level: state.level,
    nextLevelPoints,
    isLoading: query.isLoading,
    error: query.error,
    update: mutation.mutate,
    updateAsync: mutation.mutateAsync,
    addPoints,
    appendUnlockedBadgeSlugs,
  };
}

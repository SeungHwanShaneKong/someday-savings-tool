/**
 * [CL-GAMIFY-INT-20260418-222329] 일일 Streak 계산 훅
 * - Login streak: page_views의 user_id별 일일 유니크 날짜
 * - Checklist streak: user_checklist_items.completed_at 일일 유니크 날짜
 * - 최근 60일만 로드 (최대 streak 60일 기준, 성능 보호)
 * - 계산 결과를 gamification_state에 동기화 (서버 진실원)
 */
import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGamificationState } from '@/hooks/useGamificationState';
import {
  computeStreak,
  toKSTDateString,
  canUseFreezeToken,
  shiftDate,
  currentMilestone,
  daysToNextMilestone,
} from '@/lib/gamification/streak-calc';

const LOOKBACK_DAYS = 60;

interface StreakResult {
  loginStreakDays: number;
  checklistStreakDays: number;
  loginActiveToday: boolean;
  checklistActiveToday: boolean;
  canRestoreLogin: boolean; // freeze token 사용 가능 여부
  canRestoreChecklist: boolean;
  freezeTokens: number;
  loginMilestone: number;
  checklistMilestone: number;
  loginNextMilestoneIn: number | null;
  checklistNextMilestoneIn: number | null;
  isLoading: boolean;
}

/**
 * Login + Checklist streak 계산 + 자동 동기화
 */
export function useStreak(): StreakResult {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { state, update } = useGamificationState();

  const lookbackStart = useMemo(
    () => shiftDate(toKSTDateString(), -LOOKBACK_DAYS),
    [],
  );

  // Login streak: page_views
  const loginQuery = useQuery({
    queryKey: ['streak-login', userId, lookbackStart],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<string[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('page_views')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', `${lookbackStart}T00:00:00Z`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      // KST 날짜로 변환 후 유니크 세트
      const days = new Set<string>();
      for (const row of data ?? []) {
        if (row.created_at) {
          days.add(toKSTDateString(new Date(row.created_at)));
        }
      }
      return Array.from(days);
    },
  });

  // Checklist streak: user_checklist_items.completed_at
  const checklistQuery = useQuery({
    queryKey: ['streak-checklist', userId, lookbackStart],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<string[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_checklist_items')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('is_completed', true)
        .gte('completed_at', `${lookbackStart}T00:00:00Z`)
        .order('completed_at', { ascending: false });
      if (error) throw error;
      const days = new Set<string>();
      for (const row of data ?? []) {
        if (row.completed_at) {
          days.add(toKSTDateString(new Date(row.completed_at)));
        }
      }
      return Array.from(days);
    },
  });

  const today = toKSTDateString();
  // useMemo로 배열 참조 안정화 (dependency stability)
  const loginDates = useMemo(
    () => loginQuery.data ?? [],
    [loginQuery.data],
  );
  const checklistDates = useMemo(
    () => checklistQuery.data ?? [],
    [checklistQuery.data],
  );

  const loginStreakDays = useMemo(
    () => computeStreak(loginDates, today),
    [loginDates, today],
  );
  const checklistStreakDays = useMemo(
    () => computeStreak(checklistDates, today),
    [checklistDates, today],
  );

  // 서버 상태와 동기화 (mismatch 시 업데이트)
  useEffect(() => {
    if (loginQuery.isLoading || checklistQuery.isLoading) return;
    if (!userId) return;
    const needsSync =
      state.login_streak_days !== loginStreakDays ||
      state.checklist_streak_days !== checklistStreakDays ||
      state.last_login_date !== today;
    if (needsSync) {
      update({
        login_streak_days: loginStreakDays,
        checklist_streak_days: checklistStreakDays,
        last_login_date: today,
      });
    }
  }, [
    loginQuery.isLoading,
    checklistQuery.isLoading,
    loginStreakDays,
    checklistStreakDays,
    state.login_streak_days,
    state.checklist_streak_days,
    state.last_login_date,
    today,
    userId,
    update,
  ]);

  return {
    loginStreakDays,
    checklistStreakDays,
    loginActiveToday: loginDates.includes(today),
    checklistActiveToday: checklistDates.includes(today),
    canRestoreLogin: canUseFreezeToken(loginDates, state.freeze_tokens, today),
    canRestoreChecklist: canUseFreezeToken(
      checklistDates,
      state.freeze_tokens,
      today,
    ),
    freezeTokens: state.freeze_tokens,
    loginMilestone: currentMilestone(loginStreakDays),
    checklistMilestone: currentMilestone(checklistStreakDays),
    loginNextMilestoneIn: daysToNextMilestone(loginStreakDays),
    checklistNextMilestoneIn: daysToNextMilestone(checklistStreakDays),
    isLoading: loginQuery.isLoading || checklistQuery.isLoading,
  };
}

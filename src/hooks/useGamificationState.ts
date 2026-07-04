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

/** [CL-VULN-V3] 증분 안전 대상 숫자 필드(누적 read-modify-write). */
type IncrementableKey = 'total_points' | 'coedit_nudges_sent' | 'partner_reviews';

/** profiles.gamification_state JSONB를 타입-safe하게 병합 */
function mergeGamificationState(
  partial: Partial<GamificationState> | null | undefined,
): GamificationState {
  const merged = { ...DEFAULT_GAMIFICATION_STATE, ...(partial ?? {}) };
  // [CL-SEC-AUDIT-20260703-101500] 취약점 #5[edge] 방어심화 — DB JSONB 의 배열 필드가 null 로 새면
  //  (partial.unlocked_badge_slugs === null 이 DEFAULT 의 [] 를 덮어씀) isFirstBadgeUnlock 이 null 을 받아
  //  "첫 배지" 오판(풀스크린 오발동)한다. 비배열(null/undefined/객체)은 빈 배열로 정규화해 하류로 null 이 안 새게 한다.
  //  주의: 이 정규화는 null→[] 만 교정하고 '실제 []'(신규 유저)는 그대로 [] → 정당한 첫 배지 축하는 유지된다.
  if (!Array.isArray(merged.unlocked_badge_slugs)) merged.unlocked_badge_slugs = [];
  if (!Array.isArray(merged.opt_in_phases)) merged.opt_in_phases = [...DEFAULT_GAMIFICATION_STATE.opt_in_phases];
  return merged;
}

export function useGamificationState() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id ?? null;
  // 모든 게이미피케이션 write 를 동일 스코프로 직렬화(증분·절대·배지append 간 cross-mutation 경합 제거).
  const gamifyScope = `gamificationState:${userId ?? 'anon'}`;

  // [CL-VULN-R6A-COLDCACHE-20260625-000000] write 의 base 해석 — 캐시 로드됐으면 그대로,
  //  미로드면 DB 최신값을 fetch 해 base 로 쓴다. 절대 DEFAULT 로 떨어져 JSONB 전체를 덮어쓰지 않는다
  //  (캐시 cold 구간에 increment/append/update 가 호출되면 스트릭·배지·퀘스트가 영구 유실되던 impact-5 결함 차단).
  //  행이 정말 없을 때(신규 유저)만 DEFAULT. 읽기 실패 시 throw → 쓰기 중단(클로버보다 안전, onError 처리).
  const resolveBase = useCallback(async (): Promise<GamificationState> => {
    if (!userId) return DEFAULT_GAMIFICATION_STATE;
    const cached = qc.getQueryData<GamificationState>(['gamificationState', userId]);
    if (cached) return cached;
    const { data, error } = await supabase
      .from('profiles')
      .select('gamification_state')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    const fetched = mergeGamificationState(data?.gamification_state as Partial<GamificationState> | null);
    qc.setQueryData(['gamificationState', userId], fetched); // 캐시 시드
    return fetched;
  }, [userId, qc]);

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
    scope: { id: gamifyScope },
    mutationFn: async (updates: Partial<GamificationState>) => {
      if (!userId) throw new Error('not authenticated');
      // [CL-VULN-R6A] 캐시 미로드 시 DEFAULT 가 아니라 DB 최신값을 base 로(전체 JSONB 클로버 방지)
      const current = await resolveBase();
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

  // [CL-VULN-V3-GAMIFY-RACE-20260624-000000] 증분(delta) mutation — 절대값 클로버로 인한 lost-update 근본수정.
  //  ① mutationFn 이 '매 실행마다' 최신 캐시(qc.getQueryData)를 base 로 read-modify-write → 클로저 스냅샷 비의존.
  //  ② scope.id 로 동일 유저 mutation 을 '직렬화'(이전 settle 후 다음 실행) → 동시/연속 증분도 누적 보존.
  //  ③ setQueryData 로 캐시 즉시 반영(다음 직렬 증분의 base) + DB 영속.
  const incrementMutation = useMutation({
    scope: { id: gamifyScope },
    mutationFn: async (w: { deltas?: Partial<Record<IncrementableKey, number>>; addSlugs?: ReadonlyArray<string> }) => {
      if (!userId) throw new Error('not authenticated');
      // [CL-VULN-R6A] 캐시 미로드 시 DB 최신값을 base 로(DEFAULT 클로버 금지). 직렬 다음 write 의 fresh base 도 됨.
      const current = await resolveBase();
      // 증분 대상 숫자 필드만 최신 base 기준으로 누적 → 나머지 필드는 current 보존(부분 클로버 방지).
      const overrides: Partial<Record<IncrementableKey, number>> = {};
      if (w.deltas) {
        (Object.keys(w.deltas) as IncrementableKey[]).forEach((k) => {
          const d = w.deltas![k];
          if (typeof d === 'number' && Number.isFinite(d)) {
            overrides[k] = ((current[k] as number) ?? 0) + d;
          }
        });
      }
      const next = { ...current, ...overrides }; // 이중 스프레드(기존 mutation 과 동일 — Json 할당성 유지)
      // 배지 합집합도 mutationFn 안에서 fresh base 기준으로 병합(append 의 stale 클로버 차단).
      if (w.addSlugs && w.addSlugs.length > 0) {
        next.unlocked_badge_slugs = Array.from(new Set([...current.unlocked_badge_slugs, ...w.addSlugs]));
      }
      next.level = calculateLevel(next.total_points);
      qc.setQueryData(['gamificationState', userId], next); // 직렬 다음 증분의 fresh base
      const { error } = await supabase
        .from('profiles')
        .update({ gamification_state: next })
        .eq('user_id', userId);
      if (error) throw error;
      return next;
    },
    // [CL-VULN-R10-20260704 | 핵심] 형제 mutation(line 78-119)과 동일한 낙관적 롤백 계약.
    //  mutationFn 이 line 147 에서 setQueryData(next) 로 캐시를 '선기록'한 뒤 DB update 하므로,
    //  update 실패(throw) 시 onMutate 스냅샷을 onError 가 복원하지 않으면 인플레된 포인트/레벨/배지가
    //  재조회(invalidate)까지 잔존(오프라인이면 refetch 도 실패 → 영구 노출)한다.
    //  onMutate 로 직전 캐시를 스냅샷 → onError 로 복원 → onSettled invalidate 로 서버 진실 재동기화.
    onMutate: async () => {
      if (!userId) return;
      await qc.cancelQueries({ queryKey: ['gamificationState', userId] });
      const prev = qc.getQueryData<GamificationState>(['gamificationState', userId]);
      return { prev };
    },
    onError: (_err, _w, ctx) => {
      if (userId && ctx?.prev) {
        qc.setQueryData(['gamificationState', userId], ctx.prev);
      }
    },
    onSettled: () => {
      if (userId) qc.invalidateQueries({ queryKey: ['gamificationState', userId] });
    },
  });

  const state = query.data ?? DEFAULT_GAMIFICATION_STATE;
  const nextLevelPoints = useMemo(
    () => pointsToNextLevel(state.total_points),
    [state.total_points],
  );

  /** 숫자 필드 증분(누적 안전). total_points/coedit_nudges_sent/partner_reviews. */
  const increment = useCallback(
    (deltas: Partial<Record<IncrementableKey, number>>) => {
      if (!deltas || Object.keys(deltas).length === 0) return;
      incrementMutation.mutate({ deltas });
    },
    [incrementMutation],
  );

  const addPoints = useCallback(
    (amount: number) => {
      if (!Number.isFinite(amount) || amount <= 0) return;
      // [CL-VULN-V3] 절대값(state.total_points+amount) 대신 증분 → 동시 보상 lost-update 제거
      increment({ total_points: amount });
    },
    [increment],
  );

  const appendUnlockedBadgeSlugs = useCallback(
    (slugs: ReadonlyArray<string>) => {
      if (slugs.length === 0) return;
      // [CL-VULN-R6A] 합집합은 mutationFn 안에서 'fresh base(DB 최신)' 기준으로 수행 —
      //  여기서 state(캐시, 미로드면 DEFAULT) 기반 pre-merge 하면 기존 배지를 통째로 덮어쓴다(클로버).
      incrementMutation.mutate({ addSlugs: slugs });
    },
    [incrementMutation],
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
    increment,
    appendUnlockedBadgeSlugs,
  };
}

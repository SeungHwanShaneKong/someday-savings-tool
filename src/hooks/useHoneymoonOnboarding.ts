/**
 * [CL-HONEYMOON-REDESIGN-20260316] 허니문 온보딩 상태 관리 Hook
 * 6단계 플로우: welcome → worldcup → budget → schedule → loading → results → complete
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  generateBracket,
  advanceBracket,
  type WorldCupMatch,
} from '@/lib/honeymoon-images';
import {
  computeProfileFromSelections,
  type TravelProfile,
  type AICurationResult,
} from '@/lib/honeymoon-profile';

// ── Step 정의 ──

export type OnboardingStep =
  | 'welcome'
  | 'worldcup'
  | 'budget'
  | 'schedule'
  | 'loading'
  | 'results'
  | 'complete';

const STEP_ORDER: OnboardingStep[] = [
  'welcome', 'worldcup', 'budget', 'schedule', 'loading', 'results', 'complete',
];

// ── 상태 타입 ──

export interface OnboardingState {
  step: OnboardingStep;
  // World Cup
  worldCupRound: number;           // 0-6 (7매치)
  worldCupSelections: string[];    // 매치별 승자 ID
  worldCupBracket: WorldCupMatch[];
  // Budget + Schedule
  budget: number;
  nightsMin: number;
  nightsMax: number;
  departureMonth: number | null;
  // Results
  profile: TravelProfile | null;
  aiResults: AICurationResult | null;
  // Completion
  isComplete: boolean;
}

// ── 초기 상태 ──

function createInitialState(): OnboardingState {
  return {
    step: 'welcome',
    worldCupRound: 0,
    worldCupSelections: [],
    worldCupBracket: generateBracket(),
    budget: 5000000,
    nightsMin: 3,
    nightsMax: 10,
    departureMonth: null,
    profile: null,
    aiResults: null,
    isComplete: false,
  };
}

// ── localStorage 키 ──

function getStorageKey(userId?: string): string {
  return `honeymoon_onboarding_${userId ?? 'anonymous'}`;
}

function loadState(userId?: string): OnboardingState | null {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // 유효성 검증: step 필드 존재 확인
    if (!parsed || typeof parsed.step !== 'string') return null;
    return parsed as OnboardingState;
  } catch {
    return null;
  }
}

function saveState(state: OnboardingState, userId?: string): void {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
  } catch {
    // localStorage quota 초과 — 무시
  }
}

// ── 프로그레스 계산 ──

function computeProgress(state: OnboardingState): number {
  switch (state.step) {
    case 'welcome':  return 0;
    case 'worldcup': return 5 + Math.round((state.worldCupRound / 7) * 50);
    case 'budget':   return 60;
    case 'schedule': return 75;
    case 'loading':  return 85;
    case 'results':  return 95;
    case 'complete': return 100;
    default:         return 0;
  }
}

// ── Hook ──

export interface UseHoneymoonOnboardingReturn {
  state: OnboardingState;
  // Navigation
  goToStep: (step: OnboardingStep) => void;
  goBack: () => void;
  // World Cup
  currentMatch: WorldCupMatch | null;
  selectWorldCupWinner: (winnerId: string) => void;
  // Budget + Schedule
  setBudget: (value: number) => void;
  setNightsRange: (min: number, max: number) => void;
  setDepartureMonth: (month: number | null) => void;
  // AI Results
  setAiResults: (results: AICurationResult) => void;
  // Completion
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  // Computed
  progress: number;
  stepIndex: number;
  totalSteps: number;
}

export function useHoneymoonOnboarding(userId?: string): UseHoneymoonOnboardingReturn {
  const [state, setState] = useState<OnboardingState>(() => {
    return loadState(userId) ?? createInitialState();
  });

  // localStorage 영속성
  useEffect(() => {
    saveState(state, userId);
  }, [state, userId]);

  // userId 변경 시 상태 복원
  useEffect(() => {
    const loaded = loadState(userId);
    if (loaded) {
      setState(loaded);
    }
  }, [userId]);

  // ── Navigation ──

  const goToStep = useCallback((step: OnboardingStep) => {
    setState(prev => ({ ...prev, step }));
  }, []);

  const goBack = useCallback(() => {
    setState(prev => {
      switch (prev.step) {
        case 'worldcup':
          return {
            ...createInitialState(),
            budget: prev.budget,
            nightsMin: prev.nightsMin,
            nightsMax: prev.nightsMax,
            departureMonth: prev.departureMonth,
          };
        case 'budget':
          // 월드컵 결과 보존, 마지막 라운드 상태로 복원
          return { ...prev, step: 'worldcup' as OnboardingStep };
        case 'schedule':
          return { ...prev, step: 'budget' as OnboardingStep };
        case 'results':
          return { ...prev, step: 'schedule' as OnboardingStep, aiResults: null };
        default:
          return prev;
      }
    });
  }, []);

  // ── World Cup ──

  const currentMatch = useMemo(() => {
    if (state.step !== 'worldcup') return null;
    if (state.worldCupRound >= 7) return null;
    return state.worldCupBracket[state.worldCupRound] ?? null;
  }, [state.step, state.worldCupRound, state.worldCupBracket]);

  const selectWorldCupWinner = useCallback((winnerId: string) => {
    setState(prev => {
      const newSelections = [...prev.worldCupSelections, winnerId];
      const newBracket = advanceBracket(prev.worldCupBracket, prev.worldCupRound, winnerId);
      const newRound = prev.worldCupRound + 1;

      // 7매치 완료 → 프로필 생성 + budget 단계로
      if (newRound >= 7) {
        const profileBase = computeProfileFromSelections(newSelections);
        const profile: TravelProfile = {
          ...profileBase,
          budgetRange: { min: 2000000, max: prev.budget },
          nights: { min: prev.nightsMin, max: prev.nightsMax },
          departureMonth: prev.departureMonth,
        };
        return {
          ...prev,
          worldCupRound: newRound,
          worldCupSelections: newSelections,
          worldCupBracket: newBracket,
          profile,
          step: 'budget' as OnboardingStep,
        };
      }

      return {
        ...prev,
        worldCupRound: newRound,
        worldCupSelections: newSelections,
        worldCupBracket: newBracket,
      };
    });
  }, []);

  // ── Budget + Schedule ──

  const setBudget = useCallback((value: number) => {
    setState(prev => {
      const updated = { ...prev, budget: value };
      // 프로필이 있으면 예산 범위도 업데이트
      if (updated.profile) {
        updated.profile = {
          ...updated.profile,
          budgetRange: { min: 2000000, max: value },
        };
      }
      return updated;
    });
  }, []);

  const setNightsRange = useCallback((min: number, max: number) => {
    setState(prev => {
      const updated = { ...prev, nightsMin: min, nightsMax: max };
      if (updated.profile) {
        updated.profile = {
          ...updated.profile,
          nights: { min, max },
        };
      }
      return updated;
    });
  }, []);

  const setDepartureMonth = useCallback((month: number | null) => {
    setState(prev => {
      const updated = { ...prev, departureMonth: month };
      if (updated.profile) {
        updated.profile = {
          ...updated.profile,
          departureMonth: month,
        };
      }
      return updated;
    });
  }, []);

  // ── AI Results ──

  const setAiResults = useCallback((results: AICurationResult) => {
    setState(prev => ({
      ...prev,
      aiResults: results,
      step: 'results' as OnboardingStep,
    }));
  }, []);

  // ── Completion ──

  const completeOnboarding = useCallback(() => {
    setState(prev => ({
      ...prev,
      step: 'complete' as OnboardingStep,
      isComplete: true,
    }));
  }, []);

  const resetOnboarding = useCallback(() => {
    const fresh = createInitialState();
    setState(fresh);
    try {
      localStorage.removeItem(getStorageKey(userId));
    } catch {
      // ignore
    }
  }, [userId]);

  // ── Computed ──

  const progress = computeProgress(state);
  const stepIndex = STEP_ORDER.indexOf(state.step);
  const totalSteps = STEP_ORDER.length;

  return {
    state,
    goToStep,
    goBack,
    currentMatch,
    selectWorldCupWinner,
    setBudget,
    setNightsRange,
    setDepartureMonth,
    setAiResults,
    completeOnboarding,
    resetOnboarding,
    progress,
    stepIndex,
    totalSteps,
  };
}

/**
 * [CL-HONEYMOON-REDESIGN-20260316] 허니문 온보딩 상태 관리 Hook
 * [CL-IMPROVE-7TASKS-20260330] 16강(15매치) 확장 + worldCupImages 필드
 * [CL-HONEYMOON-JOURNEY-20260405-180000] compare/plan 단계 추가
 * [CL-SKIP-SCHEDULE-20260405-220000] schedule 단계 제거 (budget → loading 직행)
 * 7단계 플로우: welcome → worldcup → budget → loading → results → compare → plan → complete
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  generateBracket,
  generateRandomWorldCupImages,
  advanceBracket,
  extractWorldCupRanking, // [CL-WORLDCUP-IMG-ALGO-20260405-140000]
  type WorldCupMatch,
  type WorldCupImage,
} from '@/lib/honeymoon-images';
import {
  computeProfileFromSelections,
  type TravelProfile,
  type AICurationResult,
} from '@/lib/honeymoon-profile';

// ── Step 정의 ──

// [CL-HONEYMOON-JOURNEY-20260405-180000] compare/plan 단계 추가
// [CL-SKIP-SCHEDULE-20260405-220000] 'schedule' 제거
export type OnboardingStep =
  | 'welcome'
  | 'worldcup'
  | 'budget'
  | 'loading'
  | 'results'
  | 'compare'
  | 'plan'
  | 'complete';

// [CL-SKIP-SCHEDULE-20260405-220000] schedule 제거
const STEP_ORDER: OnboardingStep[] = [
  'welcome', 'worldcup', 'budget', 'loading', 'results', 'compare', 'plan', 'complete',
];

// ── [CL-IMPROVE-7TASKS-20260330] 총 매치 수 ──
const TOTAL_MATCHES = 15; // R16(8) + QF(4) + SF(2) + FINAL(1)

// ── 상태 타입 ──

export interface OnboardingState {
  step: OnboardingStep;
  // World Cup
  worldCupRound: number;           // 0-14 (15매치) [CL-IMPROVE-7TASKS-20260330]
  worldCupSelections: string[];    // 매치별 승자 ID
  worldCupBracket: WorldCupMatch[];
  worldCupImages: WorldCupImage[]; // [CL-IMPROVE-7TASKS-20260330] 현재 세션의 16개 이미지
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
  const images = generateRandomWorldCupImages();
  return {
    step: 'welcome',
    worldCupRound: 0,
    worldCupSelections: [],
    worldCupBracket: generateBracket(images),
    worldCupImages: images,
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
    // [CL-IMPROVE-7TASKS-20260330] 기존 7매치 데이터 마이그레이션: worldCupImages 없으면 리셋
    if (!parsed.worldCupImages || !Array.isArray(parsed.worldCupImages) || parsed.worldCupImages.length < 16) {
      return null; // 자동 fresh start
    }
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

// [CL-HONEYMOON-JOURNEY-20260405-180000] compare/plan 단계 프로그레스 추가
function computeProgress(state: OnboardingState): number {
  switch (state.step) {
    case 'welcome':  return 0;
    case 'worldcup': return 5 + Math.round((state.worldCupRound / TOTAL_MATCHES) * 45);
    case 'budget':   return 55;
    // [CL-SKIP-SCHEDULE-20260405-220000] schedule 제거
    case 'loading':  return 65;
    case 'results':  return 75;
    case 'compare':  return 85;
    case 'plan':     return 95;
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
      // [CL-MECE-TEST-20260330] goBack 리팩토링: budget 차단, loading 추가
      // [CL-HONEYMOON-JOURNEY-20260405-180000] compare/plan 뒤로가기 추가
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
          // 15매치 완료 후 월드컵 되돌리기 불가 (UX: 완료된 토너먼트 재진입 차단)
          return prev;
        // [CL-SKIP-SCHEDULE-20260405-220000] schedule 제거 → loading/results → budget
        case 'loading':
          return { ...prev, step: 'budget' as OnboardingStep, aiResults: null };
        case 'results':
          return { ...prev, step: 'budget' as OnboardingStep, aiResults: null };
        case 'compare':
          return { ...prev, step: 'results' as OnboardingStep };
        case 'plan':
          return { ...prev, step: 'compare' as OnboardingStep };
        default:
          return prev;
      }
    });
  }, []);

  // ── World Cup ──

  const currentMatch = useMemo(() => {
    if (state.step !== 'worldcup') return null;
    if (state.worldCupRound >= TOTAL_MATCHES) return null; // [CL-IMPROVE-7TASKS-20260330]
    return state.worldCupBracket[state.worldCupRound] ?? null;
  }, [state.step, state.worldCupRound, state.worldCupBracket]);

  const selectWorldCupWinner = useCallback((winnerId: string) => {
    setState(prev => {
      const newSelections = [...prev.worldCupSelections, winnerId];
      const newBracket = advanceBracket(
        prev.worldCupBracket,
        prev.worldCupRound,
        winnerId,
        prev.worldCupImages, // [CL-IMPROVE-7TASKS-20260330]
      );
      const newRound = prev.worldCupRound + 1;

      // [CL-IMPROVE-7TASKS-20260330] 15매치 완료 → 프로필 생성 + budget 단계로
      if (newRound >= TOTAL_MATCHES) {
        const profileBase = computeProfileFromSelections(newSelections, prev.worldCupImages);
        // [CL-WORLDCUP-IMG-ALGO-20260405-140000] 월드컵 랭킹 추출
        const worldCupRanking = extractWorldCupRanking(
          newBracket, newSelections, prev.worldCupImages,
        );
        const profile: TravelProfile = {
          ...profileBase,
          budgetRange: { min: 2000000, max: prev.budget },
          nights: { min: prev.nightsMin, max: prev.nightsMax },
          departureMonth: prev.departureMonth,
          worldCupRanking: worldCupRanking ?? undefined,
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

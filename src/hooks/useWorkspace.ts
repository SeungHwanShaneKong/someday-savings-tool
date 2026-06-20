// [CL-COEDIT-E2E-20260620-130000] 개인/공동(우리) 워크스페이스 모드 훅 (React 래퍼)
//
// 순수 로직(src/lib/collab/workspace.ts, 8테스트)을 React 상태로 래핑한다.
// - mode: 'personal' | 'shared' (localStorage 기억)
// - visibleBudgets: 현재 모드에 맞게 필터된 예산(개인↔공동 완전 분리)
// - counts: 모드별 개수(빈 상태/배지 판단)
// ※ 추가형 — 핵심 훅(useMultipleBudgets) 무수정. budgets 의 isShared 는 로더(증분 2)가 주입.
import { useState, useCallback, useMemo } from 'react';
import {
  type WorkspaceMode,
  readWorkspaceMode,
  writeWorkspaceMode,
  resolveInitialMode,
  filterBudgetsByMode,
  countByMode,
} from '@/lib/collab/workspace';
import type { KVStore } from '@/lib/collab/invite-resume';

/** 안전한 localStorage 접근(프라이빗 모드/SSR 폴백). */
function getModeStore(): KVStore | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export interface UseWorkspaceResult<T> {
  mode: WorkspaceMode;
  setMode: (mode: WorkspaceMode) => void;
  toggleMode: () => void;
  /** 현재 모드에 해당하는 예산만(개인↔공동 분리) */
  visibleBudgets: T[];
  counts: { personal: number; shared: number };
}

/**
 * @param budgets isShared 플래그가 부여된 전체 예산(로더가 주입)
 * @param opts.preferShared 초대 수락 직후 등 — 초기 모드를 'shared'로 강제
 */
export function useWorkspace<T extends { isShared?: boolean }>(
  budgets: readonly T[],
  opts?: { preferShared?: boolean },
): UseWorkspaceResult<T> {
  const [mode, setModeState] = useState<WorkspaceMode>(() => {
    const saved = readWorkspaceMode(getModeStore(), 'personal');
    return resolveInitialMode({ saved, preferShared: opts?.preferShared });
  });

  const setMode = useCallback((m: WorkspaceMode) => {
    setModeState(m);
    writeWorkspaceMode(getModeStore(), m);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next: WorkspaceMode = prev === 'personal' ? 'shared' : 'personal';
      writeWorkspaceMode(getModeStore(), next);
      return next;
    });
  }, []);

  const visibleBudgets = useMemo(() => filterBudgetsByMode(budgets, mode), [budgets, mode]);
  const counts = useMemo(() => countByMode(budgets), [budgets]);

  return { mode, setMode, toggleMode, visibleBudgets, counts };
}

// [CL-COEDIT-MODE-20260620-120000] 개인/공동(우리) 워크스페이스 모드 — 순수 로직
//
// 설계(플랜 Part B): "워크스페이스 = 예산별 공유의 뷰 필터".
//  - 개인 예산  = 협업자 없는 내 예산(isShared=false)
//  - 공동 예산  = 나↔파트너가 연결된 예산(isShared=true)
//  - 모드 토글  = 보기 필터. 실시간/충돌해결은 '우리' 모드에서만 작동(호출측이 모드로 분기).
// Supabase/React 비의존(순수) → CI 완전 검증. 모드 누수 방지는 RLS가 보안 경계(여긴 표현 계층).

import type { KVStore } from './invite-resume';

export type WorkspaceMode = 'personal' | 'shared';
export const WORKSPACE_MODES: readonly WorkspaceMode[] = ['personal', 'shared'] as const;
/** localStorage 키 — 마지막 사용 모드 기억 */
export const WORKSPACE_MODE_KEY = 'wedding_workspace_mode';

export function isWorkspaceMode(v: unknown): v is WorkspaceMode {
  return v === 'personal' || v === 'shared';
}

/** isShared 플래그가 부여된 예산(로더가 협업자 유무로 주입; undefined=개인). */
export interface ModedBudget {
  id: string;
  isShared?: boolean;
}

/** 모드에 맞는 예산만 필터: personal→개인 예산, shared→공동 예산. (isShared 미정=개인) */
export function filterBudgetsByMode<T extends { isShared?: boolean }>(
  budgets: readonly T[],
  mode: WorkspaceMode,
): T[] {
  const wantShared = mode === 'shared';
  return budgets.filter((b) => (b.isShared ?? false) === wantShared);
}

/** 모드별 개수(빈 상태/배지 판단용). */
export function countByMode<T extends { isShared?: boolean }>(
  budgets: readonly T[],
): { personal: number; shared: number } {
  let personal = 0;
  let shared = 0;
  for (const b of budgets) {
    if (b.isShared) shared++;
    else personal++;
  }
  return { personal, shared };
}

/** 저장된 모드 읽기(없거나 불량이면 fallback). */
export function readWorkspaceMode(store: KVStore | null, fallback: WorkspaceMode = 'personal'): WorkspaceMode {
  if (!store) return fallback;
  try {
    const v = store.getItem(WORKSPACE_MODE_KEY);
    return isWorkspaceMode(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

/** 모드 저장(실패는 무시). */
export function writeWorkspaceMode(store: KVStore | null, mode: WorkspaceMode): void {
  if (!store) return;
  try {
    store.setItem(WORKSPACE_MODE_KEY, mode);
  } catch {
    /* 프라이빗 모드 등 — 무시 */
  }
}

/**
 * 진입 시 초기 모드 결정.
 *  - preferShared(초대 수락 직후) → 'shared'
 *  - 저장된 유효 모드 → 그대로
 *  - 그 외 기본 'personal'(첫 사용자=개인)
 */
export function resolveInitialMode(opts: {
  saved?: string | null;
  preferShared?: boolean;
}): WorkspaceMode {
  if (opts.preferShared) return 'shared';
  if (isWorkspaceMode(opts.saved)) return opts.saved;
  return 'personal';
}

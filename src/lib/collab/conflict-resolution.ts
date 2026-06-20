// [CL-COLLAB-CONFLICT-20260619-222424] 신랑·신부 공동편집 — 충돌 제로 엔진 (순수 로직)
//
// 설계(플랜 C-5): 충돌 도메인 = (item.id, column) 셀.
//  - 다른 항목         → 무충돌 (upsertById union)
//  - 같은 항목·다른 필드 → 둘 다 보존 (mergeRemoteFields: 변경 안 된 컬럼은 로컬 유지)
//  - 같은 항목·같은 필드 → 서버 updated_at 기준 Last-Write-Wins
// 에코/순서역전 방어 3중:
//  (1) isOwnEcho      — 내가 방금 ack 받은 쓰기의 브로드캐스트는 무시
//  (2) isNewer        — remote.updated_at ≤ 로컬 기지값이면 무시(자기에코+순서역전)
//  (3) 값 동일 no-op   — 호출측에서 동일값이면 setState 생략(여기선 결정만 반환)
//
// 이 모듈은 Supabase/React 비의존(순수)이라 CI에서 완전 검증 가능.

/** 낙관적 쓰기 1건의 진행 상태. ack 후 ackedUpdatedAt 에 서버 updated_at 기록. */
export interface PendingOp {
  /** 이 쓰기가 건드린 컬럼들 */
  columns: Set<string>;
  /** 서버가 .select() 로 돌려준 updated_at (ack). 미수신이면 undefined */
  ackedUpdatedAt?: string;
}

/** budget_items 에서 협업 머지 대상이 되는 컬럼(스칼라만). id/budget_id/created_at 등 비대상 제외. */
export const MERGEABLE_COLUMNS = [
  'amount',
  'is_paid',
  'notes',
  'cost_split',
  'custom_name',
  'unit_price',
  'quantity',
  'payment_date',
] as const;

export type MergeableColumn = (typeof MERGEABLE_COLUMNS)[number];

/** ISO-8601 타임스탬프 안전 비교(offset/Z 포맷 차이 무관). a>b 면 양수. */
export function compareTimestamps(a: string, b: string): number {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) {
    // 파싱 불가 시 사전식 폴백(동일 포맷 가정)
    return a < b ? -1 : a > b ? 1 : 0;
  }
  return ta - tb;
}

/** Guard 1: 내 쓰기의 에코인가? (pending ack 와 updated_at 일치) */
export function isOwnEcho(
  itemId: string,
  remoteUpdatedAt: string,
  pending: ReadonlyMap<string, PendingOp>,
): boolean {
  const p = pending.get(itemId);
  return !!p && p.ackedUpdatedAt !== undefined && p.ackedUpdatedAt === remoteUpdatedAt;
}

/** Guard 2: 단조 게이트 — 기지값보다 엄격히 새로울 때만 적용(역전/에코 차단). */
export function isNewer(remoteUpdatedAt: string, knownUpdatedAt?: string): boolean {
  if (!knownUpdatedAt) return true;
  return compareTimestamps(remoteUpdatedAt, knownUpdatedAt) > 0;
}

/** 같은 셀 경쟁 시 LWW: updated_at 이 더 늦은(또는 같으면 remote) 쪽이 승. */
export function resolveLWW<T extends { updated_at: string }>(local: T, remote: T): T {
  return compareTimestamps(remote.updated_at, local.updated_at) >= 0 ? remote : local;
}

/**
 * 필드 단위 머지: remote 의 머지대상 컬럼을 채택하되,
 * 사용자가 "지금 편집 중"인 컬럼(editingColumns)은 건너뜀(입력 버퍼 보호 — blur 시 LWW로 수렴).
 * 서버 bookkeeping(updated_at)은 항상 채택.
 */
export function mergeRemoteFields<T extends Record<string, unknown>>(
  local: T,
  remote: T,
  editingColumns: ReadonlySet<string>,
  mergeableColumns: readonly string[] = MERGEABLE_COLUMNS,
): T {
  const merged: Record<string, unknown> = { ...local };
  for (const col of mergeableColumns) {
    if (editingColumns.has(col)) continue; // 입력 중 → 버퍼 우선
    if (col in remote) merged[col] = remote[col];
  }
  if ('updated_at' in remote) merged.updated_at = remote.updated_at;
  return merged as T;
}

/** id 기준 upsert(다른 항목은 절대 충돌하지 않음 — 단순 union). */
export function upsertById<T extends { id: string }>(list: readonly T[], row: T): T[] {
  const idx = list.findIndex((x) => x.id === row.id);
  if (idx === -1) return [...list, row];
  const next = list.slice();
  next[idx] = row;
  return next;
}

export type RealtimeDecision<T> =
  | { action: 'ignore'; reason: 'echo' | 'stale' }
  | { action: 'apply'; merged: T };

/**
 * 실시간 INSERT/UPDATE 1건에 대한 최종 결정.
 * local 미존재 → INSERT(=remote 그대로 upsert). 존재 → 3중 가드 후 필드 머지.
 */
export function decideItemUpsert<T extends Record<string, any> & { id: string; updated_at: string }>(
  local: T | undefined,
  remote: T,
  opts: {
    pending: ReadonlyMap<string, PendingOp>;
    knownUpdatedAt?: string;
    editingColumns?: ReadonlySet<string>;
    mergeableColumns?: readonly string[];
  },
): RealtimeDecision<T> {
  if (isOwnEcho(remote.id, remote.updated_at, opts.pending)) {
    return { action: 'ignore', reason: 'echo' };
  }
  if (!isNewer(remote.updated_at, opts.knownUpdatedAt)) {
    return { action: 'ignore', reason: 'stale' };
  }
  if (!local) {
    return { action: 'apply', merged: remote };
  }
  const merged = mergeRemoteFields(
    local,
    remote,
    opts.editingColumns ?? new Set<string>(),
    opts.mergeableColumns ?? MERGEABLE_COLUMNS,
  );
  return { action: 'apply', merged };
}

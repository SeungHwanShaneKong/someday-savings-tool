// [CL-PARTNER-DIFF-20260623-230113] 재접속 시 '파트너가 바꾼 항목' 식별 (순수, CI 검증 가능)
//
// 개선3: 내가 자리를 비운 동안(=마지막으로 본 시각 lastSeen 이후) 파트너가 수정한 항목을 강조한다.
//   공동편집은 '부재 중엔 파트너만 편집' 모델이라, updated_at > lastSeen 이면 곧 파트너 변경분으로 정합.
//   lastSeen 이 없으면(최초 진입) 강조하지 않는다(전체가 '새것'으로 보이는 노이즈 방지).

export interface HasIdUpdated {
  id: string;
  updated_at?: string | null;
  // [CL-EDIT5-EDITOR-20260625-000000] 편집자(서버 트리거가 auth.uid() 기록). 파트너/내 편집 구분용.
  last_edited_by?: string | null;
}

/**
 * lastSeenISO 이후 updated_at 인 항목 id 집합. lastSeen 없음/파싱불가면 빈셋.
 * [CL-EDIT5-EDITOR-20260625-000000] myUserId 가 주어지면 '편집자 구분' 활성:
 *   - last_edited_by 가 나(myUserId)면 제외(내 편집이 '파트너 변경'으로 오표시되는 버그 근본차단)
 *   - last_edited_by 가 null(레거시·트리거 미적용 행)이면 보수적으로 제외(오탐 0 우선)
 *   - 그 외(파트너) 만 포함
 * myUserId 미전달이면 기존 동작(updated_at 만) — 하위호환.
 */
export function computeChangedSince<T extends HasIdUpdated>(
  items: readonly T[],
  lastSeenISO: string | null | undefined,
  myUserId?: string | null,
): Set<string> {
  const out = new Set<string>();
  if (!lastSeenISO) return out;
  const seen = Date.parse(lastSeenISO);
  if (Number.isNaN(seen)) return out;
  const editorAware = myUserId != null && myUserId !== '';
  for (const it of items) {
    if (!it.updated_at) continue;
    const u = Date.parse(it.updated_at);
    if (Number.isNaN(u) || u <= seen) continue;
    if (editorAware) {
      // 편집자 구분: 내 편집·미상(null) 제외 → 파트너 변경만 강조
      if (it.last_edited_by == null || it.last_edited_by === myUserId) continue;
    }
    out.add(it.id);
  }
  return out;
}

/** budgetId 별 last-seen localStorage 키 */
export function lastSeenKey(budgetId: string): string {
  return `wedsem_last_seen_${budgetId}`;
}

// [CL-VULN-V6-LASTSEEN-MAX-20260624-000000] 스냅샷에 포함된 항목들의 최신 updated_at.
//  last-seen 을 now 가 아니라 이 값으로 전진시키면, 스냅샷이 보지 못한 '더 늦은' 파트너 변경이
//  다음 open 에서 여전히 strict-> 게이트를 통과해 보존된다(now 전진은 그 사이 변경을 영구 유실).
// [CL-EDIT5-R7BASELINE-20260626-000000] myUserId 가 주어지면 '내 편집·미상(null)' 행을 제외하고 최댓값 계산.
//  baseline(lastSeen) 전진에 내 편집 updated_at 이 섞이면, 내 편집보다 '시각은 이르지만 그 후 도착할' 파트너 변경을
//  마스킹해 영구 미강조시킨다(R7-1/R7-2). 파트너 변경 max 로만 전진 → 미래 파트너 변경 보존.
/** items 중 파싱가능한 updated_at 의 최댓값(ISO). 없으면 null. myUserId 주어지면 내 편집·null 편집자 제외. */
export function maxUpdatedAt<T extends HasIdUpdated>(items: readonly T[], myUserId?: string | null): string | null {
  const editorAware = myUserId != null && myUserId !== '';
  let best: string | null = null;
  let bestMs = -Infinity;
  for (const it of items) {
    if (!it.updated_at) continue;
    if (editorAware && (it.last_edited_by == null || it.last_edited_by === myUserId)) continue;
    const u = Date.parse(it.updated_at);
    if (!Number.isNaN(u) && u > bestMs) {
      bestMs = u;
      best = it.updated_at;
    }
  }
  return best;
}

/** 재접속 강조(시머) 유지 시간 — 3분 후 자동 소거(피로 조절). */
export const HIGHLIGHT_HOLD_MS = 3 * 60 * 1000;

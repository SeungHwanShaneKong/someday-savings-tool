// [CL-EDITLABEL-20260626] 항목별 최근 편집자 라벨(나 vs 파트너) — 순수 로직(Supabase/React 비의존).
//
// 개선2: budget_items.last_edited_by(트리거가 auth.uid() 기록, LIVE)를 UI에 표면화.
//   공동편집 모드에서만 의미가 있으며, 호출부(BudgetTable)가 showEditorLabels 로 게이팅한다.
//   changed-since.ts 의 "내 편집·미상(null)은 보수적으로 제외" 철학과 정합 — 미상이면 라벨을 숨겨 오표시 0.

/**
 * 항목의 최근 편집자 라벨을 반환.
 * @param lastEditedBy 항목 last_edited_by(uuid) — null/미상이면 숨김
 * @param myUserId     현재 사용자 id — 없으면(미인증) 숨김
 * @param partnerName  파트너 표시명 — 없으면 "파트너" 폴백
 * @returns "나" | partnerName | "파트너" | null(숨김)
 */
export function getEditorLabel(
  lastEditedBy: string | null | undefined,
  myUserId: string | null | undefined,
  partnerName: string | null | undefined,
): string | null {
  if (myUserId == null || myUserId === '') return null; // 미인증/개인 컨텍스트 → 숨김
  if (lastEditedBy == null || lastEditedBy === '') return null; // 레거시/트리거 미적용 → 숨김(오표시 0)
  if (lastEditedBy === myUserId) return '나';
  return partnerName?.trim() || '파트너'; // 파트너 — 이름 없으면 폴백
}

// [CL-TOP20-P4-COLLAB-20260703-040000] transient "{파트너} 변경" 배지에 병기할 상대시간(순수·결정론).
//   now 를 주입받아 CI 완전 검증 가능. 시계 스큐(미래 updated_at)는 "방금"으로 안전 폴백.
/**
 * updated_at(ISO) → 한국어 상대시간 문자열.
 * @param iso   서버 updated_at (ISO 8601). null/미상/파싱불가 → null(표시 안 함)
 * @param nowMs 기준 시각(epoch ms) — 호출측이 Date.now() 주입
 * @returns "방금"(60초 미만·미래 포함) | "N분 전" | "N시간 전" | "N일 전" | null
 */
export function formatRelativeTime(
  iso: string | null | undefined,
  nowMs: number,
): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const diff = nowMs - t;
  if (diff < 60_000) return '방금'; // 음수(미래·스큐)도 "방금"으로 흡수
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`;
  return `${Math.floor(diff / 86_400_000)}일 전`;
}

/**
 * [CL-TOP20-P4-GAMIFY-20260703-040000] "사용자 생애 첫 배지" 판별 순수 함수
 * - useBadgeUnlock 이 pendingUnlock 생성 시점에 호출 — DB 신규 조회 금지 원칙:
 *   평가 컨텍스트에 이미 실려 있는 already_unlocked_slugs(기존 획득 슬러그)만 사용한다.
 * - 같은 배치에서 여러 배지가 동시에 열리면 첫 번째 1개만 true (풀스크린 축하 1회).
 *
 * [CL-SEC-AUDIT-20260703-101500] 취약점 #5[edge] 근본수정 — null/undefined = "미상" ≠ "배지 0개".
 *   과거: (null?.length ?? 0)===0 이 true → null(DB오류/미상)을 "첫 배지"로 오판,
 *   이미 배지 보유한 사용자에게 풀스크린 축하가 오발동했다.
 *   수정: alreadyUnlockedSlugs == null 이면 즉시 false(보수적·오발동 방지).
 *   []([]=진짜 배지 0개, 신규 유저)는 여전히 true 여서 정당한 첫 배지 축하는 유지된다.
 */
export function isFirstBadgeUnlock(
  alreadyUnlockedSlugs: ReadonlyArray<string> | null | undefined,
  batchIndex: number,
): boolean {
  // 미상(null/undefined)은 "0개"가 아니라 "알 수 없음" → 보수적으로 첫 배지 아님.
  if (alreadyUnlockedSlugs == null) return false;
  return alreadyUnlockedSlugs.length === 0 && batchIndex === 0;
}

/**
 * [CL-TOP20-P4-GAMIFY-20260703-040000] "사용자 생애 첫 배지" 판별 순수 함수
 * - useBadgeUnlock 이 pendingUnlock 생성 시점에 호출 — DB 신규 조회 금지 원칙:
 *   평가 컨텍스트에 이미 실려 있는 already_unlocked_slugs(기존 획득 슬러그)만 사용한다.
 * - 같은 배치에서 여러 배지가 동시에 열리면 첫 번째 1개만 true (풀스크린 축하 1회).
 */
export function isFirstBadgeUnlock(
  alreadyUnlockedSlugs: ReadonlyArray<string> | null | undefined,
  batchIndex: number,
): boolean {
  return (alreadyUnlockedSlugs?.length ?? 0) === 0 && batchIndex === 0;
}

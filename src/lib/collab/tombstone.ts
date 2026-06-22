// [CL-AUDIT-R3-TOMBSTONE-20260623-000000] 삭제 좀비 방지용 툼스톤 스토어 (순수·CI 검증 가능)
//
// 배경(R3 P1): 기존 인라인 구현은 isTombstoned(id)가 "그 id로" 호출될 때만 lazy 청소했는데,
//   삭제된 id 는 이후 어디서도 재조회되지 않아(살아있는 행만 순회) 엔트리가 세션 내내 잔존 → 무제한 증식(메모리 누수).
// 근본 수정: mark() 시점에 TTL 만료분을 **일괄 스윕**해 크기를 유한하게 유지한다(O(n) 1회).
//   now 주입으로 TTL 동작을 결정론적으로 단위테스트한다.

export interface TombstoneStore {
  /** 삭제 id 등록(+ 만료분 일괄 스윕) */
  mark(id: string): void;
  /** TTL 내 삭제 id 인가? (만료분은 조회 시에도 제거) */
  isTombstoned(id: string): boolean;
  /** 현재 보관 엔트리 수(테스트/관측용) */
  size(): number;
}

export function createTombstoneStore(
  ttlMs = 30_000,
  now: () => number = () => Date.now(),
): TombstoneStore {
  const map = new Map<string, number>();
  const sweep = (t: number) => {
    for (const [k, ts] of map) {
      if (t - ts > ttlMs) map.delete(k);
    }
  };
  return {
    mark(id: string) {
      const t = now();
      sweep(t); // 등록 때마다 만료분 청소 → 무제한 증식 차단
      map.set(id, t);
    },
    isTombstoned(id: string) {
      const ts = map.get(id);
      if (ts === undefined) return false;
      if (now() - ts > ttlMs) {
        map.delete(id);
        return false;
      }
      return true;
    },
    size() {
      return map.size;
    },
  };
}

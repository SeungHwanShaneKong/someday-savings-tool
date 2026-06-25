// [CL-PARTNER-DIFF-20260623-230113] 재접속 변경감지 검증
import { describe, it, expect } from 'vitest';
import { computeChangedSince, lastSeenKey, maxUpdatedAt } from '../changed-since';

const mk = (id: string, updated_at: string | null) => ({ id, updated_at });

describe('computeChangedSince (파트너 변경 항목)', () => {
  it('CS.1 lastSeen null → 빈셋(최초 진입 강조 안 함)', () => {
    expect(computeChangedSince([mk('a', '2026-06-23T00:00:00Z')], null).size).toBe(0);
  });

  it('CS.2 lastSeen 이후 updated 만 포함', () => {
    const items = [mk('a', '2026-06-23T00:00:00Z'), mk('b', '2026-06-23T02:00:00Z')];
    expect([...computeChangedSince(items, '2026-06-23T01:00:00Z')]).toEqual(['b']);
  });

  it('CS.3 동일/이전 시각은 제외(strict >)', () => {
    expect(computeChangedSince([mk('a', '2026-06-23T01:00:00Z')], '2026-06-23T01:00:00Z').size).toBe(0);
  });

  it('CS.4 updated_at 없음/파싱불가 항목 안전 스킵', () => {
    const items = [mk('a', null), mk('b', 'not-a-date'), mk('c', '2026-06-23T03:00:00Z')];
    expect([...computeChangedSince(items, '2026-06-23T01:00:00Z')]).toEqual(['c']);
  });

  it('CS.5 lastSeen 파싱불가 → 빈셋', () => {
    expect(computeChangedSince([mk('a', '2026-06-23T03:00:00Z')], 'nope').size).toBe(0);
  });

  it('CS.6 lastSeenKey 포맷', () => {
    expect(lastSeenKey('b1')).toBe('wedsem_last_seen_b1');
  });

  // [CL-VULN-V6-LASTSEEN-MAX-20260624] last-seen 을 now 가 아니라 '스냅샷 항목의 max(updated_at)' 로
  //  전진해, 스냅샷 직후 도착한 더 늦은 파트너 변경이 다음 open 에서 영구 유실되지 않도록(근본수정 회귀가드).
  describe('maxUpdatedAt + 늦은 변경 보존(V6)', () => {
    it('CS.7 파싱가능 updated_at 중 최댓값 ISO 반환', () => {
      const items = [mk('a', '2026-06-23T00:00:00Z'), mk('b', '2026-06-23T05:00:00Z'), mk('c', null)];
      expect(maxUpdatedAt(items)).toBe('2026-06-23T05:00:00Z');
    });
    it('CS.8 모두 없음/파싱불가 → null', () => {
      expect(maxUpdatedAt([mk('a', null), mk('b', 'nope')])).toBeNull();
    });
    it('CS.9 max 전진 시 스냅샷 이후 도착한 더 늦은 변경 보존(now 전진이면 유실)', () => {
      const snapshot = [mk('a', '2026-06-23T13:00:00Z'), mk('b', '2026-06-23T14:00:00Z')];
      const advanced = maxUpdatedAt(snapshot); // 14:00 (스냅샷 최신)
      expect(advanced).toBe('2026-06-23T14:00:00Z');
      const afterArrival = [...snapshot, mk('c', '2026-06-23T14:03:00Z')]; // 직후 도착한 파트너 변경
      // max(14:00)로 전진 → 14:03 > 14:00 → 보존(강조)
      expect([...computeChangedSince(afterArrival, advanced!)]).toEqual(['c']);
      // 대조: now(14:05)로 전진했다면 14:03 < 14:05 → 영구 유실
      expect(computeChangedSince(afterArrival, '2026-06-23T14:05:00Z').size).toBe(0);
    });
  });
});

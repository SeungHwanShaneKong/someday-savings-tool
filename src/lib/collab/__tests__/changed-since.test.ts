// [CL-PARTNER-DIFF-20260623-230113] 재접속 변경감지 검증
import { describe, it, expect } from 'vitest';
import { computeChangedSince, lastSeenKey, maxUpdatedAt } from '../changed-since';

const mk = (id: string, updated_at: string | null) => ({ id, updated_at });
const mkE = (id: string, updated_at: string | null, last_edited_by: string | null) => ({ id, updated_at, last_edited_by });

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

  // [CL-EDIT5-EDITOR-20260625] 편집자 구분(myUserId 인자) — 내 편집 오표시 0 + 파트너 변경만 강조(근본수정).
  describe('편집자 구분 (myUserId)', () => {
    const ME = 'user-me';
    const PARTNER = 'user-partner';
    const LS = '2026-06-25T00:00:00Z';
    const AFTER = '2026-06-25T01:00:00Z'; // lastSeen 이후

    it('CS.10 내 편집(last_edited_by===me)은 updated_at>lastSeen 여도 제외(오표시 0)', () => {
      expect(computeChangedSince([mkE('a', AFTER, ME)], LS, ME).size).toBe(0);
    });
    it('CS.11 파트너 편집(last_edited_by≠me)은 포함', () => {
      expect([...computeChangedSince([mkE('a', AFTER, PARTNER)], LS, ME)]).toEqual(['a']);
    });
    it('CS.12 last_edited_by null(레거시)은 myUserId 주어지면 보수적 제외', () => {
      expect(computeChangedSince([mkE('a', AFTER, null)], LS, ME).size).toBe(0);
    });
    it('CS.13 동시: 내것+파트너것 → 파트너것만 강조', () => {
      const items = [mkE('mine', AFTER, ME), mkE('theirs', AFTER, PARTNER)];
      expect([...computeChangedSince(items, LS, ME)]).toEqual(['theirs']);
    });
    it('CS.14 myUserId 미전달 시 기존 동작(편집자 무시, updated_at만) — 하위호환', () => {
      const items = [mkE('a', AFTER, ME), mkE('b', AFTER, PARTNER)];
      expect([...computeChangedSince(items, LS)].sort()).toEqual(['a', 'b']);
    });

    // [CL-EDIT5-R7BASELINE-20260626] baseline(lastSeen) 전진은 '파트너 변경 max'로만 — 내 편집이 baseline 을 밀어
    //  이후 도착할 파트너 변경을 마스킹하던 R7-1/R7-2 근본수정.
    it('CS.15 maxUpdatedAt(myUserId) — 내 편집·null 제외하고 파트너 max 반환', () => {
      const items = [
        mkE('a', '2026-06-25T14:00:00Z', PARTNER),
        mkE('b', '2026-06-25T14:05:00Z', ME),
        mkE('c', '2026-06-25T13:00:00Z', null),
      ];
      expect(maxUpdatedAt(items)).toBe('2026-06-25T14:05:00Z');       // 필터 없음=전체 max
      expect(maxUpdatedAt(items, ME)).toBe('2026-06-25T14:00:00Z');   // 파트너만
    });
    it('CS.16 내 편집(14:05)이 baseline 을 밀지 않아 이후 파트너 변경(14:03)이 다음 세션 보존', () => {
      const s1 = [mkE('A', '2026-06-25T14:00:00Z', PARTNER), mkE('B', '2026-06-25T14:05:00Z', ME)];
      const baseline = maxUpdatedAt(s1, ME); // 파트너 max=14:00 (내 14:05 무시)
      expect(baseline).toBe('2026-06-25T14:00:00Z');
      const s2 = [...s1, mkE('D', '2026-06-25T14:03:00Z', PARTNER)]; // 그 사이 파트너 변경
      expect([...computeChangedSince(s2, baseline!, ME)]).toContain('D'); // 14:03 > 14:00 → 보존
      // 대조: baseline 이 내 편집(14:05)이었다면 D(14:03) 누락
      expect(computeChangedSince(s2, '2026-06-25T14:05:00Z', ME).has('D')).toBe(false);
    });
  });
});

// [CL-AUDIT-R3-TOMBSTONE-20260623-000000] 툼스톤 스토어 — 무제한 증식(메모리 누수) 회귀 가드
import { describe, it, expect } from 'vitest';
import { createTombstoneStore } from '../tombstone';

describe('createTombstoneStore', () => {
  it('TS.1 mark 후 TTL 내 isTombstoned=true, 신규 id=false', () => {
    let t = 1000;
    const s = createTombstoneStore(30_000, () => t);
    s.mark('a');
    expect(s.isTombstoned('a')).toBe(true);
    expect(s.isTombstoned('b')).toBe(false);
  });

  it('TS.2 TTL 만료 후 isTombstoned=false + 조회 시 엔트리 제거', () => {
    let t = 0;
    const s = createTombstoneStore(30_000, () => t);
    s.mark('a');
    expect(s.size()).toBe(1);
    t = 30_001; // TTL 초과
    expect(s.isTombstoned('a')).toBe(false);
    expect(s.size()).toBe(0); // 조회 시 제거
  });

  it('TS.3 핵심: mark 시점에 만료분 일괄 스윕 → 무제한 증식 차단(메모리 누수 회귀 가드)', () => {
    let t = 0;
    const s = createTombstoneStore(30_000, () => t);
    // 오래된 삭제를 다수 등록(이후 그 id 들은 절대 재조회되지 않는 상황 모사)
    for (let i = 0; i < 100; i++) s.mark(`old-${i}`);
    expect(s.size()).toBe(100);
    // 시간이 TTL 을 넘긴 뒤 새 삭제 1건 → mark 가 만료된 100건을 스윕
    t = 31_000;
    s.mark('fresh');
    expect(s.size()).toBe(1); // 만료분 전부 청소, 신규 1건만 잔존(무제한 증식 없음)
    expect(s.isTombstoned('fresh')).toBe(true);
    expect(s.isTombstoned('old-0')).toBe(false);
  });

  it('TS.4 경계: 정확히 TTL 과 같으면 아직 유효(> 만 만료)', () => {
    let t = 0;
    const s = createTombstoneStore(30_000, () => t);
    s.mark('a');
    t = 30_000; // == TTL → 아직 유효(now - ts > ttl 이 false)
    expect(s.isTombstoned('a')).toBe(true);
    t = 30_001;
    expect(s.isTombstoned('a')).toBe(false);
  });
});

// [CL-TOP20-P4-COLLAB-20260703-040000] formatRelativeTime — transient 배지 상대시간 순수 로직 경계 검증.
//  now 주입(결정론) — 60초/60분/24시간 경계, 파싱불가/null, 미래(시계 스큐) 폴백까지 MECE.
import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from '../editor-label';

const NOW = Date.parse('2026-07-03T04:00:00.000Z');
const isoAgo = (ms: number) => new Date(NOW - ms).toISOString();

describe('formatRelativeTime — 상대시간 경계', () => {
  it('RT.1 null/undefined/빈문자 → null(표시 안 함)', () => {
    expect(formatRelativeTime(null, NOW)).toBeNull();
    expect(formatRelativeTime(undefined, NOW)).toBeNull();
    expect(formatRelativeTime('', NOW)).toBeNull();
  });

  it('RT.2 파싱 불가 ISO → null(크래시 없음)', () => {
    expect(formatRelativeTime('not-a-date', NOW)).toBeNull();
  });

  it('RT.3 60초 미만(0초·59.999초) → "방금"', () => {
    expect(formatRelativeTime(isoAgo(0), NOW)).toBe('방금');
    expect(formatRelativeTime(isoAgo(59_999), NOW)).toBe('방금');
  });

  it('RT.4 60초 경계 → "1분 전", 59분대 상한 → "59분 전"', () => {
    expect(formatRelativeTime(isoAgo(60_000), NOW)).toBe('1분 전');
    expect(formatRelativeTime(isoAgo(3_599_999), NOW)).toBe('59분 전');
  });

  it('RT.5 60분 경계 → "1시간 전", 24시간 직전 → "23시간 전"', () => {
    expect(formatRelativeTime(isoAgo(3_600_000), NOW)).toBe('1시간 전');
    expect(formatRelativeTime(isoAgo(86_399_999), NOW)).toBe('23시간 전');
  });

  it('RT.6 24시간 경계 → "1일 전"', () => {
    expect(formatRelativeTime(isoAgo(86_400_000), NOW)).toBe('1일 전');
    expect(formatRelativeTime(isoAgo(3 * 86_400_000 + 1), NOW)).toBe('3일 전');
  });

  it('RT.7 미래 updated_at(시계 스큐) → "방금" 안전 폴백(음수 노출 금지)', () => {
    expect(formatRelativeTime(isoAgo(-5_000), NOW)).toBe('방금');
  });
});

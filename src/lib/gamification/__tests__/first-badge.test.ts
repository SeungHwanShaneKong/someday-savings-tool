// [CL-TOP20-P4-GAMIFY-20260703-040000] 생애 첫 배지 판별 순수 함수 테스트
import { describe, it, expect } from 'vitest';
import { isFirstBadgeUnlock } from '../first-badge';

describe('isFirstBadgeUnlock — 첫 배지 판별 분기', () => {
  it('F1: 기존 획득 슬러그 0 + 배치 첫 항목 → true (풀스크린)', () => {
    expect(isFirstBadgeUnlock([], 0)).toBe(true);
  });

  it('F2: 기존 슬러그 0 이어도 배치 두 번째부터는 false (축하 1회만)', () => {
    expect(isFirstBadgeUnlock([], 1)).toBe(false);
    expect(isFirstBadgeUnlock([], 2)).toBe(false);
  });

  it('F3: 기존 획득 슬러그 존재 → 항상 false (일반 모달 유지)', () => {
    expect(isFirstBadgeUnlock(['first_budget'], 0)).toBe(false);
    expect(isFirstBadgeUnlock(['a', 'b'], 1)).toBe(false);
  });

  it('F4: null/undefined 슬러그 → 0개로 간주(안전 기본값)', () => {
    expect(isFirstBadgeUnlock(null, 0)).toBe(true);
    expect(isFirstBadgeUnlock(undefined, 0)).toBe(true);
    expect(isFirstBadgeUnlock(null, 1)).toBe(false);
  });
});

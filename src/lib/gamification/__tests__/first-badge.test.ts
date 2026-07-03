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

  // [CL-SEC-AUDIT-20260703-101500] 취약점 #5[edge] 근본수정 — null/undefined = "미상" ≠ "배지 0개".
  //  과거 이 테스트는 null→true(오탐)를 정답으로 고정했으나, 이는 이미 배지 보유한 사용자에게
  //  풀스크린 축하가 오발동하는 결함이었다. 이제 미상은 보수적으로 false(오발동 방지).
  //  단 []([]=진짜 신규 유저)는 여전히 true 여서 정당한 첫 배지 축하는 유지(F1 참조).
  it('F4: null/undefined 슬러그(미상/DB오류) → false (오발동 방지)', () => {
    expect(isFirstBadgeUnlock(null, 0)).toBe(false);
    expect(isFirstBadgeUnlock(undefined, 0)).toBe(false);
    expect(isFirstBadgeUnlock(null, 1)).toBe(false);
  });
});

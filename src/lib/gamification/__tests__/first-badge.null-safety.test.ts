// [CL-SEC-AUDIT-20260703-101500] 취약점 #5[edge] 입증·검증 테스트 — isFirstBadgeUnlock null-오탐 근본수정
//
// 취약점: alreadyUnlockedSlugs 가 null(=미상/DB오류)이면 (null?.length ?? 0)===0 이 true 로 평가돼
//   "생애 첫 배지"로 오판 → 이미 배지를 보유한 사용자에게 풀스크린 축하가 오발동한다.
//   null 은 "배지 0개"가 아니라 "알 수 없음"이므로 0개로 취급하는 것이 근본 결함.
// 근본수정 원칙: null/undefined = 미상 → 보수적으로 '첫 배지 아님(false)' 처리(오발동 방지).
//   단 []([]=진짜 배지 0개, 신규 유저)는 여전히 true 여야 첫 배지 축하가 죽지 않는다.
import { describe, it, expect } from 'vitest';
import { isFirstBadgeUnlock } from '../first-badge';

describe('isFirstBadgeUnlock — null-safety 근본수정(취약점 #5)', () => {
  // ── 핵심 회귀 매트릭스: null/undefined→false, []→true, ['x']→false, batchIndex≠0→false ──
  it('S1: null 슬러그(미상/DB오류) → false (오발동 방지 — 배치 첫 항목이어도)', () => {
    // 수정 전: (null?.length ?? 0)===0 && 0===0 → true (오탐). 수정 후: null == null → false.
    expect(isFirstBadgeUnlock(null, 0)).toBe(false);
  });

  it('S2: undefined 슬러그(미상) → false', () => {
    expect(isFirstBadgeUnlock(undefined, 0)).toBe(false);
  });

  it('S3: [] (진짜 배지 0개 = 신규 유저) → true (첫 배지 축하 유지)', () => {
    expect(isFirstBadgeUnlock([], 0)).toBe(true);
  });

  it("S4: ['x'] (기존 배지 보유) → false", () => {
    expect(isFirstBadgeUnlock(['first_budget'], 0)).toBe(false);
    expect(isFirstBadgeUnlock(['a', 'b'], 0)).toBe(false);
  });

  it('S5: batchIndex ≠ 0 → 어떤 입력이어도 false (풀스크린 1회만)', () => {
    expect(isFirstBadgeUnlock([], 1)).toBe(false);
    expect(isFirstBadgeUnlock([], 2)).toBe(false);
    expect(isFirstBadgeUnlock(null, 1)).toBe(false);
    expect(isFirstBadgeUnlock(undefined, 3)).toBe(false);
    expect(isFirstBadgeUnlock(['x'], 1)).toBe(false);
  });

  it('S6: null + batchIndex≠0 (이중 안전) → false', () => {
    expect(isFirstBadgeUnlock(null, 5)).toBe(false);
  });
});

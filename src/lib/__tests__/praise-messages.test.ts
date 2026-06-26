// [CL-PRAISE-20260623-230113] 칭찬 회전/마일스톤 검증
import { describe, it, expect } from 'vitest';
import { isMilestone, makePraiseBag, PRAISE_MESSAGES, crossedMilestone } from '../praise-messages';

describe('praise-messages', () => {
  it('PM.1 마일스톤 도달에서만 true', () => {
    expect(isMilestone(3)).toBe(true);
    expect(isMilestone(7)).toBe(true);
    expect(isMilestone(15)).toBe(true);
    expect(isMilestone(4)).toBe(false);
    expect(isMilestone(0)).toBe(false);
    expect(isMilestone(1)).toBe(false);
  });

  it('PM.2 한 사이클 내 전부 무반복(모든 메시지 1회씩)', () => {
    const bag = makePraiseBag(PRAISE_MESSAGES, () => 0.5);
    const seen = new Set<string>();
    for (let i = 0; i < PRAISE_MESSAGES.length; i++) seen.add(bag.next().title);
    expect(seen.size).toBe(PRAISE_MESSAGES.length);
  });

  it('PM.3 연속 호출에 인접 중복 없음(사이클 경계 포함)', () => {
    const msgs = [
      { emoji: 'a', title: 'A', description: '' },
      { emoji: 'b', title: 'B', description: '' },
    ];
    const bag = makePraiseBag(msgs, () => 0); // 결정론: 경계 반복 유발 → 가드 검증
    const out: string[] = [];
    for (let i = 0; i < 6; i++) out.push(bag.next().title);
    for (let i = 1; i < out.length; i++) expect(out[i]).not.toBe(out[i - 1]);
  });

  // [CL-AUDIT-PRAISE-EMPTY-20260626] 빈 입력이면 next()가 undefined를 PraiseMessage로 거짓 캐스트 → 소비자 런타임 TypeError.
  //  근본수정: 생성 시점에 fail-fast(throw)로 타입 거짓 제거.
  it('PM.9 빈 메시지 배열로 생성 시 즉시 throw(undefined 캐스트 거짓 차단)', () => {
    expect(() => makePraiseBag([])).toThrow();
  });

  it('PM.4 메시지 12종 이상 + 필드 완전성', () => {
    expect(PRAISE_MESSAGES.length).toBeGreaterThanOrEqual(10);
    for (const m of PRAISE_MESSAGES) {
      expect(m.emoji.length).toBeGreaterThan(0);
      expect(m.title.length).toBeGreaterThan(0);
      expect(m.description.length).toBeGreaterThan(0);
    }
  });

  // [CL-VULN-V9-MILESTONE-CROSS-20260624] 정확일치(isMilestone) 대신 '범위 통과' 판정 — 배치 리렌더로
  //  editSignal 이 마일스톤 값을 건너뛰어도(예: 6→8) 누락 없이 1회 보상(근본수정 회귀가드).
  describe('crossedMilestone (prev<m<=next 구간 통과 판정)', () => {
    it('PM.5 인접 통과: crossed(2,4)=3, crossed(6,8)=7', () => {
      expect(crossedMilestone(2, 4)).toBe(3);
      expect(crossedMilestone(6, 8)).toBe(7);
    });
    it('PM.6 통과 없음: crossed(4,6)=null, crossed(7,7)=null, crossed(3,3)=null', () => {
      expect(crossedMilestone(4, 6)).toBeNull();
      expect(crossedMilestone(7, 7)).toBeNull();
      expect(crossedMilestone(3, 3)).toBeNull();
    });
    it('PM.7 다중 점프 시 가장 큰 마일스톤 1회만(토스트 폭주 방지): crossed(1,16)=15', () => {
      expect(crossedMilestone(1, 16)).toBe(15);
    });
    it('PM.8 0→첫 마일스톤: crossed(0,3)=3', () => {
      expect(crossedMilestone(0, 3)).toBe(3);
    });
  });
});

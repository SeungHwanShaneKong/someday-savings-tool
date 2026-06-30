// [CL-AUDIT-R9-K09PERF-20260630] countSignupToBudget24h 골든 — O(P+B) 리팩터가 기존 O(P×B)와 '비트 동일'함을 입증.
import { describe, it, expect } from 'vitest';
import { countSignupToBudget24h, type SignupRow, type BudgetRow } from '@/lib/admin/conversion';

const iso = (y: number, mo: number, d: number, h = 10) => new Date(y, mo, d, h, 0, 0).toISOString();

// 기존 인라인 로직과 동일한 '느린 참조 구현'(O(P×B)) — 동치 비교용.
function naiveReference(profiles: SignupRow[], budgets: BudgetRow[]): number {
  let n = 0;
  for (const p of profiles) {
    const signupTime = new Date(p.created_at).getTime();
    const has = budgets.some(
      (b) =>
        b.user_id === p.user_id &&
        new Date(b.created_at).getTime() - signupTime <= 86400000 &&
        new Date(b.created_at).getTime() >= signupTime,
    );
    if (has) n++;
  }
  return n;
}

describe('countSignupToBudget24h — K09 (O(P+B) 동치)', () => {
  it('CV.1 24h 이내/초과/이전·무예산·다중예산 경계', () => {
    const profiles: SignupRow[] = [
      { user_id: 'a', created_at: iso(2026, 5, 1, 9) }, // 24h내 예산 → count
      { user_id: 'b', created_at: iso(2026, 5, 1, 9) }, // 25h후 예산 → no
      { user_id: 'c', created_at: iso(2026, 5, 1, 9) }, // 가입 이전 예산 → no
      { user_id: 'd', created_at: iso(2026, 5, 1, 9) }, // 무예산 → no
      { user_id: 'e', created_at: iso(2026, 5, 1, 9) }, // 첫건 초과+둘째건 24h내 → count
    ];
    const budgets: BudgetRow[] = [
      { user_id: 'a', created_at: iso(2026, 5, 1, 20) }, // +11h
      { user_id: 'b', created_at: iso(2026, 5, 2, 11) }, // +26h
      { user_id: 'c', created_at: iso(2026, 4, 30, 9) }, // -1d
      { user_id: 'e', created_at: iso(2026, 5, 3, 9) }, // +48h
      { user_id: 'e', created_at: iso(2026, 5, 1, 18) }, // +9h
      { user_id: 'z', created_at: iso(2026, 5, 1, 18) }, // 프로필 없는 예산 → 무시
    ];
    expect(countSignupToBudget24h(profiles, budgets)).toBe(2); // a, e
    expect(countSignupToBudget24h(profiles, budgets)).toBe(naiveReference(profiles, budgets));
  });

  it('CV.2 정확히 경계(=24h0분0초)는 포함(inclusive)', () => {
    const profiles: SignupRow[] = [{ user_id: 'a', created_at: iso(2026, 5, 1, 0) }];
    const budgets: BudgetRow[] = [{ user_id: 'a', created_at: iso(2026, 5, 2, 0) }]; // 정확히 +24h
    expect(countSignupToBudget24h(profiles, budgets)).toBe(1);
  });

  it('CV.3 빈 입력 → 0', () => {
    expect(countSignupToBudget24h([], [])).toBe(0);
    expect(countSignupToBudget24h([{ user_id: 'a', created_at: iso(2026, 5, 1) }], [])).toBe(0);
  });

  it('CV.4 대량 의사난수 셋에서도 참조 구현과 동치(결정론 시드)', () => {
    // 결정론 LCG (Date/Math.random 미사용)
    let seed = 12345;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const profiles: SignupRow[] = [];
    const budgets: BudgetRow[] = [];
    for (let i = 0; i < 300; i++) {
      const uid = `u${i % 120}`;
      const base = new Date(2026, 5, 1).getTime() + Math.floor(rnd() * 30) * 86400000;
      profiles.push({ user_id: uid, created_at: new Date(base).toISOString() });
      // 예산: 가입 전후 ±48h 임의
      budgets.push({ user_id: uid, created_at: new Date(base + Math.floor((rnd() - 0.5) * 4) * 86400000 + Math.floor(rnd() * 86400000)).toISOString() });
    }
    expect(countSignupToBudget24h(profiles, budgets)).toBe(naiveReference(profiles, budgets));
  });
});

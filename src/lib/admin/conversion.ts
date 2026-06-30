// [CL-AUDIT-R9-K09PERF-20260630] 가입→예산 생성(24h) 전환 — O(P×B) 중첩 스캔 제거(근본수정).
//
// 결함(적대감사 R9): useAdminKPI 의 K09 가 `for(profiles){ budgets.some(...) }` + 비교마다 new Date() 2회로
//   O(P×B) 였다(같은 함수의 K10·retention.ts 는 이미 Map 인덱스 O(P+B) 인데 K09만 누락 = 일관성 위반).
// 수정: budgets 1회 순회로 user_id→생성시각(ms) 인덱스 구축 후 profiles 를 O(P) 조회. Date 파싱 1회.
//   결과(count)는 기존과 '비트 동일'(동일 inclusive 조건: signup ≤ budgetTime ≤ signup+24h). 골든으로 동치 고정.

export interface SignupRow {
  user_id: string;
  created_at: string;
}
export interface BudgetRow {
  user_id: string;
  created_at: string;
}

const DAY_MS = 86400000;

/**
 * 가입 후 24시간 이내에 예산을 1개 이상 생성한 사용자 수(O(P+B)).
 * 조건: 어떤 예산의 생성시각 t 가 signup ≤ t ≤ signup+24h.
 */
export function countSignupToBudget24h(profiles: SignupRow[], budgets: BudgetRow[]): number {
  // user_id → 예산 생성시각(ms) 목록 (created_at 파싱 1회)
  const byUser = new Map<string, number[]>();
  for (const b of budgets) {
    const t = new Date(b.created_at).getTime();
    const arr = byUser.get(b.user_id);
    if (arr) arr.push(t);
    else byUser.set(b.user_id, [t]);
  }

  let count = 0;
  for (const p of profiles) {
    const signup = new Date(p.created_at).getTime();
    const ts = byUser.get(p.user_id);
    if (ts && ts.some((t) => t >= signup && t - signup <= DAY_MS)) count++;
  }
  return count;
}

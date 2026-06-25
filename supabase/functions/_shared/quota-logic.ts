// [CL-VULN-R8-AIQUOTA-20260626-000000] AI 일일 한도 결정·원자 예약 로직(순수·Deno/원격 import 비종속).
//
// Edge(_shared/rate-limit.ts)와 vitest 가 공유. 부수효과·런타임 의존 없음.
//   - D1(변조내성): 한도 진실원을 사용자가 삭제 가능한 ai_conversations 가 아닌 service_role 전용 ai_usage 원장으로 분리.
//   - D2(TOCTOU): count-then-act(비원자) → reserve-before-call(원자 증가 후 카운트 비교)로 전환.
// DB 의 `INSERT ... ON CONFLICT(user_id,feature,usage_day) DO UPDATE SET n=n+1 RETURNING n` 가 행 잠금으로 직렬화하는 것을
//   인메모리로 모사한 모델(테스트용) + 한도 판정 순수함수.

/** 원자 증가 '후' 카운트 n 이 한도 이내인가(n<=limit). reserve 가 반환한 n 으로 호출부가 429 판정. */
export function isWithinQuota(nAfterIncrement: number, limit: number): boolean {
  return nAfterIncrement <= limit;
}

/** (버그 모델) 구 check-then-act: insert 이전 관측 count 만으로 허용 → 동시 요청이 같은 스냅샷을 보면 전부 통과. */
export function checkThenActAllows(observedCount: number, limit: number): boolean {
  return observedCount < limit;
}

/**
 * (픽스 모델) (user_id, feature, usage_day) 별 원자 일일 카운터.
 * DB 의 ON CONFLICT DO UPDATE SET n=n+1 RETURNING n 을 인메모리로 모사 — reserve 는 '증가 후' 카운트를 반환.
 */
export class DailyQuotaLedger {
  private m = new Map<string, number>();
  private key(userId: string, feature: string, day: string): string {
    return `${userId}|${feature}|${day}`;
  }
  reserve(userId: string, feature: string, day: string): number {
    const k = this.key(userId, feature, day);
    const n = (this.m.get(k) ?? 0) + 1;
    this.m.set(k, n);
    return n;
  }
  peek(userId: string, feature: string, day: string): number {
    return this.m.get(this.key(userId, feature, day)) ?? 0;
  }
}

/** UTC 기준 오늘(YYYY-MM-DD) — usage_day 키. */
export function quotaDay(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/**
 * reserveDailyLimit 의 순수 결정 로직(글루까지 기계검증 가능하게 분리).
 *   - rpcValue=원자 RPC 반환(증가 후 카운트, number) → used=rpcValue (reserve 모드).
 *   - rpcValue=null(RPC 미배포/오류) → fallbackUsedPlusOne(구 count+1, 이번 요청 포함 예측치)로 안전 강등.
 * 두 경로 모두 used 는 '이번 요청 포함' post-increment 의미라 호출부는 항상 remaining=limit-used 로 일관 계산.
 */
export function decideFromReserve(
  rpcValue: number | null | undefined,
  limit: number,
  fallbackUsedPlusOne: number,
): { allowed: boolean; used: number } {
  const used = typeof rpcValue === 'number' ? rpcValue : fallbackUsedPlusOne;
  return { allowed: used <= limit, used };
}

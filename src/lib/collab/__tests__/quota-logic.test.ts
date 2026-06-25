// [CL-VULN-R8-AIQUOTA-20260626] AI 일일 한도 원자 예약 로직 검증 (D1 변조내성 + D2 TOCTOU).
//  Edge(Deno)/실 Postgres 는 이 환경서 실행 불가 → 한도 결정·원자 예약 로직을 Deno-비종속 순수 모듈로 추출해 vitest 입증.
//  실 동시성/실 RPC 는 마이그 적용 + Edge 배포 후 사용자 라이브 검증.
import { describe, it, expect } from 'vitest';
import {
  isWithinQuota,
  checkThenActAllows,
  DailyQuotaLedger,
  decideFromReserve,
} from '../../../../supabase/functions/_shared/quota-logic';

describe('quota-logic D2 — 원자 예약(reserve-before-call) vs 구 check-then-act', () => {
  it('isWithinQuota: 증가-후 카운트 n<=limit 이면 허용', () => {
    expect(isWithinQuota(1, 5)).toBe(true);
    expect(isWithinQuota(5, 5)).toBe(true);
    expect(isWithinQuota(6, 5)).toBe(false);
  });

  it('D2.bug 구 check-then-act: 동시 N요청이 같은 count(0)를 보면 전부 통과(한도 우회)', () => {
    // insert 이전 동일 스냅샷(0)을 N번 관측 → 전부 < limit → 전부 통과 = TOCTOU 버그
    const limit = 5;
    const concurrent = 50;
    let passed = 0;
    for (let i = 0; i < concurrent; i++) if (checkThenActAllows(0, limit)) passed += 1;
    expect(passed).toBe(concurrent); // 50건 모두 통과(=한도 5 우회) — 버그 입증
  });

  it('D2.fix 원자 예약: 동시 N요청이라도 정확히 limit 건만 통과(DB 행 잠금 직렬화 모사)', () => {
    const ledger = new DailyQuotaLedger();
    const limit = 5;
    const concurrent = 50;
    let allowed = 0;
    for (let i = 0; i < concurrent; i++) {
      const n = ledger.reserve('u1', 'qa', '2026-06-26'); // 원자 증가 후 카운트 반환
      if (isWithinQuota(n, limit)) allowed += 1;
    }
    expect(allowed).toBe(limit);            // 정확히 5건만 통과 — 우회 차단
    expect(ledger.reserve('u1', 'qa', '2026-06-26')).toBe(concurrent + 1); // 단조 증가 유지
  });

  it('D1 변조내성: 예약 원장은 user_id+feature+day 별 독립 — 다른 날/feature 는 분리', () => {
    const ledger = new DailyQuotaLedger();
    expect(ledger.reserve('u1', 'qa', '2026-06-26')).toBe(1);
    expect(ledger.reserve('u1', 'qa', '2026-06-27')).toBe(1); // 다음날 자동 리셋
    expect(ledger.reserve('u1', 'budget', '2026-06-26')).toBe(1); // feature 분리
    expect(ledger.reserve('u2', 'qa', '2026-06-26')).toBe(1); // 유저 분리
  });

  it('decideFromReserve: RPC 성공이면 post-increment n 으로 판정(n<=limit)', () => {
    expect(decideFromReserve(1, 5, 999)).toEqual({ allowed: true, used: 1 });
    expect(decideFromReserve(5, 5, 999)).toEqual({ allowed: true, used: 5 });
    expect(decideFromReserve(6, 5, 999)).toEqual({ allowed: false, used: 6 });
  });

  it('decideFromReserve: RPC 미배포(null/undefined)면 fallback(count+1)로 안전 강등 — 게이트 동등', () => {
    // 구 count=4(슬롯 1개 남음) → fallback=5 → 통과; 구 count=5(소진) → fallback=6 → 차단
    expect(decideFromReserve(null, 5, 5)).toEqual({ allowed: true, used: 5 });
    expect(decideFromReserve(undefined, 5, 6)).toEqual({ allowed: false, used: 6 });
  });
});

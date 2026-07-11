// [CL-POKE-VIS-20260711-173901] 파트너 '콕 찌르기' 비모달 넛지 순수 로직 — 노출 판정·스토리지 키.
//
// 설계(poke-logic.ts 와 동일 순수성 계약):
//  - 부수효과 0. localStorage 접근은 전부 호출측(PokeNudgeCard)이 try/catch 로 수행하고,
//    이 모듈은 nowMs·suppressedAtMs·alreadyShownTodayKST 등 '읽힌 값'만 받아 boolean 을 돌려준다.
//  - 트리거 = 내가 이번 세션에 편집(myEditedThisSession) + 파트너가 3일+ 조용(quiet)
//    + 지금 찌를 수 있음(canPokeNow) + 파트너 존재(active). 하나라도 결여 → false(보수).
//  - 상한 = KST 하루 1회(alreadyShownTodayKST) + '한 달간 다시 보지 않기' 30일 억제(suppressedAtMs).
//  - KST 일자 문자열(YYYY-MM-DD)은 toKSTDateString(src/lib/gamification/streak-calc.ts)을 호출측이
//    재사용해 pokeNudgeShownKey 에 주입한다(이 모듈은 시계를 읽지 않는다 — vitest 직접 검증).

/** 파트너가 '조용하다'고 판정하는 최소 무편집 기간 — 3일. */
export const PARTNER_QUIET_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;

/** '한 달간 다시 보지 않기' 억제 기간 — 30일. */
export const POKE_NUDGE_SUPPRESS_MS = 30 * 24 * 60 * 60 * 1000;

/** KST 일자별 '오늘 이미 노출' 키 — kstDate 는 toKSTDateString() 결과(YYYY-MM-DD). */
export function pokeNudgeShownKey(userId: string, kstDate: string): string {
  return `poke_nudge_shown_${userId}_${kstDate}`;
}

/** '한 달간 다시 보지 않기' 체크 시각(epoch ms) 저장 키. */
export function pokeNudgeSuppressKey(userId: string): string {
  return `poke_nudge_suppressed_at_${userId}`;
}

export interface PokeNudgeSignals {
  /** 파트너 존재('우리' 모드 + myPartner) — false 면 무조건 미노출 */
  active: boolean;
  /** 내가 이번 세션에 성공 편집을 했는가(editSignal > 0) */
  myEditedThisSession: boolean;
  /** 파트너의 마지막 편집 시각(ISO) — maxUpdatedAt(items, myUserId). null=파트너 편집 이력 없음 */
  partnerLastEditISO: string | null;
  /** 지금 콕 찌르기 가능(쿨다운 아님) */
  canPokeNow: boolean;
  /** 오늘(KST) 이미 노출했는가 */
  alreadyShownTodayKST: boolean;
  /** '한 달간 다시 보지 않기' 기록 시각(epoch ms). null/비유한수 = 미억제 */
  suppressedAtMs: number | null;
  /** 판정 기준 시각(epoch ms) — 테스트가 직접 주입(fake timer 불요) */
  nowMs: number;
}

/**
 * 비모달 넛지 노출 판정.
 *  - partnerLastEditISO null/파싱불가 → false(보수: '조용'을 입증할 수 없으면 찌르지 않는다).
 *  - quiet = nowMs - parse >= 3일(정확 경계 포함 — canPoke 의 >= 원칙과 동일).
 *  - 억제 = 0 <= nowMs - suppressedAtMs < 30일. 음수 delta(기록이 미래 = 시계 역행)는 비억제 —
 *    poke-logic canPoke 의 음수 delta 허용 원칙과 동일(영구 잠금 고착 방지, 서버가 최종 권위).
 */
export function shouldShowPokeNudge(signals: PokeNudgeSignals): boolean {
  const {
    active,
    myEditedThisSession,
    partnerLastEditISO,
    canPokeNow,
    alreadyShownTodayKST,
    suppressedAtMs,
    nowMs,
  } = signals;
  if (!active || !myEditedThisSession || !canPokeNow || alreadyShownTodayKST) return false;
  if (suppressedAtMs != null && Number.isFinite(suppressedAtMs)) {
    const delta = nowMs - suppressedAtMs;
    if (delta >= 0 && delta < POKE_NUDGE_SUPPRESS_MS) return false;
  }
  if (!partnerLastEditISO) return false;
  const lastEditMs = Date.parse(partnerLastEditISO);
  if (Number.isNaN(lastEditMs)) return false;
  return nowMs - lastEditMs >= PARTNER_QUIET_THRESHOLD_MS;
}

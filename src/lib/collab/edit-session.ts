// [CL-COEDIT-NUDGE-20260623-230113] 파트너 편집 알림 트리거 — 2분 연속 편집 세션 감지(순수 reducer, CI 검증 가능)
//
// 개선2: 공동편집 중인 사람이 한 '세션' 동안 2분 이상 편집을 지속하면, 부재 파트너에게 1회 알림(이메일)을 보낸다.
//   - 세션 = 편집들이 IDLE_RESET_MS(10분) 이내로 이어진 구간. 그보다 길게 쉬면 새 세션으로 리셋.
//   - 한 세션당 nudge 는 1회만(notifiedThisSession). 하루 1회·글로벌 캡은 서버(Edge)가 최종 강제.
// now 를 주입받는 순수 함수라 타이머/시계 비의존으로 완전 단위검증 가능.

export const NUDGE_MS = 2 * 60 * 1000; // 2분
export const IDLE_RESET_MS = 10 * 60 * 1000; // 10분 무편집 → 세션 리셋

export interface EditSessionState {
  /** 현재 세션의 첫 편집 시각(ms epoch). 세션 없음=null */
  editSessionStart: number | null;
  /** 마지막 편집 시각(ms epoch) */
  lastEditAt: number | null;
  /** 이번 세션에서 이미 nudge 를 발사했는가 */
  notifiedThisSession: boolean;
}

export const initialEditSession: EditSessionState = {
  editSessionStart: null,
  lastEditAt: null,
  notifiedThisSession: false,
};

export interface NudgeDecision {
  state: EditSessionState;
  /** 이번 편집으로 알림을 보내야 하는가(세션 누적 ≥ 2분 & 미발사) */
  nudge: boolean;
}

/**
 * 편집 1건(now) 발생 시 다음 세션 상태 + nudge 여부를 계산한다(순수).
 * - 세션 없음 또는 직전 편집과 간격 > IDLE_RESET_MS → 새 세션 시작(notified 리셋).
 * - 세션 누적(now - editSessionStart) ≥ NUDGE_MS 이고 아직 미발사면 nudge=true(+발사 플래그).
 */
export function onEdit(prev: EditSessionState, now: number): NudgeDecision {
  let s: EditSessionState;
  const idleExceeded = prev.lastEditAt !== null && now - prev.lastEditAt > IDLE_RESET_MS;
  // [CL-VULN-V7-CLOCKREWIND-20260624-000000] 시계 역행(now 후퇴) 방어 — now 가 세션 기준 시각보다 과거면
  //  elapsed 산술이 음수가 되어 2분을 넘겨도 nudge 가 영구 false 로 고착되고 idle 리셋도 못 한다.
  //  역행은 '연속 세션' 가정을 깨므로 idle 과 동급으로 취급해 새 세션으로 재시작(의미상 정확·완전 단위검증).
  const clockRewind =
    (prev.editSessionStart !== null && now < prev.editSessionStart) ||
    (prev.lastEditAt !== null && now < prev.lastEditAt);
  if (prev.editSessionStart === null || idleExceeded || clockRewind) {
    s = { editSessionStart: now, lastEditAt: now, notifiedThisSession: false };
  } else {
    s = { editSessionStart: prev.editSessionStart, lastEditAt: now, notifiedThisSession: prev.notifiedThisSession };
  }

  const elapsed = now - (s.editSessionStart as number);
  if (!s.notifiedThisSession && elapsed >= NUDGE_MS) {
    return { state: { ...s, notifiedThisSession: true }, nudge: true };
  }
  return { state: s, nudge: false };
}

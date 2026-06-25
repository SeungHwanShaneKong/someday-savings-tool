// [CL-COEDIT-NUDGE-20260623-230113] 2분 세션 nudge reducer 검증
import { describe, it, expect } from 'vitest';
import { onEdit, initialEditSession, NUDGE_MS, IDLE_RESET_MS } from '../edit-session';

const T0 = 1_700_000_000_000;

describe('edit-session.onEdit (2분 연속편집 → 1회 nudge)', () => {
  it('ES.1 첫 편집은 nudge 안 함(누적 0) + 세션 시작', () => {
    const r = onEdit(initialEditSession, T0);
    expect(r.nudge).toBe(false);
    expect(r.state.editSessionStart).toBe(T0);
    expect(r.state.notifiedThisSession).toBe(false);
  });

  it('ES.2 2분 경과 후 편집 → nudge 1회 + 발사 플래그', () => {
    const s = onEdit(initialEditSession, T0).state;
    const r = onEdit(s, T0 + NUDGE_MS);
    expect(r.nudge).toBe(true);
    expect(r.state.notifiedThisSession).toBe(true);
  });

  it('ES.3 같은 세션 추가 편집은 재발사 안 함(세션당 1회)', () => {
    let s = onEdit(initialEditSession, T0).state;
    s = onEdit(s, T0 + NUDGE_MS).state; // nudged
    const r = onEdit(s, T0 + NUDGE_MS + 30_000);
    expect(r.nudge).toBe(false);
  });

  it('ES.4 2분 미만 편집들은 nudge 안 함', () => {
    let s = onEdit(initialEditSession, T0).state;
    let r = onEdit(s, T0 + 60_000);
    expect(r.nudge).toBe(false);
    s = r.state;
    r = onEdit(s, T0 + 119_000);
    expect(r.nudge).toBe(false);
  });

  it('ES.5 idle(>10분) 후 세션 리셋 → 다시 2분 채우면 재발사', () => {
    let s = onEdit(initialEditSession, T0).state;
    s = onEdit(s, T0 + NUDGE_MS).state; // session1 nudged
    const reset = onEdit(s, T0 + NUDGE_MS + IDLE_RESET_MS + 60_000); // 10분+ idle → reset
    expect(reset.nudge).toBe(false);
    expect(reset.state.notifiedThisSession).toBe(false);
    const start2 = reset.state.editSessionStart as number;
    const r2 = onEdit(reset.state, start2 + NUDGE_MS);
    expect(r2.nudge).toBe(true);
  });

  // [CL-VULN-V7-CLOCKREWIND-20260624] 시계 역행(now 후퇴) 시 세션 영구 고착 방지(근본수정 회귀가드).
  //  과거엔 now<editSessionStart 면 elapsed 가 음수가 되어 2분을 넘겨도 nudge 가 영원히 false 였다(고착).
  it('ES.6 시계 역행(now < editSessionStart) → 세션 재시작(고착 없이 이후 정상 발사)', () => {
    const s = onEdit(initialEditSession, T0).state; // editSessionStart=T0
    const back = onEdit(s, T0 - 300_000); // 시계 5분 과거 점프
    expect(back.nudge).toBe(false);
    expect(back.state.editSessionStart).toBe(T0 - 300_000); // 새 세션 시작(editSessionStart=T0 고착 아님)
    expect(back.state.notifiedThisSession).toBe(false);
    // 역행된 시계 기준 2분 채우면 정상 nudge (영구 고착이면 여기서 false 가 됨)
    const r = onEdit(back.state, T0 - 300_000 + NUDGE_MS);
    expect(r.nudge).toBe(true);
  });

  it('ES.7 미래로 박힌 lastEditAt 후 정상 now → 재시작(음수 elapsed 무판정 방지)', () => {
    const s = onEdit(initialEditSession, T0 + 600_000).state; // 미래 시각으로 세션 시작
    const r = onEdit(s, T0); // now < lastEditAt(미래) → 재시작
    expect(r.state.editSessionStart).toBe(T0);
    expect(r.nudge).toBe(false);
    const r2 = onEdit(r.state, T0 + NUDGE_MS);
    expect(r2.nudge).toBe(true);
  });
});

// [CL-POKE-VIS-20260711-173901] poke-nudge 순수 로직 — 노출 판정 전 게이트·경계·억제 검증(nowMs 주입, fake timer 불요)
import { describe, it, expect } from 'vitest';
import {
  PARTNER_QUIET_THRESHOLD_MS,
  POKE_NUDGE_SUPPRESS_MS,
  pokeNudgeShownKey,
  pokeNudgeSuppressKey,
  shouldShowPokeNudge,
  type PokeNudgeSignals,
} from '../poke-nudge';

const NOW = Date.parse('2026-07-11T12:00:00+09:00');

/** 전 게이트 충족 기본 신호 — 각 케이스는 여기서 1개 축만 비튼다(원인 격리) */
const base = (over: Partial<PokeNudgeSignals> = {}): PokeNudgeSignals => ({
  active: true,
  myEditedThisSession: true,
  partnerLastEditISO: new Date(NOW - PARTNER_QUIET_THRESHOLD_MS).toISOString(),
  canPokeNow: true,
  alreadyShownTodayKST: false,
  suppressedAtMs: null,
  nowMs: NOW,
  ...over,
});

describe('shouldShowPokeNudge — quiet 3일 경계', () => {
  it('PN.1 파트너 마지막 편집이 정확히 3일 전 → true(>= 경계 포함)', () => {
    expect(shouldShowPokeNudge(base())).toBe(true);
  });

  it('PN.2 3일 - 1ms 전(아직 조용하지 않음) → false', () => {
    const iso = new Date(NOW - PARTNER_QUIET_THRESHOLD_MS + 1).toISOString();
    expect(shouldShowPokeNudge(base({ partnerLastEditISO: iso }))).toBe(false);
  });

  it('PN.3 파트너 편집이 미래 시각(시계 스큐) → false(quiet 미충족·보수)', () => {
    const iso = new Date(NOW + 60_000).toISOString();
    expect(shouldShowPokeNudge(base({ partnerLastEditISO: iso }))).toBe(false);
  });
});

describe('shouldShowPokeNudge — 상한·억제', () => {
  it('PN.4 오늘(KST) 이미 노출 → false', () => {
    expect(shouldShowPokeNudge(base({ alreadyShownTodayKST: true }))).toBe(false);
  });

  it('PN.5 29일 전 억제 기록 → false(30일 미경과)', () => {
    const suppressedAtMs = NOW - (POKE_NUDGE_SUPPRESS_MS - 24 * 60 * 60 * 1000);
    expect(shouldShowPokeNudge(base({ suppressedAtMs }))).toBe(false);
  });

  it('PN.6 정확히 30일 전 억제 기록 → true(만료)', () => {
    expect(shouldShowPokeNudge(base({ suppressedAtMs: NOW - POKE_NUDGE_SUPPRESS_MS }))).toBe(true);
  });

  it('PN.7 억제 기록이 미래 시각(시계 역행) → true(음수 delta = 비억제, canPoke 원칙 동일)', () => {
    expect(shouldShowPokeNudge(base({ suppressedAtMs: NOW + 60_000 }))).toBe(true);
  });

  it('PN.8 억제 기록이 NaN(파싱 실패값) → true(비유한수 = 미억제)', () => {
    expect(shouldShowPokeNudge(base({ suppressedAtMs: Number.NaN }))).toBe(true);
  });
});

describe('shouldShowPokeNudge — 나머지 게이트(하나라도 결여 → false)', () => {
  it('PN.9 canPokeNow=false(쿨다운 중) → false', () => {
    expect(shouldShowPokeNudge(base({ canPokeNow: false }))).toBe(false);
  });

  it('PN.10 partnerLastEditISO=null(편집 이력 없음) → false(보수)', () => {
    expect(shouldShowPokeNudge(base({ partnerLastEditISO: null }))).toBe(false);
  });

  it('PN.11 partnerLastEditISO 파싱 불가 → false(보수)', () => {
    expect(shouldShowPokeNudge(base({ partnerLastEditISO: 'not-a-date' }))).toBe(false);
  });

  it('PN.12 active=false(파트너 없음) → false', () => {
    expect(shouldShowPokeNudge(base({ active: false }))).toBe(false);
  });

  it('PN.13 myEditedThisSession=false(내 편집 없음) → false', () => {
    expect(shouldShowPokeNudge(base({ myEditedThisSession: false }))).toBe(false);
  });
});

describe('스토리지 키 계약', () => {
  it('PN.14 일일 키 = poke_nudge_shown_{userId}_{kstDate}', () => {
    expect(pokeNudgeShownKey('u-1', '2026-07-11')).toBe('poke_nudge_shown_u-1_2026-07-11');
  });

  it('PN.15 억제 키 = poke_nudge_suppressed_at_{userId}', () => {
    expect(pokeNudgeSuppressKey('u-1')).toBe('poke_nudge_suppressed_at_u-1');
  });
});

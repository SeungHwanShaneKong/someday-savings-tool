// [CL-POKE-20260709-231909] 콕 찌르기 순수 로직 — 쿨다운 경계·시계역행·응답 전수 매핑
import { describe, it, expect } from 'vitest';
import {
  POKE_COOLDOWN_MS,
  pokeStorageKey,
  canPoke,
  cooldownRemainText,
  mapPokeOutcome,
} from '../poke-logic';

const T0 = 1_800_000_000_000; // 고정 기준 시각(결정론)

describe('poke-logic — pokeStorageKey(페어 기준·예산 무관)', () => {
  it('키는 (userId, partnerId) 페어로 유일 — 서버 유니크 키와 동일 축', () => {
    expect(pokeStorageKey('u1', 'p1')).toBe('poke_last_u1_p1');
    expect(pokeStorageKey('u1', 'p2')).not.toBe(pokeStorageKey('u1', 'p1'));
    expect(pokeStorageKey('u2', 'p1')).not.toBe(pokeStorageKey('u1', 'p1'));
  });
});

describe('poke-logic — canPoke 24h 경계', () => {
  it('기록 없음(null) → 허용', () => {
    expect(canPoke(null, T0)).toBe(true);
  });

  it('정확히 24h 경과 → 허용 / 24h-1ms → 거부 / 24h+1ms → 허용', () => {
    expect(canPoke(T0 - POKE_COOLDOWN_MS, T0)).toBe(true);       // 정확히 24h
    expect(canPoke(T0 - POKE_COOLDOWN_MS + 1, T0)).toBe(false);  // 1ms 부족
    expect(canPoke(T0 - POKE_COOLDOWN_MS - 1, T0)).toBe(true);   // 1ms 초과
  });

  it('직후(0ms)·쿨다운 중간 → 거부', () => {
    expect(canPoke(T0, T0)).toBe(false);
    expect(canPoke(T0 - POKE_COOLDOWN_MS / 2, T0)).toBe(false);
  });

  it('시계 역행(lastMs 가 미래, delta<0) → 허용(영구 잠금 고착 방지 — 서버가 권위)', () => {
    expect(canPoke(T0 + 1, T0)).toBe(true);
    expect(canPoke(T0 + POKE_COOLDOWN_MS * 10, T0)).toBe(true);
  });

  it('비정상 lastMs(NaN/Infinity) → 허용(파싱 실패 degrade)', () => {
    expect(canPoke(Number.NaN, T0)).toBe(true);
    expect(canPoke(Number.POSITIVE_INFINITY, T0)).toBe(true);
  });
});

describe('poke-logic — cooldownRemainText 한국어', () => {
  it('1시간 이상 → 시간 단위', () => {
    expect(cooldownRemainText(23 * 3_600_000)).toBe('약 23시간 후에 다시 찌를 수 있어요');
    expect(cooldownRemainText(3_600_000)).toBe('약 1시간 후에 다시 찌를 수 있어요');
  });
  it('1시간 미만 → 분 단위(최소 1분, 올림)', () => {
    expect(cooldownRemainText(59 * 60_000)).toBe('약 59분 후에 다시 찌를 수 있어요');
    expect(cooldownRemainText(30_000)).toBe('약 1분 후에 다시 찌를 수 있어요');
  });
  it('0/음수/NaN → 잠시 후(방어)', () => {
    expect(cooldownRemainText(0)).toBe('잠시 후 다시 찌를 수 있어요');
    expect(cooldownRemainText(-100)).toBe('잠시 후 다시 찌를 수 있어요');
    expect(cooldownRemainText(Number.NaN)).toBe('잠시 후 다시 찌를 수 있어요');
  });
});

describe('poke-logic — mapPokeOutcome 전수(7분기 + invoke 에러)', () => {
  it('① sent:true → sent·쿨다운 기록·보상(awardPoke) — 이름 개인화', () => {
    const out = mapPokeOutcome({ data: { sent: true }, error: null }, '민지');
    expect(out.type).toBe('sent');
    expect(out.startCooldown).toBe(true);
    expect(out.awardPoke).toBe(true);
    expect(out.toast.title).toBe('콕! 찔렀어요 💌 민지님께 메일을 보냈어요');
    expect(out.toast.variant).toBeUndefined();
  });

  it('① 이름 없음/공백 → 파트너 폴백', () => {
    expect(mapPokeOutcome({ data: { sent: true } }, '  ').toast.title).toContain('파트너님께');
    expect(mapPokeOutcome({ data: { sent: true } }, null).toast.title).toContain('파트너님께');
  });

  it('② rate_limited → 쿨다운 기록·보상 없음·안내 토스트', () => {
    const out = mapPokeOutcome({ data: { skipped: 'rate_limited' } });
    expect(out.type).toBe('rate_limited');
    expect(out.startCooldown).toBe(true);
    expect(out.awardPoke).toBe(false);
    expect(out.toast.title).toBe('오늘은 이미 콕 찔렀어요 — 내일 다시!');
    expect(out.toast.variant).toBeUndefined();
  });

  it('③ no_partner → 쿨다운 미기록·초대 유도', () => {
    const out = mapPokeOutcome({ data: { skipped: 'no_partner' } });
    expect(out.type).toBe('no_partner');
    expect(out.startCooldown).toBe(false);
    expect(out.toast.title).toBe('아직 파트너가 없어요');
  });

  it('④ global_capped → 쿨다운 미기록·내일 안내', () => {
    const out = mapPokeOutcome({ data: { skipped: 'global_capped' } });
    expect(out.type).toBe('global_capped');
    expect(out.startCooldown).toBe(false);
    expect(out.toast.title).toBe('오늘 알림이 몰렸어요, 내일 시도해주세요');
  });

  it('⑤⑥⑦ no_provider·no_sender_domain·schema_not_ready → unavailable(동일 안내·쿨다운 미기록)', () => {
    for (const skipped of ['no_provider', 'no_sender_domain', 'schema_not_ready'] as const) {
      const out = mapPokeOutcome({ data: { skipped } });
      expect(out.type).toBe('unavailable');
      expect(out.startCooldown).toBe(false);
      expect(out.awardPoke).toBe(false);
      expect(out.toast.title).toBe('지금은 알림을 보낼 수 없어요');
    }
  });

  it('invoke 에러(error 존재/응답 null) → error·destructive·쿨다운 미기록(재시도 허용)', () => {
    for (const res of [{ data: null, error: new Error('network') }, null]) {
      const out = mapPokeOutcome(res);
      expect(out.type).toBe('error');
      expect(out.startCooldown).toBe(false);
      expect(out.awardPoke).toBe(false);
      expect(out.toast.variant).toBe('destructive');
    }
  });

  it('알 수 없는 응답(미지 skipped·빈 data) → 보수적 error(쿨다운·보상 없음)', () => {
    expect(mapPokeOutcome({ data: { skipped: 'something_new' } }).type).toBe('error');
    expect(mapPokeOutcome({ data: {} }).type).toBe('error');
    expect(mapPokeOutcome({ data: null }).type).toBe('error');
  });
});

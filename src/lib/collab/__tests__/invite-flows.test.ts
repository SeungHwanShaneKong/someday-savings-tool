// [CL-COEDIT-QA200-20260620] invite-resume 초대 재개 로직 — 신규 조합/경계 단위 검증 (invite-resume.test.ts IR.1~17 과 중복 금지)
import { describe, it, expect } from 'vitest';
import {
  INVITE_TOKEN_KEY,
  INVITE_TS_KEY,
  INVITE_RESUME_TTL_MS,
  isValidTokenFormat,
  stashInviteToken,
  consumeInviteToken,
  decideInviteAction,
  normalizeAcceptResult,
  type KVStore,
} from '../invite-resume';

// 인메모리 KVStore — 주입 가능한 던지기(throw) 훅 포함(폴백 경로 검증용).
function memStore(
  init: Record<string, string> = {},
  opts: { throwOnGet?: boolean; throwOnRemove?: boolean } = {},
): KVStore & { dump: () => Record<string, string> } {
  const m = new Map<string, string>(Object.entries(init));
  return {
    getItem: (k) => {
      if (opts.throwOnGet) throw new Error('SecurityError: storage blocked');
      return m.has(k) ? (m.get(k) as string) : null;
    },
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => {
      if (opts.throwOnRemove) throw new Error('SecurityError: storage blocked');
      m.delete(k);
    },
    dump: () => Object.fromEntries(m),
  };
}

const VALID = 'a'.repeat(64); // 32바이트 hex 모사
const NOW = 1_780_000_000_000;

// ───────────────────────────────────────────────────────────────────────────
// INV.C-1: decideInviteAction 전조합 매트릭스 (토큰형식 × isLoggedIn)
// 기존 IR.8/9/10 은 개별 케이스만 — 여기서는 4분면을 단일 표로 전수.
// ───────────────────────────────────────────────────────────────────────────
describe('INV.C-1 decideInviteAction 매트릭스 (토큰형식 × 로그인)', () => {
  const cases: Array<{
    label: string;
    token: string | undefined;
    isLoggedIn: boolean;
    expected: ReturnType<typeof decideInviteAction>;
  }> = [
    { label: '유효+미로그인 → login-required', token: VALID, isLoggedIn: false, expected: { kind: 'login-required', token: VALID } },
    { label: '유효+로그인 → accept', token: VALID, isLoggedIn: true, expected: { kind: 'accept', token: VALID } },
    { label: '무효+미로그인 → invalid', token: 'tiny', isLoggedIn: false, expected: { kind: 'invalid' } },
    { label: '무효+로그인 → invalid', token: 'tiny', isLoggedIn: true, expected: { kind: 'invalid' } },
    { label: 'undefined+미로그인 → invalid', token: undefined, isLoggedIn: false, expected: { kind: 'invalid' } },
    { label: 'undefined+로그인 → invalid', token: undefined, isLoggedIn: true, expected: { kind: 'invalid' } },
  ];
  it.each(cases)('$label', ({ token, isLoggedIn, expected }) => {
    expect(decideInviteAction(token, isLoggedIn)).toEqual(expected);
  });

  it('형식 무효는 invalid 가 우선 — 토큰을 절대 누설하지 않음(login-required/accept 로 새지 않음)', () => {
    // 보안 불변식: invalid 결과에는 token 필드가 없어야 한다.
    const r = decideInviteAction('../../../etc', true);
    expect(r).toEqual({ kind: 'invalid' });
    expect('token' in r).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// INV.C-2: stash→consume — TTL 경계(정확히 경계/경계-1/경계+1) 및 음수 시간차
// 기존 IR.4/IR.5 는 "+1000(통과)"와 "TTL+1(만료)"만 — 정확한 경계는 미검증.
// 계약: consume 은 (now - t > TTL) 일 때만 만료 → "== TTL" 은 만료가 아님(생존).
// ───────────────────────────────────────────────────────────────────────────
describe('INV.C-2 consume TTL 경계 (stash now ≠ consume now)', () => {
  it('정확히 TTL 경과(now - t === TTL)는 만료 아님 → 토큰 반환', () => {
    const s = memStore();
    stashInviteToken(VALID, s, NOW);
    expect(consumeInviteToken(s, NOW + INVITE_RESUME_TTL_MS)).toBe(VALID);
  });

  it('TTL 직전(경계-1)은 생존', () => {
    const s = memStore();
    stashInviteToken(VALID, s, NOW);
    expect(consumeInviteToken(s, NOW + INVITE_RESUME_TTL_MS - 1)).toBe(VALID);
  });

  it('TTL 직후(경계+1)는 만료 → null 이고 키도 정리됨', () => {
    const s = memStore();
    stashInviteToken(VALID, s, NOW);
    expect(consumeInviteToken(s, NOW + INVITE_RESUME_TTL_MS + 1)).toBeNull();
    // 만료라도 항상 정리(중복 재개 방지)
    expect(s.getItem(INVITE_TOKEN_KEY)).toBeNull();
    expect(s.getItem(INVITE_TS_KEY)).toBeNull();
  });

  it('시계 역행(consume now < stash now, 음수 차이)은 만료로 보지 않음 → 토큰 반환', () => {
    const s = memStore();
    stashInviteToken(VALID, s, NOW);
    // now - t = -5000 (< TTL) → 만료 아님
    expect(consumeInviteToken(s, NOW - 5000)).toBe(VALID);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// INV.C-3: consume — 손상된/누락된 메타데이터 조합
// 계약(라인 68~70): ts 가 파싱 불가(NaN)면 만료 판정을 건너뛰고 토큰을 그대로 반환(방어적 보존).
// ───────────────────────────────────────────────────────────────────────────
describe('INV.C-3 consume 손상/누락 메타데이터', () => {
  it('손상된 ts("abc" → NaN)는 만료 판정을 건너뛰고 토큰 반환', () => {
    const s = memStore({ [INVITE_TOKEN_KEY]: VALID, [INVITE_TS_KEY]: 'abc' });
    expect(consumeInviteToken(s, NOW)).toBe(VALID);
  });

  it('토큰만 있고 ts 가 아예 없으면(null) 만료 불가 → 토큰 반환', () => {
    const s = memStore({ [INVITE_TOKEN_KEY]: VALID });
    expect(consumeInviteToken(s, NOW + INVITE_RESUME_TTL_MS * 100)).toBe(VALID);
  });

  it('ts 만 있고 토큰이 없으면 → null (그리고 양쪽 키 정리)', () => {
    const s = memStore({ [INVITE_TS_KEY]: String(NOW) });
    expect(consumeInviteToken(s, NOW)).toBeNull();
    expect(s.getItem(INVITE_TS_KEY)).toBeNull();
  });

  it('저장된 토큰이 형식 불량이면 ts 와 무관하게 null', () => {
    const s = memStore({ [INVITE_TOKEN_KEY]: 'has space inside xx', [INVITE_TS_KEY]: String(NOW) });
    expect(consumeInviteToken(s, NOW)).toBeNull();
  });

  it('빈 문자열 ts("")는 falsy → NaN 경로 → 토큰 반환(만료 미적용)', () => {
    const s = memStore({ [INVITE_TOKEN_KEY]: VALID, [INVITE_TS_KEY]: '' });
    expect(consumeInviteToken(s, NOW + INVITE_RESUME_TTL_MS * 5)).toBe(VALID);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// INV.C-4: consume — getItem/removeItem throw 시 폴백(try/catch) 안전성
// 기존 테스트엔 store 가 던지는 케이스 없음.
// ───────────────────────────────────────────────────────────────────────────
describe('INV.C-4 consume 스토리지 예외 폴백', () => {
  it('getItem 이 던지면 throw 없이 null', () => {
    const s = memStore({ [INVITE_TOKEN_KEY]: VALID, [INVITE_TS_KEY]: String(NOW) }, { throwOnGet: true });
    let result: string | null = 'sentinel';
    expect(() => {
      result = consumeInviteToken(s, NOW);
    }).not.toThrow();
    expect(result).toBeNull();
  });

  it('removeItem 이 던져도(정리 실패) 유효 토큰은 정상 반환', () => {
    const s = memStore({ [INVITE_TOKEN_KEY]: VALID, [INVITE_TS_KEY]: String(NOW) }, { throwOnRemove: true });
    expect(consumeInviteToken(s, NOW + 1000)).toBe(VALID);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// INV.C-5: isValidTokenFormat — 문자셋/길이 경계 (기존 IR.1~3 미포함 조합)
// 계약(라인 32~33): 16 ≤ len ≤ 128 && /^[A-Za-z0-9_-]+$/
// ───────────────────────────────────────────────────────────────────────────
describe('INV.C-5 isValidTokenFormat 문자셋/길이 경계', () => {
  it('대문자·하이픈·언더스코어 혼합 base64url 토큰은 유효', () => {
    expect(isValidTokenFormat('AbC_def-GHI012jkl-MNO')).toBe(true);
    expect(isValidTokenFormat('A-B_C-D_E-F_G-H_')).toBe(true); // 16자
  });

  it('길이 경계: 16자 유효, 15자 무효', () => {
    expect(isValidTokenFormat('a'.repeat(16))).toBe(true);
    expect(isValidTokenFormat('a'.repeat(15))).toBe(false);
  });

  it('길이 경계: 128자 유효, 129자 무효', () => {
    expect(isValidTokenFormat('a'.repeat(128))).toBe(true);
    expect(isValidTokenFormat('a'.repeat(129))).toBe(false);
  });

  it('내부 공백(앞/중간/뒤) 포함 토큰은 무효', () => {
    expect(isValidTokenFormat(' ' + VALID)).toBe(false);
    expect(isValidTokenFormat(VALID + ' ')).toBe(false);
    expect(isValidTokenFormat('aaaaaaaa aaaaaaaa')).toBe(false);
  });

  it('path traversal/슬래시/점/퍼센트 등 위험 문자는 무효', () => {
    expect(isValidTokenFormat('..%2F..%2Fetc%2Fpasswd')).toBe(false); // % 불허
    expect(isValidTokenFormat('valid_but_then/slash_xx')).toBe(false);
    expect(isValidTokenFormat('dots.are.not.allowed.x')).toBe(false);
    expect(isValidTokenFormat('plus+is+base64+not+url+safe')).toBe(false); // + 불허(base64url 아님)
  });
});

// ───────────────────────────────────────────────────────────────────────────
// INV.C-6: normalizeAcceptResult — error 우선/방어적 파싱 (기존 IR.11~17 미포함)
// ───────────────────────────────────────────────────────────────────────────
describe('INV.C-6 normalizeAcceptResult error 우선 & 방어적 파싱', () => {
  it('error 가 있으면 data(성공형)가 있어도 error 가 우선', () => {
    const r = normalizeAcceptResult({ ok: true, budget_id: 'b1' }, new Error('rls denied'));
    expect(r).toEqual({ status: 'error', message: 'rls denied' });
  });

  it('non-Error error(문자열)는 String() 으로 메시지화', () => {
    expect(normalizeAcceptResult(null, 'boom')).toEqual({ status: 'error', message: 'boom' });
  });

  it('non-Error error(객체)도 String() 폴백 메시지', () => {
    const r = normalizeAcceptResult(null, { code: 'PGRST301' });
    expect(r.status).toBe('error');
    expect((r as { status: 'error'; message: string }).message).toBe('[object Object]');
  });

  it('data=null & error=null → 알 수 없는 응답(error)', () => {
    expect(normalizeAcceptResult(null, null)).toEqual({ status: 'error', message: '알 수 없는 응답이에요' });
  });

  it('budget_id 만 있고 status/ok 없으면 → accepted 로 관대 처리', () => {
    expect(normalizeAcceptResult({ budget_id: 'bx' }, null)).toEqual({ status: 'accepted', budgetId: 'bx' });
  });

  it('status 우선 분기보다 ok:false+error 코드 분기가 먼저 평가됨(owner)', () => {
    // ok:false 이고 error 에 owner 포함 → status 필드가 달라도 owner 로 귀결
    const r = normalizeAcceptResult({ ok: false, error: 'is_owner', status: 'accepted', budget_id: 'b9' }, null);
    expect(r).toEqual({ status: 'owner' });
  });

  it('ok:false 인데 코드가 미지(알 수 없는 코드)면 error 메시지에 코드 노출', () => {
    expect(normalizeAcceptResult({ ok: false, error: 'weird_code_42' }, null)).toEqual({
      status: 'error',
      message: 'weird_code_42',
    });
  });

  it('not_found 코드 → invalid 로 매핑', () => {
    expect(normalizeAcceptResult({ ok: false, error: 'token_not_found' }, null).status).toBe('invalid');
  });

  it('status:already_member 형태에서 budget_id 보존', () => {
    expect(normalizeAcceptResult({ status: 'already_member', budget_id: 'bm' }, null)).toEqual({
      status: 'already_member',
      budgetId: 'bm',
    });
  });

  it('expired 코드는 budget_id 가 있어도 budgetId 를 싣지 않음(owner/expired 는 무-budget)', () => {
    expect(normalizeAcceptResult({ ok: false, error: 'invitation_expired', budget_id: 'bz' }, null)).toEqual({
      status: 'expired',
    });
  });
});

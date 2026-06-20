// [CL-COEDIT-QA200-20260620] invite-resume 경계/널 정규화 — IR.18~IR.20 (template 비중복 edge)
import { describe, it, expect } from 'vitest';
import {
  INVITE_TOKEN_KEY,
  INVITE_TS_KEY,
  INVITE_RESUME_TTL_MS,
  isValidTokenFormat,
  stashInviteToken,
  consumeInviteToken,
  normalizeAcceptResult,
  type KVStore,
} from '../invite-resume';

// template(memStore)와 동일 패턴의 인메모리 KVStore — 결정성 보장
function memStore(init: Record<string, string> = {}): KVStore & { dump: () => Record<string, string> } {
  const m = new Map<string, string>(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    dump: () => Object.fromEntries(m),
  };
}

const NOW = 1_780_000_000_000;

// ---------------------------------------------------------------------------
// IR.18 — 토큰 길이 경계(16~128 inclusive). template 은 64자 hex 만 검증 →
//          하한(16)·상한(128)·바로 바깥(15/129)·요청된 63자(base64url 중간 길이)를 확정.
// 계약: isValidTokenFormat 은 length < 16 || length > 128 일 때만 거부(배타적 외곽).
// ---------------------------------------------------------------------------
describe('IR.18 토큰 길이 경계(16~128 inclusive)', () => {
  it('63자 base64url 토큰(요청 시나리오) 통과', () => {
    // 16 < 63 < 128, 모두 [A-Za-z0-9_-] → 통과해야 함
    const t63 = 'A1_b2-C3'.repeat(8).slice(0, 63); // 길이 63 고정
    expect(t63.length).toBe(63);
    expect(isValidTokenFormat(t63)).toBe(true);
  });

  it('하한 경계 16자는 통과, 15자는 거부', () => {
    const t16 = 'x'.repeat(16);
    const t15 = 'x'.repeat(15);
    expect(t16.length).toBe(16);
    expect(isValidTokenFormat(t16)).toBe(true);
    expect(isValidTokenFormat(t15)).toBe(false);
  });

  it('상한 경계 128자는 통과, 129자는 거부', () => {
    const t128 = 'a'.repeat(128);
    const t129 = 'a'.repeat(129);
    expect(isValidTokenFormat(t128)).toBe(true);
    expect(isValidTokenFormat(t129)).toBe(false);
  });

  it('경계 길이여도 비허용 문자(공백/점/슬래시) 포함 시 거부', () => {
    // 길이는 통과(16자)지만 문자셋 위반 → 정규식에서 거부되어야 함
    expect(isValidTokenFormat('valid_chars_ok-9'.length === 16 ? 'valid_chars_ok-9' : '')).toBe(true);
    expect(isValidTokenFormat('has.dot.invalid9')).toBe(false); // 16자, '.' 포함
    expect(isValidTokenFormat('has/slash/in0123')).toBe(false); // 16자, '/' 포함
  });
});

// ---------------------------------------------------------------------------
// IR.19 — TTL 정확 경계. template(IR.5)은 TTL+1(만료)만 검증 →
//          여기서는 정확히 now-ts === TTL(경계, 미만료) 과 TTL-1(미만료)을 확정.
// 계약: consumeInviteToken 은 now - t > INVITE_RESUME_TTL_MS(엄격 초과)일 때만 만료.
//        따라서 등호(=== TTL)는 통과(토큰 반환), TTL+1 은 만료(null).
// ---------------------------------------------------------------------------
describe('IR.19 TTL 정확 경계(엄격 초과 비교)', () => {
  const VALID = 'b'.repeat(64);

  it('now - ts === TTL (정확히 경계) → 만료 아님, 토큰 반환', () => {
    const s = memStore();
    stashInviteToken(VALID, s, NOW);
    const got = consumeInviteToken(s, NOW + INVITE_RESUME_TTL_MS); // 차이 == TTL
    expect(got).toBe(VALID);
  });

  it('now - ts === TTL - 1 → 만료 아님, 토큰 반환', () => {
    const s = memStore();
    stashInviteToken(VALID, s, NOW);
    const got = consumeInviteToken(s, NOW + INVITE_RESUME_TTL_MS - 1);
    expect(got).toBe(VALID);
  });

  it('경계(=== TTL)에서도 consume 후 stash 는 정리됨(중복 재개 방지)', () => {
    const s = memStore();
    stashInviteToken(VALID, s, NOW);
    consumeInviteToken(s, NOW + INVITE_RESUME_TTL_MS);
    // TTL 통과/만료와 무관하게 항상 정리되어야 함
    expect(s.getItem(INVITE_TOKEN_KEY)).toBeNull();
    expect(s.getItem(INVITE_TS_KEY)).toBeNull();
  });

  it('ts 손상(NaN) 시 TTL 검사를 건너뛰고 형식만 통과하면 반환', () => {
    // ts 가 숫자 파싱 불가 → Number.isNaN(t) true → 만료 검사 스킵 → 토큰 반환
    const s = memStore({ [INVITE_TOKEN_KEY]: VALID, [INVITE_TS_KEY]: 'not-a-number' });
    const got = consumeInviteToken(s, NOW + INVITE_RESUME_TTL_MS * 100);
    expect(got).toBe(VALID);
  });
});

// ---------------------------------------------------------------------------
// IR.20 — normalizeAcceptResult 의 budget_id nullable 처리. template(IR.11~16)은
//          항상 budget_id 가 존재하는 경로만 검증 →
//          여기서는 budget_id 누락/null/falsy 를 명시적으로 null 로 정규화함을 확정.
// 계약: budgetId = (d.budget_id as string) ?? null. ok:true 이면 budget_id 없어도 accepted.
// ---------------------------------------------------------------------------
describe('IR.20 budget_id nullable 정규화', () => {
  it('ok:true + budget_id:null → accepted, budgetId:null', () => {
    expect(normalizeAcceptResult({ ok: true, budget_id: null }, null)).toEqual({
      status: 'accepted',
      budgetId: null,
    });
  });

  it('ok:true + budget_id 키 자체 누락 → accepted, budgetId:null', () => {
    expect(normalizeAcceptResult({ ok: true }, null)).toEqual({
      status: 'accepted',
      budgetId: null,
    });
  });

  it('status:already_member + budget_id 누락 → already_member, budgetId:null', () => {
    expect(normalizeAcceptResult({ status: 'already_member' }, null)).toEqual({
      status: 'already_member',
      budgetId: null,
    });
  });

  it('data:null/{} (빈 응답) → error (알 수 없는 응답)', () => {
    // d={} → ok!==false, error 문자열 아님, status='' → default 분기 → budgetId 없음 → error
    const r1 = normalizeAcceptResult(null, null);
    expect(r1.status).toBe('error');
    const r2 = normalizeAcceptResult({}, null);
    expect(r2.status).toBe('error');
  });

  it('status 없고 budget_id 만 있는 응답 → accepted 로 복구(default budgetId 분기)', () => {
    // default 분기: budgetId 존재 → accepted 로 관용 해석
    expect(normalizeAcceptResult({ budget_id: 'bx' }, null)).toEqual({
      status: 'accepted',
      budgetId: 'bx',
    });
  });

  it('error 가 비-Error 객체(string)일 때도 message 로 정규화', () => {
    // error 인자가 truthy 면 우선 처리: String(error)
    const r = normalizeAcceptResult({ ok: true, budget_id: 'b' }, 'boom');
    expect(r).toEqual({ status: 'error', message: 'boom' });
  });
});

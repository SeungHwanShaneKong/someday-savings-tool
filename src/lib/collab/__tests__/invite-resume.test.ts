// [CL-COLLAB-INVITE-20260619-222424] 초대 재개 로직 — 전 시나리오(P2) 단위 검증
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

function memStore(init: Record<string, string> = {}): KVStore & { dump: () => Record<string, string> } {
  const m = new Map<string, string>(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    dump: () => Object.fromEntries(m),
  };
}

const VALID = 'a'.repeat(64); // 32바이트 hex 모사
const NOW = 1_780_000_000_000;

describe('isValidTokenFormat', () => {
  it('IR.1 정상 hex 토큰 통과', () => expect(isValidTokenFormat(VALID)).toBe(true));
  it('IR.2 빈/너무짧은/공백 토큰 거부', () => {
    expect(isValidTokenFormat('')).toBe(false);
    expect(isValidTokenFormat('short')).toBe(false);
    expect(isValidTokenFormat('has space here xxxxxxx')).toBe(false);
    expect(isValidTokenFormat(undefined)).toBe(false);
    expect(isValidTokenFormat(null)).toBe(false);
  });
  it('IR.3 경로주입/슬래시 토큰 거부', () => {
    expect(isValidTokenFormat('../../etc/passwd')).toBe(false);
    expect(isValidTokenFormat('a/b/c'.padEnd(20, 'x'))).toBe(false);
  });
});

describe('stash → consume (OAuth 라운드트립 보존)', () => {
  it('IR.4 보존 후 정확히 1회 consume, 그 후 정리됨', () => {
    const s = memStore();
    stashInviteToken(VALID, s, NOW);
    expect(s.getItem(INVITE_TOKEN_KEY)).toBe(VALID);
    const got = consumeInviteToken(s, NOW + 1000);
    expect(got).toBe(VALID);
    // consume 후 키 제거 → 중복 재개 방지
    expect(s.getItem(INVITE_TOKEN_KEY)).toBeNull();
    expect(s.getItem(INVITE_TS_KEY)).toBeNull();
    expect(consumeInviteToken(s, NOW + 2000)).toBeNull();
  });
  it('IR.5 TTL 초과 stash 는 무시(만료)', () => {
    const s = memStore();
    stashInviteToken(VALID, s, NOW);
    const got = consumeInviteToken(s, NOW + INVITE_RESUME_TTL_MS + 1);
    expect(got).toBeNull();
  });
  it('IR.6 형식 불량 토큰은 stash 되지 않음', () => {
    const s = memStore();
    stashInviteToken('bad token', s, NOW);
    expect(s.getItem(INVITE_TOKEN_KEY)).toBeNull();
  });
  it('IR.7 store 없음(null)에도 안전', () => {
    expect(() => stashInviteToken(VALID, null, NOW)).not.toThrow();
    expect(consumeInviteToken(null, NOW)).toBeNull();
  });
});

describe('decideInviteAction', () => {
  it('IR.8 미로그인 → login-required', () => {
    expect(decideInviteAction(VALID, false)).toEqual({ kind: 'login-required', token: VALID });
  });
  it('IR.9 로그인됨 → accept', () => {
    expect(decideInviteAction(VALID, true)).toEqual({ kind: 'accept', token: VALID });
  });
  it('IR.10 잘못된 토큰 → invalid (로그인 여부 무관)', () => {
    expect(decideInviteAction('bad', false)).toEqual({ kind: 'invalid' });
    expect(decideInviteAction(undefined, true)).toEqual({ kind: 'invalid' });
  });
});

describe('normalizeAcceptResult (RPC 응답 정규화)', () => {
  it('IR.11 ok:true + budget_id → accepted', () => {
    expect(normalizeAcceptResult({ ok: true, budget_id: 'b1', role: 'editor' }, null)).toEqual({
      status: 'accepted',
      budgetId: 'b1',
    });
  });
  it('IR.12 status:accepted 형태', () => {
    expect(normalizeAcceptResult({ status: 'accepted', budget_id: 'b2' }, null)).toEqual({
      status: 'accepted',
      budgetId: 'b2',
    });
  });
  it('IR.13 owner 거부', () => {
    expect(normalizeAcceptResult({ ok: false, error: 'owner_cannot_accept' }, null)).toEqual({
      status: 'owner',
    });
  });
  it('IR.14 만료', () => {
    expect(normalizeAcceptResult({ ok: false, error: 'expired' }, null).status).toBe('expired');
  });
  it('IR.15 이미 멤버(멱등)', () => {
    expect(normalizeAcceptResult({ ok: false, error: 'already_accepted', budget_id: 'b3' }, null)).toEqual({
      status: 'already_member',
      budgetId: 'b3',
    });
  });
  it('IR.16 잘못된 토큰', () => {
    expect(normalizeAcceptResult({ ok: false, error: 'invalid_token' }, null).status).toBe('invalid');
  });
  it('IR.17 RPC 에러 → error', () => {
    const r = normalizeAcceptResult(null, new Error('network'));
    expect(r).toEqual({ status: 'error', message: 'network' });
  });
});

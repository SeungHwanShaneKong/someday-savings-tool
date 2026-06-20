// [CL-COLLAB-INVITE-20260619-222424] 초대 링크 → 구글 로그인 → 수락 재개 (순수 로직)
//
// 플랜 C-3: 미로그인 파트너가 /invite/:token 접속 시 token 을 sessionStorage 에 보존하고
// signInWithGoogle() 로 이탈 → OAuth 복귀(/auth) 후 user 전이 시 token 을 꺼내 재개.
// 여기서는 storage 를 주입받는 순수 함수로 만들어 CI 에서 완전 검증 가능하게 한다.

export const INVITE_TOKEN_KEY = 'pending_invite_token';
export const INVITE_TS_KEY = 'pending_invite_ts';
/** 초대 재개 토큰의 최대 보존 시간(분) — 너무 오래된 stash 는 무시 */
export const INVITE_RESUME_TTL_MS = 30 * 60 * 1000;

/** sessionStorage 호환 최소 인터페이스(테스트 주입용) */
export interface KVStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** 안전한 sessionStorage 접근(프라이빗 모드/SSR 폴백). 없으면 null. */
export function safeSessionStorage(): KVStore | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

/** Supabase invitation token 형식 가드: 32바이트 hex(=64자) 또는 base64url(공백/슬래시 없음). */
export function isValidTokenFormat(token: string | undefined | null): boolean {
  if (!token) return false;
  if (token.length < 16 || token.length > 128) return false;
  return /^[A-Za-z0-9_-]+$/.test(token);
}

/** OAuth 이탈 전 토큰 보존. now 주입(테스트 결정성). */
export function stashInviteToken(token: string, store: KVStore | null, now: number): void {
  if (!store || !isValidTokenFormat(token)) return;
  try {
    store.setItem(INVITE_TOKEN_KEY, token);
    store.setItem(INVITE_TS_KEY, String(now));
  } catch {
    /* 저장 실패는 무시(폴백) */
  }
}

/**
 * 보존된 토큰을 꺼내 제거(consume). TTL 초과 또는 형식 불량이면 정리 후 null.
 * OAuth 복귀 후 user 전이 시 1회 호출 → 반환 토큰으로 /invite/:token 재이동.
 */
export function consumeInviteToken(store: KVStore | null, now: number): string | null {
  if (!store) return null;
  let token: string | null = null;
  let ts: string | null = null;
  try {
    token = store.getItem(INVITE_TOKEN_KEY);
    ts = store.getItem(INVITE_TS_KEY);
  } catch {
    return null;
  }
  // 항상 정리(중복 재개 방지)
  try {
    store.removeItem(INVITE_TOKEN_KEY);
    store.removeItem(INVITE_TS_KEY);
  } catch {
    /* noop */
  }
  if (!isValidTokenFormat(token)) return null;
  const t = ts ? Number(ts) : NaN;
  if (!Number.isNaN(t) && now - t > INVITE_RESUME_TTL_MS) return null; // 만료된 stash
  return token;
}

export type InviteAction =
  | { kind: 'invalid' }
  | { kind: 'login-required'; token: string }
  | { kind: 'accept'; token: string };

/**
 * /invite/:token 진입 시 결정:
 *  - 토큰 형식 불량 → invalid
 *  - 미로그인 → login-required (호출측: stash 후 signInWithGoogle)
 *  - 로그인됨 → accept (호출측: accept_budget_invitation RPC 호출)
 */
export function decideInviteAction(token: string | undefined, isLoggedIn: boolean): InviteAction {
  if (!isValidTokenFormat(token)) return { kind: 'invalid' };
  if (!isLoggedIn) return { kind: 'login-required', token: token as string };
  return { kind: 'accept', token: token as string };
}

/** accept_budget_invitation RPC 결과(Json)를 UI 분기로 정규화. 다양한 형태 방어적 파싱. */
export type AcceptOutcome =
  | { status: 'accepted'; budgetId: string | null }
  | { status: 'already_member'; budgetId: string | null }
  | { status: 'owner' }
  | { status: 'expired' }
  | { status: 'invalid' }
  | { status: 'error'; message: string };

export function normalizeAcceptResult(data: unknown, error: unknown): AcceptOutcome {
  if (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { status: 'error', message: msg };
  }
  const d = (data ?? {}) as Record<string, unknown>;
  const budgetId = (d.budget_id as string) ?? null;
  // ok:false 형태 (error 코드)
  if (d.ok === false || typeof d.error === 'string') {
    const code = String(d.error ?? '');
    if (code.includes('owner')) return { status: 'owner' };
    if (code.includes('expired')) return { status: 'expired' };
    if (code.includes('invalid') || code.includes('not_found')) return { status: 'invalid' };
    if (code.startsWith('already')) return { status: 'already_member', budgetId };
    return { status: 'error', message: code || '수락에 실패했어요' };
  }
  // status 필드 직접 제공 형태
  const status = typeof d.status === 'string' ? d.status : d.ok === true ? 'accepted' : '';
  switch (status) {
    case 'accepted':
      return { status: 'accepted', budgetId };
    case 'already_member':
    case 'already_accepted':
      return { status: 'already_member', budgetId };
    case 'owner':
    case 'owner_cannot_accept':
      return { status: 'owner' };
    case 'expired':
      return { status: 'expired' };
    case 'invalid':
    case 'invalid_token':
      return { status: 'invalid' };
    default:
      return budgetId
        ? { status: 'accepted', budgetId }
        : { status: 'error', message: '알 수 없는 응답이에요' };
  }
}

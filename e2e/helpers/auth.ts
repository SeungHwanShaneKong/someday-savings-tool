// [CL-COEDIT-E2E-20260620-130000] E2E 인증 헬퍼
//  - devLogin(page): 오너 = Auth.tsx 'Dev 테스트 로그인'(dev-test@wedsem-local.dev) UI 경유
//  - loginViaApi(context, email, password): 파트너 = Supabase REST 로그인 + 세션 주입(2-유저 컨텍스트)
//    파트너 계정은 dev-create-user(앱과 동일 호출)로 멱등 생성. 2-유저 실시간 검증에만 필요(마이그레이션 후).
import { type Page, type BrowserContext, expect } from '@playwright/test';

/** 라이브 검증서 확인한 상수(공개 publishable 키/URL). env 로 override 가능. */
// [CL-DBSWITCH-20260620] 메인 DB 전환에 맞춰 새 프로젝트(pnfjwsugsdyzyahrants)로 기본값 갱신. env 로 override 가능.
export const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? 'https://pnfjwsugsdyzyahrants.supabase.co';
export const SUPABASE_REF = process.env.E2E_SUPABASE_REF ?? 'pnfjwsugsdyzyahrants';
/** 앱 번들에 노출되는 anon/publishable 키. 미설정 시 파트너(REST) 로그인만 실패하고 오너 UI 로그인은 정상. */
export const SUPABASE_ANON_KEY = process.env.E2E_SUPABASE_ANON_KEY ?? '';
/** supabase-js v2 세션 저장 키 */
export const STORAGE_KEY = `sb-${SUPABASE_REF}-auth-token`;

export const OWNER = {
  email: process.env.E2E_OWNER_EMAIL ?? 'dev-test@wedsem-local.dev',
  password: process.env.E2E_OWNER_PASSWORD ?? 'devtest123456',
};
export const PARTNER = {
  email: process.env.E2E_PARTNER_EMAIL ?? 'e2e-partner@wedsem-local.dev',
  password: process.env.E2E_PARTNER_PASSWORD ?? 'e2epartner123456',
};

/** <1024px 에서만 뜨는 '데스크톱 안내' 모달 정리(데스크톱 뷰포트면 보통 없음). */
export async function dismissDesktopNotice(page: Page): Promise<void> {
  const ok = page.getByRole('button', { name: '확인', exact: true });
  for (let i = 0; i < 2; i++) {
    if (await ok.isVisible().catch(() => false)) {
      await ok.click().catch(() => {});
      await page.waitForTimeout(150);
    } else break;
  }
}

/** 오너 로그인 — Auth.tsx 의 DEV 바이패스 버튼 사용(import.meta.env.DEV 에서만 렌더). */
export async function devLogin(page: Page): Promise<void> {
  await page.goto('/auth');
  const devBtn = page.getByRole('button', { name: /Dev 테스트 로그인/ });
  await expect(devBtn, 'Dev 로그인 버튼(=DEV 모드 dev 서버) 필요').toBeVisible();
  await devBtn.click();
  await page.waitForURL('**/budget', { timeout: 25_000 });
  await dismissDesktopNotice(page);
}

/**
 * 파트너 테스트 계정 멱등 프로비저닝 — 표준 signup 사용.
 *  - dev-create-user 는 공유시크릿(X-Dev-Test-Token)+ENVIRONMENT 가드+이메일 화이트리스트로 잠겨 있어 E2E 에서 불가.
 *  - 대신 /auth/v1/signup(이메일 확인 비활성 → 즉시 로그인 가능). 이미 있으면 422 — 무시(멱등).
 */
export async function ensureDevUser(email: string, password: string): Promise<void> {
  if (!SUPABASE_ANON_KEY) return;
  await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  }).catch(() => { /* 이미존재/네트워크 — password grant 가 최종 판정 */ });
}

/**
 * 파트너 컨텍스트 로그인 — REST password grant 로 세션 발급 후 localStorage 주입.
 * supabase-js v2 는 sb-<ref>-auth-token 에 세션 JSON 을 저장 → token 응답을 그대로 주입.
 * (형식 불일치 시 page.evaluate 로 supabase.auth.setSession 폴백 권장.)
 */
export async function loginViaApi(context: BrowserContext, email: string, password: string): Promise<void> {
  if (!SUPABASE_ANON_KEY) throw new Error('E2E_SUPABASE_ANON_KEY 미설정 — 파트너(2-유저) 로그인 불가');
  await ensureDevUser(email, password);
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const session = await res.json();
  if (!res.ok || !session?.access_token) {
    throw new Error(`파트너 로그인 실패(${res.status}): ${JSON.stringify(session).slice(0, 200)}`);
  }
  // 세션 만료 보정(expires_at 누락 시)
  if (!session.expires_at && session.expires_in) {
    session.expires_at = Math.floor(Date.now() / 1000) + Number(session.expires_in);
  }
  await context.addInitScript(
    ([key, val]) => { try { window.localStorage.setItem(key, val); } catch { /* noop */ } },
    [STORAGE_KEY, JSON.stringify(session)] as [string, string],
  );
}

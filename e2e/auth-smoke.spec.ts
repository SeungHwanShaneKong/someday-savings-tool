// [CL-COEDIT-QA200-20260620] 로그인 dev-바이패스 스모크 (게이트·읽기전용·무 live-write)
//
// 목적: 실 Google OAuth 는 봇 차단으로 자동화 불가 → 로그인 "흐름"(dev 바이패스 → /budget 렌더)을 실 브라우저로 1회 확인.
// 안전: E2E_DEV_LOGIN=1 일 때만 실행(미설정 시 전체 skip). 예산/항목/초대 **생성 절대 금지** = 라이브 DB write 0(로그인 세션·읽기만).
// 전제(사용자 환경): dev-test@wedsem-local.dev 계정 사전 생성(Supabase Dashboard, Auto Confirm) — 미존재 시 dev-create-user 폴백은
//   X-Dev-Test-Token 비노출로 401 → 로그인 실패(스모크 skip 권장). 실행: E2E_DEV_LOGIN=1 npx playwright test e2e/auth-smoke.spec.ts
import { test, expect } from '@playwright/test';

const GATED = process.env.E2E_DEV_LOGIN === '1';

test.describe('로그인 dev-바이패스 스모크 (읽기전용)', () => {
  test.skip(!GATED, 'E2E_DEV_LOGIN=1 미설정 — dev 계정·실 DB 필요로 기본 skip(모킹 통합테스트가 50종 검증).');

  test('dev 로그인 → /budget 렌더 + 모드토글 노출 (데이터 생성 없음)', async ({ page }) => {
    await page.goto('/auth');

    // Google 버튼은 항상 존재(실 OAuth 는 자동화 불가라 미사용)
    await expect(page.getByRole('button', { name: 'Google로 계속하기' })).toBeVisible();

    // DEV 전용 바이패스 버튼(import.meta.env.DEV) — dev 서버에서만 노출
    const devBtn = page.getByRole('button', { name: /Dev 테스트 로그인/ });
    await expect(devBtn).toBeVisible({ timeout: 8000 });
    await devBtn.click();

    // 로그인 성공 시 Auth.tsx 가 /budget 으로 Navigate
    await page.waitForURL('**/budget', { timeout: 20000 });

    // 예산 페이지 핵심 UI 가시성만 확인(읽기) — 개인/우리 모드 토글
    await expect(page.getByRole('button', { name: '개인' }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: '우리' }).first()).toBeVisible();
  });
});

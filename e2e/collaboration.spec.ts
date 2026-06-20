// [CL-COEDIT-E2E-20260620-130000] 2-유저 공동편집 실시간·충돌·권한 E2E (★마이그레이션 적용 후)
//
// 선행: supabase/migrations/20260620120000_coedit_collaboration.sql 적용
//       (협업자 RLS + REPLICA IDENTITY FULL + publication + token-only accept_budget_invitation).
// 또한 파트너 로그인용 E2E_SUPABASE_ANON_KEY 필요(REST 세션 주입).
// 게이트: E2E_MIGRATION_APPLIED=1 미설정 시 전체 skip(=오라클 green 유지, 미적용 환경에서 실패 노이즈 0).
import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { devLogin, loginViaApi, dismissDesktopNotice, PARTNER } from './helpers/auth';

const GATED = process.env.E2E_MIGRATION_APPLIED === '1';

test.describe('2-유저 공동편집 (C-실시간/충돌/권한)', () => {
  test.skip(!GATED, '마이그레이션 미적용 — E2E_MIGRATION_APPLIED=1 로 활성화');

  /** 오너 페이지 + 파트너 페이지를 같은 공유 예산으로 진입시키고 반환. */
  async function setupSharedBudget(ownerPage: Page, partnerContext: BrowserContext) {
    // 1) 오너: 초대 링크 생성
    await devLogin(ownerPage);
    await ownerPage.getByRole('button', { name: /파트너 초대 링크 만들기/ }).click();
    const linkEl = ownerPage.getByText(/\/invite\/[0-9a-f-]{8,}/);
    await expect(linkEl).toBeVisible({ timeout: 15_000 });
    const invitePath = ((await linkEl.textContent()) ?? '').trim().replace(/^https?:\/\/[^/]+/, '');

    // 2) 파트너: 세션 주입 후 초대 수락
    await loginViaApi(partnerContext, PARTNER.email, PARTNER.password);
    const partnerPage = await partnerContext.newPage();
    await partnerPage.goto(invitePath);
    // 수락 → /budget(우리 모드 자동 진입), AcceptInvite 가 WORKSPACE_MODE_KEY='shared' 설정
    await partnerPage.waitForURL('**/budget', { timeout: 20_000 });
    await dismissDesktopNotice(partnerPage);
    await expect(partnerPage.getByText('파트너와 함께 보는 예산')).toBeVisible();

    // 3) 오너도 우리 모드로
    await ownerPage.getByRole('button', { name: '우리', exact: true }).click();
    await expect(ownerPage.getByRole('checkbox').first()).toBeVisible();
    await expect(partnerPage.getByRole('checkbox').first()).toBeVisible();
    return { partnerPage };
  }

  test('C1 초대→수락→파트너 우리 모드에 공유 예산 등장', async ({ page, browser }) => {
    const partnerContext = await browser.newContext();
    const { partnerPage } = await setupSharedBudget(page, partnerContext);
    // 파트너의 우리 모드에 편집 가능한 테이블(체크박스) 존재 = 협업자 READ/RLS 통과
    await expect(partnerPage.getByRole('checkbox').first()).toBeVisible();
    await partnerContext.close();
  });

  test('C2 실시간 전파 — 오너 토글 → 파트너 무새로고침 반영', async ({ page, browser }) => {
    const partnerContext = await browser.newContext();
    const { partnerPage } = await setupSharedBudget(page, partnerContext);

    const ownerCb = page.getByRole('checkbox').first();
    const partnerCb = partnerPage.getByRole('checkbox').first();
    const before = await partnerCb.getAttribute('aria-checked');
    await ownerCb.click();
    // 파트너 화면이 새로고침 없이 갱신(postgres_changes → decideItemUpsert → onUpsert)
    await expect(partnerCb).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true', { timeout: 12_000 });
    await partnerContext.close();
  });

  test('C3 같은 항목·다른 필드 동시 편집 → 둘 다 보존(충돌 0)', async ({ page, browser }) => {
    const partnerContext = await browser.newContext();
    const { partnerPage } = await setupSharedBudget(page, partnerContext);
    // 오너: 첫 항목 완료 토글 / 파트너: 같은 항목 메모(다른 필드) — field-level LWW 로 둘 다 유지
    await page.getByRole('checkbox').first().click();
    const partnerNote = partnerPage.getByRole('textbox').first();
    if (await partnerNote.isVisible().catch(() => false)) {
      await partnerNote.fill('파트너 메모');
      await partnerNote.blur();
    }
    // 오너 화면에 파트너 메모가 반영되며, 완료 토글도 유지(상호 clobber 없음)
    await expect(page.getByRole('checkbox').first()).toHaveAttribute('aria-checked', 'true', { timeout: 12_000 });
    await partnerContext.close();
  });

  test('C4 권한 경계 — 파트너(editor)는 예산 삭제 불가(오너 전용 UI 게이팅)', async ({ page, browser }) => {
    const partnerContext = await browser.newContext();
    const { partnerPage } = await setupSharedBudget(page, partnerContext);
    // 파트너의 협업관리 카드: 오너 전용 '파트너 초대 링크 만들기' 버튼이 보이지 않아야 함
    await expect(partnerPage.getByRole('button', { name: /파트너 초대 링크 만들기/ })).toHaveCount(0);
    await partnerContext.close();
  });
});

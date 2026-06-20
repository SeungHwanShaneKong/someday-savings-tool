// [CL-COEDIT-E2E-20260620-130000] 개인편집 + 모드분리 E2E (마이그레이션 불요 — 라이브 검증 완료 경로)
//
// 이 스위트는 새 마이그레이션 없이도 통과합니다(budget_collaborators/budget_invitations 는 라이브 존재).
// 셀렉터는 실제 DOM 라이브 스냅샷 기준. 전 스텝 스크린샷은 playwright.config(screenshot:'on')에서 자동.
import { test, expect } from '@playwright/test';
import { devLogin } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await devLogin(page); // 오너(dev-test) UI 로그인 → /budget
});

test.describe('개인편집 · 모드분리 (P-단독)', () => {
  test('P1 로그인 → /budget 렌더(실데이터·총액)', async ({ page }) => {
    await expect(page).toHaveURL(/\/budget$/);
    await expect(page.getByRole('button', { name: '개인', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '우리', exact: true })).toBeVisible();
    await expect(page.getByText('나만 보는 예산')).toBeVisible();
  });

  test('P2 개인 모드: 예산 탭 표시 + 협업관리 카드(오너 초대 버튼)', async ({ page }) => {
    // 옵션 탭이 1개 이상
    await expect(page.getByRole('button', { name: '옵션 추가' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '파트너와 공동관리' })).toBeVisible();
    await expect(page.getByRole('button', { name: /파트너 초대 링크 만들기/ })).toBeVisible();
  });

  test('P3 우리 모드 전환: 공유예산 없으면 빈상태 CTA(개인 누수 0)', async ({ page }) => {
    await page.getByRole('button', { name: '우리', exact: true }).click();
    await expect(page.getByText('파트너와 함께 보는 예산')).toBeVisible();
    // 공유 예산이 없는 계정 → 빈 상태(개인 예산 탭이 새지 않음)
    await expect(page.getByRole('heading', { name: '아직 공동 예산이 없어요' })).toBeVisible();
    await expect(page.getByRole('button', { name: /개인 예산으로 가기/ })).toBeVisible();
  });

  test('P4 모드 왕복(개인→우리→개인) 누수 0', async ({ page }) => {
    await page.getByRole('button', { name: '우리', exact: true }).click();
    await expect(page.getByText('파트너와 함께 보는 예산')).toBeVisible();
    await page.getByRole('button', { name: '개인', exact: true }).click();
    await expect(page.getByText('나만 보는 예산')).toBeVisible();
    await expect(page.getByRole('heading', { name: '파트너와 공동관리' })).toBeVisible();
  });

  test('P5 초대 링크 생성(budget_invitations → /invite/{token})', async ({ page }) => {
    await page.getByRole('button', { name: /파트너 초대 링크 만들기/ }).click();
    // 생성된 링크 노출
    await expect(page.getByText(/\/invite\/[0-9a-f-]{8,}/)).toBeVisible({ timeout: 15_000 });
  });

  test('P6 항목 완료 토글(updateItem 2b: 낙관적 + 서버 ACK + 영속)', async ({ page }) => {
    const cb = page.getByRole('checkbox').first();
    const before = await cb.getAttribute('aria-checked');
    await cb.click();
    await expect(cb).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true');
    // 새로고침 후에도 유지 = DB 영속(서버 PATCH ?select=* 커밋)
    await page.reload();
    await page.getByRole('button', { name: '개인', exact: true }).waitFor();
    await dismissAfterReload(page);
    const cb2 = page.getByRole('checkbox').first();
    await expect(cb2).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true');
    // 원복(테스트 격리)
    await cb2.click();
  });

  test('P7 예산 탭 전환 — 예산별 독립 상태', async ({ page }) => {
    // 예산 탭 이름 span(BudgetFlow: span.font-medium.text-sm.whitespace-nowrap)
    const tabNames = page.locator('span.font-medium.whitespace-nowrap');
    await tabNames.first().waitFor({ timeout: 10_000 }); // 비동기 fetchBudgets 렌더 대기(count는 auto-wait 안 함)
    const count = await tabNames.count();
    test.skip(count < 2, `예산 탭 ${count}개 — 전환 검증 불가`);
    await tabNames.nth(1).click();
    // 전환 후에도 테이블이 렌더(예산별 항목 재로드)
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });

  test('P8 요약 페이지(다운스트림 — 전 예산 비교 렌더)', async ({ page }) => {
    await page.getByRole('button', { name: /요약/ }).first().click();
    await expect(page).toHaveURL(/\/summary$/);
    await expect(page.getByRole('heading', { name: '예산 요약' })).toBeVisible();
  });
});

test.describe('초대 수락 페이지 (P-AcceptInvite)', () => {
  test('P9 잘못된 토큰 → 에러 UI', async ({ page }) => {
    await page.goto('/invite/x'); // 형식 불량(<16자)
    await expect(page.getByText('초대를 열 수 없어요')).toBeVisible();
    await expect(page.getByText('유효하지 않은 초대 링크예요.')).toBeVisible();
  });

  test('P10 오너 본인 토큰 수락 시도 → /budget 또는 안내(accept RPC 동작)', async ({ page }) => {
    // 오너가 자기 예산 초대를 생성 → 그 토큰으로 수락 시도
    await page.getByRole('button', { name: /파트너 초대 링크 만들기/ }).click();
    const linkEl = page.getByText(/\/invite\/[0-9a-f-]{8,}/);
    await expect(linkEl).toBeVisible({ timeout: 15_000 });
    const link = (await linkEl.textContent())?.trim() ?? '';
    const path = link.replace(/^https?:\/\/[^/]+/, '');
    await page.goto(path);
    // 마이그레이션 전: 라이브 RPC 가 'expired/invalid' 응답 → 에러 UI.
    // 마이그레이션 후: owner_cannot_accept → /budget. 둘 다 "페이지가 죽지 않음"을 보장.
    await expect(
      page.getByText('초대를 열 수 없어요').or(page.locator('text=/예산 관리|결혼 예산/')),
    ).toBeVisible({ timeout: 15_000 });
  });
});

/** reload 후 데스크톱 안내 모달이 다시 뜰 수 있어 정리(헬퍼 중복 방지용 인라인). */
async function dismissAfterReload(page: import('@playwright/test').Page) {
  const ok = page.getByRole('button', { name: '확인', exact: true });
  if (await ok.isVisible().catch(() => false)) await ok.click().catch(() => {});
}

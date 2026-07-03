// [CL-TOP20-P0-20260703-002500] 시각 회귀 스냅샷 — Top 20 리디자인 안전망(P0 #20).
// 대상: 공개(비인증) 핵심 표면. 3개 뷰포트 프로젝트(visual-desktop/mobile/tablet)에서 각각 실행.
// 갱신: 의도된 리디자인 후 `npx playwright test e2e/visual.spec.ts --update-snapshots` 로 베이스라인 재생성.
// 결정론 장치: 온보딩 캐러셀 억제(localStorage) + 애니메이션 비활성 + 폰트 로드 대기 + 허용 오차 2%.
import { test, expect, type Page } from '@playwright/test';

const SNAPSHOT_OPTS = {
  animations: 'disabled' as const,
  maxDiffPixelRatio: 0.02,
  timeout: 20_000,
};

async function preparePage(page: Page, path: string) {
  // 첫 방문 온보딩 다이얼로그 억제 — 스냅샷 결정론(키는 src/lib/onboarding.ts 단일소스)
  await page.addInitScript(() => {
    try {
      localStorage.setItem('onboarding_seen_v1', '1');
    } catch {
      /* noop */
    }
  });
  await page.goto(path);
  // Pretendard CDN 폰트 적용 완료까지 대기 — FOUT 상태 스냅샷 방지
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
}

const SURFACES = [
  { name: 'landing', path: '/', anchor: 'h1' },
  { name: 'guide', path: '/guide', anchor: 'h1' },
  { name: 'faq', path: '/faq', anchor: 'h1' },
  { name: 'auth', path: '/auth', anchor: 'h1' },
] as const;

test.describe('시각 회귀 — 공개 표면 스냅샷', () => {
  for (const s of SURFACES) {
    test(`${s.name} (${s.path}) 뷰포트 스냅샷`, async ({ page }) => {
      await preparePage(page, s.path);
      await expect(page.locator(s.anchor).first()).toBeVisible({ timeout: 15_000 });
      await expect(page).toHaveScreenshot(`${s.name}.png`, SNAPSHOT_OPTS);
    });
  }
});

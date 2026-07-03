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

async function preparePage(page: Page, path: string, opts: { dark?: boolean } = {}) {
  // 첫 방문 온보딩 다이얼로그 억제 — 스냅샷 결정론(키는 src/lib/onboarding.ts 단일소스)
  // [CL-TOP20-R50-TEST-20260703-094000] dark=true 면 next-themes 저장 키('theme') 선주입 →
  // 앱 스크립트 실행 전 다크 테마 확정(class 전략, FART/플래시 없는 결정론적 다크 렌더)
  await page.addInitScript((dark) => {
    try {
      localStorage.setItem('onboarding_seen_v1', '1');
      if (dark) localStorage.setItem('theme', 'dark');
    } catch {
      /* noop */
    }
  }, opts.dark === true);
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

// [CL-TOP20-R50-TEST-20260703-094000] 다크모드 시각 회귀 — 다크 토큰(HSL 변수) 회귀 가드.
// 대표 2표면(landing/guide) × desktop/mobile 이면 토큰 회귀 감지에 충분(전 표면 확장은 과도).
const DARK_SURFACES = SURFACES.filter((s) => s.name === 'landing' || s.name === 'guide');

test.describe('시각 회귀 — 다크모드 변형', () => {
  for (const s of DARK_SURFACES) {
    test(`${s.name} (${s.path}) 다크 스냅샷`, async ({ page }) => {
      test.skip(
        test.info().project.name === 'visual-tablet',
        '다크 변형은 visual-desktop/visual-mobile 2프로젝트만 실행(토큰 회귀 감지 충분)',
      );
      await preparePage(page, s.path, { dark: true });
      // 다크 클래스 적용 확정 후 스냅샷 — 테마 미적용 프레임 캡처 방지
      await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
      await expect(page.locator(s.anchor).first()).toBeVisible({ timeout: 15_000 });
      await expect(page).toHaveScreenshot(`${s.name}-dark.png`, SNAPSHOT_OPTS);
    });
  }
});

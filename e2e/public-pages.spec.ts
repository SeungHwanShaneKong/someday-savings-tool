// [CL-COVERAGE50-FIX-20260620] 공개 페이지 E2E 회귀 가드 — 인증 불요·결정론.
// 목적: 이번 검증에서 발견·수정한 2개 온보딩 모바일 버그 + AdSense 정책 페이지 canonical 을 라이브 렌더로 고정.
//  ① 온보딩 캐러셀이 DialogContent(grid) 안에서 min-w-0 없이 944px 로 팽창해 슬라이드가 화면 밖으로 밀리던 버그
//  ② handleNext 의 낙관적 setCurrent + embla select 합산으로 도트가 2칸씩 튀고 마지막 슬라이드를 스킵하던 버그
import { test, expect } from '@playwright/test';

const CANON = 'https://moderninsightspot.com';
const MOBILE = { width: 375, height: 812 };

const SLIDE_TITLES = [
  '예산을 한눈에',
  '신랑·신부 함께',
  '체크리스트로 차근차근',
  '캘린더로 일정·지출',
  'AI 웨딩 매니저',
  '준비할수록 즐겁게',
];

test.describe('온보딩 캐러셀 (모바일) — 버그 회귀 가드', () => {
  test.use({ viewport: MOBILE });

  test('첫 슬라이드가 다이얼로그 폭(375) 안에 정확히 렌더된다 (944px 팽창 회귀)', async ({ page }) => {
    await page.goto('/');
    const dialog = page.getByRole('dialog', { name: '웨딩셈 기능 안내' });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const heading = page.getByRole('heading', { name: SLIDE_TITLES[0] });
    await expect(heading).toBeVisible();
    // 회귀 핵심: heading 의 가로 박스가 모바일 뷰포트(375) 안에 들어와야 한다(이전엔 x≈418 로 화면 밖).
    const box = await heading.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(MOBILE.width + 1);
  });

  test('다음으로 는 정확히 (n-1)회 노출되고 마지막에만 시작하기가 뜬다 (도트 이중증가 회귀)', async ({ page }) => {
    // embla 는 모든 슬라이드를 DOM 에 유지(transform 으로 오프스크린)하므로 heading 가시성은 신뢰 불가.
    // 이중증가 버그는 current 가 2씩 올라 마지막 전에 '시작하기'가 조기 등장 → 버튼 진행으로 정밀 회귀.
    await page.goto('/');
    await expect(page.getByRole('dialog', { name: '웨딩셈 기능 안내' })).toBeVisible({ timeout: 5000 });

    // count=6 → '다음으로' 를 정확히 5회 눌러야 마지막 슬라이드에 도달.
    for (let i = 0; i < SLIDE_TITLES.length - 1; i++) {
      const next = page.getByRole('button', { name: '다음으로' });
      // 이중증가면 5회 전에 '다음으로'가 '시작하기'로 바뀌어 이 단언이 실패한다.
      await expect(next).toBeVisible();
      await next.click();
    }

    // 마지막에서만 '시작하기' 노출 + '다음으로'는 사라짐
    await expect(page.getByRole('button', { name: '시작하기' })).toBeVisible();
    await expect(page.getByRole('button', { name: '다음으로' })).toHaveCount(0);
  });
});

test.describe('AdSense 정책/정보 페이지 — canonical(트레일링 슬래시) 회귀 가드', () => {
  const PAGES = [
    { path: '/privacy/', h1: '개인정보처리방침' },
    { path: '/terms/', h1: '이용약관' },
    { path: '/about/', h1: '웨딩셈 소개' },
    { path: '/contact/', h1: '문의하기' },
  ];

  for (const p of PAGES) {
    test(`${p.path} — h1 렌더 + canonical=${p.path}`, async ({ page }) => {
      await page.goto(p.path);
      // StaticPage 는 lazy import — 콜드 컨텍스트에서 청크 로드가 5s 를 넘을 수 있어 넉넉히 대기.
      await expect(page.getByRole('heading', { level: 1, name: p.h1 })).toBeVisible({ timeout: 15000 });
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toBe(`${CANON}${p.path}`);
    });
  }

  test('개인정보처리방침에 Google AdSense/DART 쿠키 고지가 존재한다', async ({ page }) => {
    await page.goto('/privacy/');
    const body = page.locator('body');
    await expect(body).toContainText('AdSense');
    await expect(body).toContainText('DART');
  });

  test('Footer 정책 링크는 트레일링 슬래시 경로를 가리킨다 (301 홉 0)', async ({ page }) => {
    await page.goto('/');
    for (const path of ['/privacy/', '/terms/', '/about/', '/contact/']) {
      await expect(page.locator(`footer a[href="${path}"]`).first()).toHaveCount(1);
    }
  });
});

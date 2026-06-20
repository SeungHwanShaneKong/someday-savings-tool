// [CL-COEDIT-E2E-20260620-130000] Playwright E2E 설정 — 웨딩셈 공동편집 100-시나리오 검증
//
// 실행: npm i -D @playwright/test && npx playwright install chromium && npm run test:e2e
// dev 서버(8082)를 자동 기동/재사용. dev 인증은 Auth.tsx 의 'Dev 테스트 로그인'(import.meta.env.DEV) 사용.
// ※ viewport 1440 — useIsMobile(<1024)면 '데스크톱 안내' 모달이 떠 테이블을 가리므로 데스크톱 폭 고정(라이브 검증서 확인).
import { defineConfig, devices } from '@playwright/test';

const PORT = 8082;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // 단일 dev 서버 + 공유 dev 계정(실제 Supabase) → 직렬 실행으로 상태 충돌 방지
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 12_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/.report' }]],
  outputDir: 'e2e/.artifacts',
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 900 },
    trace: 'on-first-retry',
    screenshot: 'on', // 모든 스텝 스크린샷(사용자 요구: 전 시나리오 스크린샷)
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --port 8082',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});

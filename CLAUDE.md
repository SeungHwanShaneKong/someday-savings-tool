# Wedding Budget Buddy (웨딩셈)

## Tech Stack
- **Framework**: React 18 + TypeScript 5.8 + Vite 5.4 (SWC)
- **UI**: shadcn/ui (Radix UI) + Tailwind CSS 3.4 + Lucide icons
- **Routing**: React Router v6 / **State**: React Context + TanStack React Query v5
- **Forms**: React Hook Form + Zod / **Charts**: Recharts
- **DB/Auth**: Supabase (PostgreSQL, RLS) + Supabase Auth (email/password + Google OAuth)
- **AI**: OpenAI API (Supabase Edge Functions, Deno)
- **Testing**: Vitest + React Testing Library
- **배포**: GitHub Pages + Puppeteer 프리렌더 SSG (`scripts/prerender.mjs`)

## Project Structure
```
src/
├── pages/           # 라우트 페이지 (Landing, BudgetFlow, Checklist, Chat, Guide, FAQ, Article, Summary, Auth, Admin, Profile)
├── components/      # ui/(shadcn) · budget/ · chat/ · checklist/ · gamification/ · Footer/Breadcrumb 등
├── hooks/           # useAuth, useMultipleBudgets, useChecklist, useAIChat, useSEO, useStreak 등
├── lib/             # 유틸·상수 (budget-categories, external-links, kakao-browser, checklist-* 등)
├── content/         # articles.ts (SEO 아티클 레지스트리)
├── integrations/    # supabase/(client·types) · lovable/
└── test/            # setup.ts(전역 Supabase mock·cleanup) · test-utils.tsx(renderWithProviders)
```

## Commands
- `npm run dev` — 개발 서버(8080) / `npm run build` — 프로덕션 빌드 / `npm run build:ssg` — 빌드+프리렌더
- `npm run lint` — ESLint / `npm run test` — Vitest(1회) / `npm run test:watch`
- **테스트 안정화**: `vitest.config.ts`는 `pool:'forks' + singleFork:true`(Windows IPC/OOM 방지) + Supabase env `define` + 전역 client mock. 대용량 `NODE_OPTIONS` heap은 멀티포크와 충돌하므로 사용 금지.

## Work Rules (필수 준수)
- **25인 MECE 에이전트 거버넌스**: `.claude/agents/`의 실제 호출 가능한 서브에이전트 25인 풀 상시 운영(아래 섹션). 모든 업무마다 최적 **11인 TF** 편성, 반드시 **S-1 Supervisor/PM** 포함(목표 이탈 방지·실시간 코칭).
- **더 나은 방안 제시(S-6)**: 사용자 명령을 그대로 추종하지 말고, 항상 더 나은 대안·리스크·최적화를 선제 분석·제시 후 협의·실행.
- **Advanced Harness 2.0**: 기본 Agentic Harness보다 10배 정밀한 계획(아래 섹션). 전체 코드 의존성 완전 파악 후 구체 실행.
- **병렬 실행(지속)**: 상호 독립적이고 이슈 없는 작업은 순차가 아닌 **병렬**로 완료(서브에이전트 동시 투입·단일 메시지 다중 도구 호출).
- **Batch 실행(지속)**: 여러 Bash 명령은 하나로 묶어 실행해 승인 횟수 최소화. 커밋/로그도 한 번에 처리.
- **로그 우선**: 미작동·오류 시 추측 금지 — 무조건 로그(console·Edge Function·Supabase·DevTools·빌드 출력)부터 확인 후 해결, 해결될 때까지 반복.
- **LSP 우선**: TypeScript LSP로 타입 에러·미사용 변수·import 오류 사전 감지.
- **추적성(Revert)**: 모든 생성/수정 코드에 고유 ID + 초 단위 timestamp 주석(`[CL-<NAME>-YYYYMMDD-HHMMSS]`).
- **CLI/MCP/Skill 자율 활용**: "안 된다" 전에 CLI·MCP·Skill을 직접 조작해 임무 완수.
- **데이터 풍성화**: 실제 데이터 최우선. 없을 때만 Mock을 실제 운영 유사·기존 대비 50배 이상 확장.
- **3회 검증 + 10 시나리오**: 수정 후 서로 다른 시나리오 3회 검증, 전체 완료 전 MECE 10 시나리오로 최종 검수. 정상일 때만 완료.
- **이슈 투명성**: [발생 원인 - 기술적 내용 - 해결책] 정리 후 직접 실행·해결.
- **진척 보고**: 5% 간격으로 진행률 + 플랜 토큰 잔량(%) 출력.
- **알림(지속)**: 계획된 모든 작업 완료 시에만 사운드 알림(종료 15초 후 추가 액션 없으면 2회 연속).
- **언어**: 모든 보고는 최상급 한국어. **3줄 요약**으로 마감.
- **GitHub**: 즉시 push 금지 — 사용자가 명시할 때만 반영.
- **완료 메시지**: 모든 검증 완료 시 출력 → `행복해! 참으로 감사한 삶이다! 작업 완료! + 작업에 소요된 시간 OO시간 OO분 OO초`

## 25인 MECE 에이전트 풀 (`.claude/agents/`, 항상 활성)
모든 작업은 25인 중 최적 11인 TF가 수행하며 **★S-1 PM은 필수 포함**. 각 역할은 실제 서브에이전트 마크다운으로 정의되어 호출 가능.
- **전략/아키텍처**: A-1 Product Strategist · A-2 Software Architect · A-3 Tech-Stack/Dependency Auditor
- **UI/UX**: B-1 UX/Interaction Designer · B-2 Accessibility(WCAG/ARIA·Radix) · B-3 Design-System/Tailwind
- **프론트엔드**: C-1 React/State · C-2 Router/Navigation · C-3 Forms/Validation(RHF+Zod) · C-4 Performance/Web-Vitals
- **백엔드/인프라**: D-1 Supabase/Edge-Functions · D-2 Database/RLS/Migration
- **보안**: ★E-1 Vulnerability Scanner · E-2 Auth/Session/CSP
- **품질(QA)**: ★F-1 Test Architect · F-2 Interaction/E2E Test · F-3 Regression/Edge-case
- **AI**: H-1 Prompt/RAG Architect · H-2 AI-UX/Guardrail/Fallback
- **데이터/콘텐츠**: I-1 Korean Content/Localization · I-2 SEO/SSG/Structured-Data
- **그로스**: G-1 Growth/Analytics(GA4·리텐션)
- **수퍼바이저**: ★S-1 Supervisor/PM(필수) · S-2 Risk/Rollback · S-6 Better-Alternative Proposer

## Advanced Harness 2.0 (10x 실행 프로토콜)
1. **TF 편성(S-1)**: 작업 분석 → 25인 중 최적 11인 선발(S-1 필수).
2. **Discovery**: 전체 소스 병렬 탐색(Explore 에이전트) → Context Mirror 구축.
3. **Better Alternative(S-6)**: 사용자 명령 대비 더 나은 방안 검토·제시·협의.
4. **Agentic 10x Plan**: 전체 코드 기반 구체 계획(기본 대비 10배 정밀, 파일·패턴·검증까지 명시).
5. **Harness 선구축**: 검증 테스트·하네스 사전 구축(예: `renderWithProviders`, 프리렌더 self-verify).
6. **병렬 Surgical 구현**: Side-effect Zero. 독립 작업은 서브에이전트 병렬 투입, 공용 토대는 먼저 단일 구축 후 분기.
7. **3x Verification + 10 시나리오**: 서로 다른 3회 → 실패 시 4 회귀. 최종 MECE 10 시나리오 검수.

## Conventions
- Path alias `@/*` → `./src/*` / 한국어 UI / 함수형 컴포넌트 + 훅
- Tailwind HSL 변수 + 다크모드(class 전략) / 수동 청크 분할: vendor(React/Radix), vendor-chart(Recharts)
- Supabase 마이그레이션 `supabase/migrations/` / 프리렌더 라우트는 trailing-slash canonical(`/guide/`), 앱 라우트는 슬래시 없음(`/budget`)
- 테스트: 페이지/컴포넌트는 `renderWithProviders`(MemoryRouter+QueryClient+TooltipProvider). 모든 페이지가 `<Footer/>`(중복 링크명) 렌더 → 링크/버튼 쿼리는 `within()`로 범위 스코핑. useAuth 사용 컴포넌트는 파일 상단 `vi.mock('@/hooks/useAuth', ...)`.

## Lessons Learned (가장 중요한 교훈 — 재발 방지)
- **[CL-QA100-BTN-20260531]** 테스트 안정화: 멀티fork×대용량heap=Windows IPC/OOM 크래시 → `singleFork`로 해결. 컴포넌트 테스트는 Supabase env `define`+전역 client mock 필수(Footer→FeatureRequestButton이 client import). 페이지마다 Footer가 동명 링크 추가 → `within()` 스코핑. 테스트가 실제 버그 발견(Footer가 `/guide`·`/faq` 슬래시 누락 → 301 hop) 후 교정.
- **[CL-SSG-PRERENDER-20260531]** CSR SPA를 GitHub Pages 배포 시 빌드-후 Puppeteer 프리렌더가 최저 리스크(실제 브라우저=SSR 폴리필 불필요, createRoot 유지, useSEO JSON-LD 자동 캡처). 디렉터리형 출력+trailing-slash canonical, `404.html` SPA 폴백, sitemap 단일소스화. noscript는 프리렌더 후에도 남으므로 CSR 판별은 본문 마커로.
- **[CL-GAMIFY-INT-20260418]** 공용 Foundation 1회 구축으로 기능 경량화. Supabase types.ts 수동확장으로 타입-safe(배포 후 regen 동일). Rule-engine은 discriminated union + `_exhaustive:never`. streak-calc 미래날짜 필터(`daysBetween>=0`) 누락 버그 테스트로 발견.
- **[CL-SEC-HARDEN-20260418]** `window.location.href=userInput`은 origin allowlist+HTTPS-only+URL파싱 3중 검증. service_role Edge Function은 ENVIRONMENT 가드+공유시크릿+IP rate limit+이메일 regex+감사로그 5층 방어.
- **[CL-AI-EXTNAV-OVERLAY-20260418]** 외부 도메인 전환 시 공백 UX 붕괴 → 400ms 지연 navigation + 풀스크린 portal 오버레이 + 단계 메시지 + preconnect + 8초 safety timeout. z-index는 toast(z-100) 하위 z-[90].
- **[CL-CHECKLIST-9PERIOD-20260412]** 유니온 타입 확장은 타입정의→상수맵→템플릿→분기→테스트→DB 동시 일치. grep 전수조사 후 일괄 치환. 기존 DB는 `CASE WHEN title ILIKE '%X%'` 무손실 매핑.
- **[CL-FK-BUDGET-DELETE-20260412]** FK 다중참조 삭제는 DB `ON DELETE SET NULL` + 클라이언트 사전 cleanup(`update({budget_id:null})`) 이중 방어.
- **[CL-AI-CHAT-LIMIT5-20260408]** 폴백 체인(rag-query→ai-chat) 모든 단계에 동일 rate limit 복제 + `feature` 컬럼 scope. 클라이언트는 RAG 429 시 폴백 차단.
- **[CL-HONEYMOON-BACK-STATE-20260408]** "항상 초기화" vs "뒤로가기 보존" 충돌은 출발측 `sessionStorage` 플래그 세팅 → 도착측 consume 분기.
- **[CL-QA-50-SWEEP-20260408]** Radix Sheet/Dialog는 `<SheetDescription className="sr-only">` 누락 시 `aria-describedby` 콘솔 경고 — 스크린리더 전용 설명 필수.
- **[CL-SKIP-SCHEDULE-20260405]** 숙박일 변경 시 `nightsRatio` 비례 스케일링(flight 고정). 온보딩 스텝 제거는 타입→순서→프로그레스→뒤로가기→셸→라우팅 전수 변경.
- **[CL-PLAN-ADD-DEST-NOMAP-20260405]** 동적 목록은 props 배열이 아닌 글로벌 소스(`getDestinationById`)로 해상도. 제거 기능은 import만 끊고 파일 보존(tree-shaking).
- **[CL-WORLDCUP-IMG-ALGO-20260405]** 외부 CDN 이미지는 빌드 검증 + 런타임 `onError` 폴백 동시 적용. 사용자 선택(월드컵 랭킹)은 AI 매칭점수보다 강한 시그널 → 고정 슬롯 배치.
- **[CL-WORLDCUP-CONNECT-20260330]** Unsplash photo ID는 WebFetch로 개별 검증(AI 생성 URL 불신). 데이터 소스 간 동일 photo ID 중복 방지.
- **[CL-MAP-WORLDCUP-FIX-20260330]** react-map-gl은 `viewState`(인터랙션)와 `flyToTarget`(프로그래밍) 분리, 호출 후 즉시 null 클리어. (이후 maplibre 제거됨.)
- **[CL-TIMELINE-FALLBACK-20260403]** 외부 AI API 기능은 반드시 로컬 폴백 준비 + `isFallback` state로 구분, catch에서 에러+폴백 동시 설정.

# Wedding Budget Buddy (웨딩셈)

## Tech Stack
- **Framework**: React 18 + TypeScript 5.8 + Vite 5.4 (SWC)
- **UI**: shadcn/ui (Radix UI) + Tailwind CSS 3.4 + Lucide icons
- **Routing**: React Router v6 / **State**: React Context + TanStack React Query v5
- **Forms**: React Hook Form + Zod / **Charts**: Recharts
- **DB/Auth**: Supabase (PostgreSQL, RLS) + Supabase Auth (email/password + Google OAuth)
- **AI**: OpenAI API (Supabase Edge Functions, Deno)
- **Testing**: Vitest + React Testing Library
- **배포**: GitHub Pages + Puppeteer 프리렌더 SSG (`scripts/prerender.mjs`). 정식 도메인 = apex `moderninsightspot.com`.

## Project Structure
```
src/
├── pages/           # 라우트 페이지 (Landing, BudgetFlow, Checklist, Chat, Guide, FAQ, Article, Summary, Auth, Admin, Profile)
├── components/      # ui/(shadcn) · budget/ · chat/ · checklist/ · gamification/ · Footer/Breadcrumb 등
├── hooks/           # useAuth, useMultipleBudgets, useChecklist, useAIChat, useSEO, useStreak 등
├── lib/             # 유틸·상수 (budget-categories, external-links, kakao-browser, checklist-* 등)
├── config/          # site.ts (SITE_ORIGIN 단일소스) — SEO/canonical 절대URL 전용
├── content/         # articles.ts (SEO 아티클 레지스트리)
├── integrations/    # supabase/(client·types) · lovable/
└── test/            # setup.ts(전역 Supabase mock·cleanup) · test-utils.tsx(renderWithProviders)
```

## Commands
- `npm run dev` — 개발 서버(8080) / `npm run build` — **프로덕션 빌드(프리렌더 SSG 포함)** / `npm run build:csr` — 순수 CSR 빌드
- `npm run lint` — ESLint / `npm run test` — Vitest(1회) / `npm run test:watch`
- **테스트 안정화**: `vitest.config.ts`는 `pool:'forks' + singleFork:true`(Windows IPC/OOM 방지) + Supabase env `define` + 전역 client mock. 대용량 `NODE_OPTIONS` heap은 멀티포크와 충돌하므로 사용 금지.
- **검증 오라클**: `tsc -b --noEmit`(⚠️ bare `tsc --noEmit`는 이 repo에서 가짜그린) · `vitest run`(3회) · `pnpm run build:ssg` · dist grep. **PM=pnpm**(npm은 `link:` 실패).

## Work Rules (필수 준수)
- **25인 MECE 에이전트 거버넌스**: `.claude/agents/`의 실제 호출 가능한 서브에이전트 25인 풀 상시 운영(아래 섹션). 모든 업무마다 최적 **11인 TF** 편성, 반드시 **S-1 Supervisor/PM** 포함(목표 이탈 방지·실시간 코칭). PM=메인 스레드.
- **더 나은 방안 제시(S-6)**: 사용자 명령을 그대로 추종하지 말고, 항상 더 나은 대안·리스크·최적화를 선제 분석·제시 후 협의·실행.
- **Advanced Harness 2.0**: 기본 Agentic Harness보다 10배 정밀한 계획(아래 섹션). 전체 코드 의존성 완전 파악 후 구체 실행.
- **병렬 실행(지속)**: 상호 독립적이고 이슈 없는 작업은 순차가 아닌 **병렬**로 완료(서브에이전트 동시 투입·단일 메시지 다중 도구 호출).
- **Batch 실행(지속)**: 여러 Bash 명령은 하나로 묶어 실행해 승인 횟수 최소화. 커밋/로그도 한 번에 처리.
- **로그 우선**: 미작동·오류 시 추측 금지 — 무조건 로그(console·Edge Function·Supabase·DevTools·빌드 출력)부터 확인 후 해결, 해결될 때까지 반복.
- **LSP 우선**: TypeScript LSP로 타입 에러·미사용 변수·import 오류 사전 감지.
- **추적성(Revert)**: 모든 생성/수정 코드에 고유 ID + 초 단위 timestamp 주석(`[CL-<NAME>-YYYYMMDD-HHMMSS]`).
- **CLI/MCP/Skill 자율 활용**: "안 된다" 전에 CLI·MCP·Skill을 직접 조작해 임무 완수.
- **데이터 풍성화**: 실제 데이터 최우선. 없을 때만 Mock을 실제 운영 유사·기존 대비 50배 이상 확장(격리·`is_synthetic`·분포검증).
- **3회 검증 + 10 시나리오**: 수정 후 서로 다른 시나리오 3회 검증, 전체 완료 전 MECE 10 시나리오로 최종 검수. 정상일 때만 완료.
- **이슈 투명성**: [발생 원인 - 기술적 내용 - 해결책] 정리 후 직접 실행·해결.
- **진척 보고**: 페이즈 게이트(`[n/N] 단계`)를 **전체 작업량의 ~10% 간격 체크포인트**로 출력(실제 단계 전환 시·가짜 5% 카운터 금지) + 컨텍스트 여유 3단 신호(충분/주의/임박).
- **알림(지속)**: 계획된 모든 작업 완료 시에만 사운드 알림(종료 15초 후 추가 액션 없으면 2회 연속).
- **언어**: 모든 보고는 최상급 한국어. **3줄 요약**으로 마감.
- **GitHub**: 즉시 push 금지 — 사용자가 명시할 때만 반영. DB 마이그레이션·Edge 배포·DNS·대시보드 = 사용자 실행.
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
7. **3x Verification + 10 시나리오**: 서로 다른 3회 → 실패 시 4 회귀. 최종 MECE 10 시나리오 검수. **생성≠검증**(독립 skeptical-verifier).

## Conventions
- Path alias `@/*` → `./src/*` / 한국어 UI / 함수형 컴포넌트 + 훅
- Tailwind HSL 변수 + 다크모드(class 전략) / 수동 청크 분할: vendor(React/Radix), vendor-chart(Recharts)
- Supabase 마이그레이션 `supabase/migrations/` / 프리렌더 라우트는 trailing-slash canonical(`/guide/`), 앱 라우트는 슬래시 없음(`/budget`)
- **도메인**: SEO 절대URL은 `src/config/site.ts`(`SITE_ORIGIN`) 단일소스. 런타임(OAuth·초대·탈출)은 `window.location.origin`(호스트 무관).
- 테스트: 페이지/컴포넌트는 `renderWithProviders`(MemoryRouter+QueryClient+TooltipProvider). 모든 페이지가 `<Footer/>`(중복 링크명) 렌더 → 링크/버튼 쿼리는 `within()`로 범위 스코핑. useAuth 사용 컴포넌트는 파일 상단 `vi.mock('@/hooks/useAuth', ...)`.

## Governance & Rules 포인터 (Harness 6-5 점진 노출)
- **프로젝트 규칙**: `.claude/rules/deployment.md`(GitHub Pages·Gabia DNS·도메인 토폴로지·cutover 순서) · `.claude/rules/seo-ssg.md`(canonical/sitemap/prerender·SITE_ORIGIN). 일반 규칙은 전역 `~/.claude/rules/`(orchestration·verification·testing·security·code-style·data-governance·communication) 상속.
- **교훈 전체 아카이브**: `.dev/lessons-learned.md` — **신규 교훈은 여기 적재**(CLAUDE.md엔 Top 5만). AI 작업 로그·트러블슈팅도 `.dev/`.
- **골든/회귀 1급 자산**: `tests/golden/`(예: canonical 도메인 회귀 가드).
- **Top 20 UX 로드맵(승인·진행 중)**: `.dev/top20-upgrade-roadmap-20260702.md` — P0~P5 Phase·항목별 근거(file:line)·DoD. 방문자 퍼널 계측=`src/lib/analytics/funnel-events.ts`, 시각 회귀=`e2e/visual.spec.ts`(visual-* 프로젝트).

## Lessons Learned (Top 5 — 전체는 `.dev/lessons-learned.md`)
- **[CL-DOMAIN-PROMOTE-20260621]** 정식 도메인=apex `moderninsightspot.com`(GitHub Pages 직접 서빙), `wedsem.…`→apex 자동 301. 런타임은 `window.location.origin`(호스트 무관), SEO 절대URL만 `src/config/site.ts`(`SITE_ORIGIN`) 단일소스(7곳). **AdSense는 등록지=서빙지 일치가 안전**(리다이렉트로 빼지 말 것). 컷오버=**DNS(Gabia A→GitHub) 먼저 → push 나중**(반대면 좀비로 튕김). [CL-ADSENSE]의 'apex→wedsem 301' 권고 대체.
- **[CL-COEDIT-E2E-20260620]** 공동편집="예산별 공유 뷰 필터"(협업자 0=개인/있으면 우리). field-level LWW+3중 에코억제, 낙관적+`.select().single()` ACK+롤백, 초대 멱등(409→기존 토큰). 마이그/Edge는 사용자 적용. 상세 `.dev/`.
- **[CL-OAUTH-LOVABLE-BROKER-20260613]** 정적 호스트엔 백엔드 의존 인증 금지 → Supabase 네이티브 `signInWithOAuth({redirectTo})`+`detectSessionInUrl`+`pkce`(호스트 비종속). 대시보드 Redirect URLs에 도메인 `…/**` 등록 필수.
- **[CL-SSG-PRERENDER-20260531]** GitHub Pages는 빌드-후 Puppeteer 프리렌더(디렉터리형+trailing-slash canonical, `404.html` SPA 폴백, sitemap 단일소스). CSR 판별은 본문 마커(noscript 잔존).
- **[CL-SEC-HARDEN/R1/R2]** 정적 SPA는 RLS가 유일 보안경계 → 컬럼불변 트리거(소유권/항목 절취 차단)·관리자 게이트·feature allowlist·형제함수 레이트리밋·intent 살균·realtime `REPLICA IDENTITY DEFAULT`·공급망 frozen-lockfile. 상세 `.dev/` + git `cfc10c1`·`79b4f68`.

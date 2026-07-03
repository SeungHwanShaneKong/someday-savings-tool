# Top 20 UX 로드맵 전면 구현 로그 (P0~P5) — 2026-07-03

정본 로드맵: `.dev/top20-upgrade-roadmap-20260702.md` (전 20항목 구현 완료, 미커밋 워킹트리)

## Phase별 결과 (각 Phase: 오라클 green + 독립 skeptical-verifier GO)

| Phase | 항목 | 검증 |
|---|---|---|
| P0 | 퍼널 이벤트 lib(funnel-events.ts)·Playwright visual-* 3뷰포트+스냅샷 12장·위생(table.tsx 토큰화, BudgetTable a11y+dnd 타입, LoadingSpinner motion-reduce, TimelinePanel 15s 피드백) | 1145 green. 오탐 2건 스킵(useBudget useCallback 기구현·honeymoon-images import 정상) |
| P1 | #1 /demo 게스트 체험(BudgetTable 재사용·DB 0·sessionStorage)+#2 TrustSection(허위후기 0)+#3 LandingBudgetSimulator+#4 웜톤 토큰(--wedding-*)·WeddingMark SVG+#5 카드 3+3+#6 woff2 preload | 1182 green·verifier GO(발견 1건 demo_enter_click 신설로 반영) |
| P2 | #7 AppHeader(allowlist·/demo 제외·4페이지 헤더 비스티키 전환)+#8 다크모드(next-themes·FOUC 스니펫 완벽화)+#9 로그인 허브(WeddingCountdown+빠른이동 4카드)+#10 아티클(읽기시간·진행바·contextualCta 5편·앵커복사) | 1212 green·verifier GO(관찰 3건 전부 반영: 게이팅 테스트·/demo 가드·color-scheme) |
| P3 | #11 BudgetSetupWizard(6중 게이트·updateAmount 재사용)+#12 SmartWonInput(만/억·IME·평균1탭)+#13 HiddenCost 배선(고스트→라이브·O(1) 인덱스)+#14 Summary(로컬 인사이트+AI 버튼·캐시+모바일 카드)+#15 체크리스트 긴급도(단일소스 위임·배너·긴급순·D-day 프리뷰) | 1319 green·verifier GO(결함 0) |
| P4 | #16 협업(수락 축하·파트너 활동 칩·상대시간)+#17 AI챗(스타터 칩·예산 컨텍스트 옵트인 PII-0·쿼터 프리엠티브)+#18 게이미피케이션(진행 링·첫배지 풀스크린 ≤39파티클·NextMilestoneCard 허브 통합) | 1407 green·verifier GO(결함 0) |
| P5 | #19 터치 40px([&_svg] specificity 함정 실측 해결)+PWA(manifest·아이콘 192/256/512 ico 추출·InstallPrompt 30일 억제·iOS 안내) + 최종 게이트 | 본 로그 시점 최종 게이트 실행 중 |

## 아키텍처 결정 기록
- 게스트 체험은 실 BudgetTable 재사용(의존 전수 감사로 부작용 0 입증) — 데모≠모조.
- AppHeader 는 콘텐츠 표면 한정 allowlist + 페이지 헤더 비스티키 위임(이중 스택 해소). /demo 는 전용 전환 헤더 우선으로 제외.
- AI 예산 컨텍스트는 Drawer 미주입·/chat 한정(전역 훅의 자동 예산생성 부작용 + AuthProvider 테스트 계약 때문 — 근거 문서화됨).
- 챗 프리뷰·후기는 정직성 원칙: 캔드 Q&A는 지식베이스 1:1 대조, 후기는 "활용 예시" 라벨(허위 후기 0).

## 잔여/후속 (전부 비차단)
- src 전체 ESLint 선재 에러 84건(이번 스프린트 접촉 파일 0건) — 별도 부채 정리 세션 권장.
- 비로그인 ChatDrawer 스타터칩 무반응 가능성(HEAD부터의 익명 드로어 동작 연장) — 로그인 유도 개선 여지.
- PWA 512 아이콘은 256 업스케일(정직 고지) — 디자이너 원본 제작 권장. SW/오프라인은 의도적 스킵(캐시 무효화 리스크).
- rag-query 경로 예산 컨텍스트 탑재는 Edge 수정 필요(사용자 배포 몫). SSE 스트리밍 동일.
- Summary 검증 중 worktree 정션 사고 1회(즉시 frozen-lockfile 복구·재검증 완료) — worktree 제거 시 정션 선해제 교훈.

## 재현 오라클
`pnpm exec tsc -b --noEmit` · `pnpm exec vitest run`(1400+) · `pnpm run build:ssg`(23라우트) · `pnpm exec playwright test e2e/visual.spec.ts`(12 스냅샷) · git 백업 커밋 `63d2523` + 브랜치 `backup/top20-20260703`(push 는 사용자 명시 시).

---

# R50 — 배포본(HEAD) 대비 퇴화·충돌 전수검토 + 부족점 50 발굴 (2026-07-03)

목적: 배포본 대비 **후퇴 0** 보증. 워크플로 `wf_ce1bd2bc-cee`(80 에이전트: 회귀 헌터 11 + 부족점 발굴 10 + 적대검증 58) → 회귀후보 4·부족점후보 55 → **적대검증 통과 유효 25건**. 헌터 9/11 이 근거와 함께 "회귀 없음" 판정.

## 진짜 회귀 2건 (PM 즉시 근본수정)
- **[REG-1·sev4] 폰트 preload 404** (`index.html`): P1에서 추가한 woff2 preload URL `.../dist/web/variable/woff2/...` 가 CDN 404(curl 실증). LCP 최적화가 오히려 무효 요청 발생. **해결**: Pretendard CSS 원문의 `@font-face` 상대경로를 절대화한 실경로 `.../packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2`(200 검증)로 교정. **교훈: 외부 CDN preload URL 은 반드시 실HTTP 검증(curl -I) 후 커밋.**
- **[REG-2·sev3] Article 앵커 오프셋** (`Article.tsx`): P2에서 페이지 헤더를 비스티키로 바꿨는데 AppHeader(sticky h-14) 추가로 총 오프셋이 56→112px 로 변했으나 `scroll-mt-20`(80px) 잔존 → 앵커 점프 시 제목 가림. **해결**: `scroll-mt-28`(112px).

## 부족점 유효 23건 수정 (4팀 병렬, 파일 소유권 분리)
- 다크모드 공백 3건(Checklist 타임라인 버튼·TimelinePanel 스켈레톤/월섹션 — 다크 토글 도입으로 실사용됨) → dark: 변형(라이트 불변)
- a11y 4건(HiddenCostTrigger 터치 36px·ChatInput/ChatDrawer aria-label·BadgeChip 상태 라벨[기수정 확인])
- 에러/로딩 상태 3건(챗 전송 실패 재시도 UI·NudgeBanner 저장 실패·챗 예산칩 로딩)
- 계측 3건(signup_complete 근사·wizard_enter/apply — open 전이 1회 정정)
- SEO 1건(/demo noindex — useSEO 대칭 슬롯)
- 성능/수명 2건(Summary useNegotiateCoach 서브컴포넌트 한정·summary 인사이트 캐시 TTL 10분)
- IME 1건(**SmartWonInput 스테일 pendingBlur 조기 커밋 — 뮤테이션 오라클로 실결함 재현 후 근본수정**)
- 카피 1건(시뮬레이터 '실속 위주'→'비용 절감')·모바일 1건(BudgetTable min-w 480/sm:600)·KST 1건(MobileDesktopNotice)
- 테스트 보강: 위저드 통합 3·챗 재시도 4·IME 3·PWA 스토리지 3·다크 스냅샷 4장(총 16장)

## PM 기각 1건 (근거)
- **[#24] 허니문 스토리지 키 v2 개명**: 배포 사용자의 기존 `honeymoon_onboarding_*` 저장 상태를 **고아로 만들어 진행상황 소실** = 실질 퇴행. "후퇴 금지" 원칙상 기각. 키 개명 대신 기존 loadState 검증으로 이미 안전(검증관도 "런타임 fix 불요" 인정).

## 이슈: vitest 플래키 (18 failed → 재현 0)
- **발생 원인**: 복합 게이트(`vitest→build:ssg→playwright` 체인)에서 vitest 18 failed 관측. **기술 내용**: singleFork(Windows OOM 방지) 하 1444 테스트 단일 프로세스 누적 메모리 + 복합 명령 리소스 경합. 격리 재실행 2회 모두 1444/1444 green(결정론적 결함이면 매회 동일 실패 재현돼야 하나 0건). 또 `| tail -4` 가 vitest 종료코드를 가려 체인이 오탐 통과. **해결**: 게이트를 vitest 단독 격리 실행으로 분리 판정, `| tail` 종료코드 마스킹 금지. **교훈 → CLAUDE.md.**

## R50 최종 오라클
tsc 0 · vitest 격리 **1444/1444** · build:ssg 23 · 시각 스냅샷 16(다크 4 추가) · 백업 커밋 2개(63d2523 + R50).

---

# SEC-AUDIT — 신규코드 5렌즈 적대 보안감사 (2026-07-03)

목적: 배포 전 신규 코드(Top20+R50)의 보안·안정성·성능·에러·엣지 취약점 근절. 워크플로 `wf_d218a1f5-330`(28에이전트: 5렌즈 finder + 적대검증) → **22 후보 → 적대검증 통과 6건 확정**(false_positive 11·already_mitigated 5). **치명(sev4-5) 0건** — 9라운드 감사+Top20+R50 하드닝 결과. 취약점 억지 부풀리기 없이 실재 6건만 근본수정(TDD: 실패테스트 red→근본수정→green, 판별력 검증).

## 확정 6건 근본수정 (증상무마 0 — 독립검증 GO)
- **#1+#3 [perf·pri15/8] 체크리스트 불안정 items 참조 캐시 상시미스**: Checklist.tsx 기간필터 IIFE→`useMemo([items])` + ChecklistPeriodSection `groupItemsByCategory` memo → countUrgency/sortItemsByUrgency 캐시 복원(CategoryGroup 무수정). DOM 시맨틱 100% 보존. 판별력: memo 되돌리면 재실패 확인.
- **#2 [데이터경계·pri12] /demo 가 실사용자 `budget-category-order` localStorage 양방향 오염**: useCategoryOrder 옵셔널 `storageKey`+모듈 오버라이드(`resolveStorageKey`: 인자>오버라이드>기본), Demo 전용키 `demo-category-order` 물리격리. BudgetTable no-arg 하위호환 100%. 언마운트 cleanup(누수0).
- **#4 [error·pri6] NudgeBanner 저장 중 외부클릭 팝오버 닫힘→폼 유실**: `onOpenChange`에 `!next && saving` 가드. 성공 시 명시적 닫기로 우회.
- **#5 [edge·pri6] isFirstBadgeUnlock(null) 오탐→첫배지 풀스크린 오발동**: null=미상→`==null` 종단 false 가드 + useGamificationState 상류 배열 정규화(이중방어). `[]`(진짜 0개)→true 보존.
- **#6 [error·pri4] clearMessages 미처리 reject**: try/catch 로컬/서버 분리(UI 즉시삭제 보장·서버실패 격리·debug 관측성). R50 재시도 UI 무손상.

## 잔여 리스크(문서화·수용)
- useCategoryOrder.tsx 모듈 레벨 mutable 전역(`categoryOrderScopeOverride`)이 code-style §4 형식 상충. **실제 경쟁조건 없음**: 단일 쓰기주체(Demo뿐)·SPA 단일활성라우트(/demo↔/budget 동시마운트 불가)·언마운트 cleanup. 향후 개선안 = Context 기반 스코핑(BudgetTable prop-drilling 제약 해소 시). 소스 주석 명시.
- 기각 16건: false_positive 11(ReadingProgress resize·SmartWon 오버플로/ReDoS·trackFunnel storage 등 — 이미 방어) + already_mitigated 5(챗 컨텍스트 옵트아웃 레이스·getUrgencyLevel UTC 등).

## SEC-AUDIT 최종 오라클
tsc 0 · vitest **1471/1471**(+27 보안테스트) · build:ssg 23 · 시각 16 green · 독립검증 GO(배치+#5+#6 서브검증). 커밋+푸시+GitHub Pages 배포 진행(사용자 명시 승인).

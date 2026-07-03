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
`pnpm exec tsc -b --noEmit` · `pnpm exec vitest run`(1400+) · `pnpm run build:ssg`(23라우트) · `pnpm exec playwright test e2e/visual.spec.ts`(12 스냅샷) · git 미커밋(push 는 사용자 명시 시).

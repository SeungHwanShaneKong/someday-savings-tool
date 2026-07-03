# 웨딩셈 전 코드 리뷰 → Top 20 업그레이드 마스터플랜

## 1. Context

- **요청**: 전체 코드(421파일·~62k라인)를 1줄도 빠짐없이 검토 → major 개선·보강점 Top 20 추출 → 완벽한 업그레이드 계획 수립. 핵심 목표 = **방문 고객 UX/UI의 대도약**.
- **사용자 합의**: ① 타깃 = 익명 첫방문자 50 : 로그인 사용자 50 ② **과감한 리디자인 허용**(Tailwind HSL 토큰 시스템 유지) ③ 이번 턴은 **계획 수립까지**(구현은 별도 지시).
- **CLAUDE.md 추가 요청 항목**: 요청된 거버넌스(25인 풀·11인 TF·Advanced Harness 2.0·병렬/Batch·진척보고·better-alternative)는 이미 프로젝트 CLAUDE.md에 전부 명문화 → **중복 추가 없음**(§6-6 단순화 원칙). 구현 착수 시 "Top 20 로드맵 포인터" 1줄만 추가 권장.

## 2. 리뷰 방법론·커버리지 증빙 (재현 가능)

- 워크플로 `wf_bf18ad6e-b1d` (91 에이전트·596만 토큰·도구 2,191회): **전량 독해 33번들 → 12차원 심층 리뷰 → 369 원시후보 → 44 클러스터 → 적대적 독립 검증 41건 → 완결성 크리틱**.
- **파일 커버리지: 421/421 (미커버 0)** — 기계 대조로 확인. 판정 분포: valid 4 · partial 36 · inaccurate 1 (검증관이 코드를 직접 열어 반증 시도).
- 정직 보고: ① 44클러스터 중 3건은 검증관 구조화 출력 실패로 미판정(구현 착수 시 해당 주제 재검증) ② "랜딩 히어로 전면 리디자인" 류 과장 주장은 검증관이 **inaccurate** 판정(현 히어로는 이미 상당 수준) — 잔여 유효분만 Top 20에 반영 ③ PM(메인 스레드)이 최상위 근거 4건 직접 재확인(HiddenCostWarning 고스트·manifest 부재·auth 게이트·다크토글 부재 — 모두 일치).
- 전체 상세 근거: `…\tasks\w2jek9u2z.output` (조건부 참조).

## 3. Top 20 개선점 (검증 통과분만, 임팩트순)

> 표기: [대상] visitor(익명)/user(로그인)/both · impact(1~5, 검증관 재산정) · effort S/M/L

### 🅐 방문자 전환 대도약

**1. 게스트 체험 모드 `/demo` + 랜딩 AI 챗 프리뷰** — [visitor · 4.5 · L] `valid`
- 현재: 핵심 라우트 전부 로그인 게이트([Chat.tsx:43](src/pages/Chat.tsx:43), [BudgetFlow.tsx:389](src/pages/BudgetFlow.tsx:389), Checklist/Summary 동일). 랜딩 카드의 "체험하기"가 전부 /auth로 튕김 — 가입 전 가치 체험 0.
- 제안: ① `/demo` 라우트 — 샘플 예산(서울·하객 300·~2억) 프리필 + sessionStorage 로컬 수정 체험(읽기전용 DB), 상단 "내 예산 만들기 → /auth" CTA ② 랜딩에서 무가입 AI 챗 1~2회 체험(sessionStorage 카운트, 기존 rate-limit 위에서) ③ 체크리스트 게스트 미리보기. 프리렌더 가능 → SEO 랜딩페이지 역할 겸용.

**2. 소셜 프루프·신뢰 시그널 (후기 캐러셀 + 정직 지표)** — [visitor · 4.5 · L] `valid`
- 현재: [Landing.tsx:365-406](src/pages/Landing.tsx:365) KPI 3종 숫자만, 후기·스토리 0. Auth 페이지 신뢰 카드 없음.
- 제안: 후기 캐러셀(기존 Embla [carousel.tsx](src/components/ui/carousel.tsx) 재사용, 이름·연도·1줄 후기·별점), "웨딩셈을 믿는 이유" 마이크로헤딩, kpiFact 인프라 연동 정직 지표, Auth 신뢰 카드. ※ 후기는 실데이터 원칙 — 실제 피드백(FeatureRequest 등)에서 발췌하거나 "베타 사용자 사례" 명시(허위 후기 금지).

**3. 랜딩 인터랙티브 예산 미니 시뮬레이터** — [visitor · 3.5 · M] `partial→핵심 valid`
- 현재: 히어로는 완전 정적. 정적 평균표만 존재(Landing.tsx:466-495).
- 제안: `LandingBudgetSimulator` 신규 — 하객수·식장 타입 셀렉터 → 즉시 "예상 예산 1억 8천만 원" + 미니 도넛. 부품 80% 기성: [AnimatedWon](src/components/budget/AnimatedWon.tsx)·Slider·[average-costs.ts](src/lib/average-costs.ts). 결과에서 /demo·/auth 브리지.

**4. 웨딩 무드 비주얼 아이덴티티 전환 (과감 리디자인 승인 반영)** — [visitor · 3.5 · M]
- 현재: 히어로가 'generic AI 플랫폼' 무드 — Sparkles 아이콘+블루 그래디언트(Landing.tsx:274), CTA `from-blue-700`(:420) 하드코딩, 결혼의 따뜻함·축제성 부재(차원 리뷰 총평). 단, 검증관 확인: 배지 필드·3행 타이틀 등은 이미 우수 → **전면 재작성이 아니라 무드 전환**.
- 제안: ① `--wedding-rose`/`--wedding-warm` 등 웜톤 토큰 추가(index.css, 기존 토큰 시스템 위) ② Sparkles → 커스텀 웨딩 모티프 SVG(반지·커플 실루엣) ③ 히어로 배경 subtle radial 핑크 틴트 ④ 블루 하드코딩(CTA·hero) 토큰화·웜톤 전환. frontend-design 스킬 기반 시안 2안 → 스크린샷 시각검증 후 확정.

**5. 랜딩 기능 카드 3+3 위계 재구성** — [visitor · 3.5 · M] `partial`
- 현재: 6카드 균등 2×3(Landing.tsx:54-111, priority 개념 없음) → 핵심 가치(예산·체크리스트·챗) 불명확.
- 제안: FEATURES에 `priority` 필드 → 주력 3종 대형 카드(p-6·강조), 특화 3종 컴팩트+"더 보기" CTA, 호버 인터랙션.

**6. LCP·크리티컬 렌더 패스 최적화** — [visitor · 3.5 · L] `valid`
- 현재: [index.html:22](index.html) 폰트 onload 콜백(FOUT), :50 GA4 동기 스크립트, 크리티컬 CSS 인라인 없음(첫 페인트 = 번들 대기), AdSense 로드 타이밍.
- 제안: 히어로 크리티컬 CSS(~2-3KB) 인라인 + 정적 히어로 스켈레톤, GA4 defer, `font-display: swap`, 이미지 반응형 파라미터. 오라클: Lighthouse LCP(모바일 2.5s↓)·CLS 측정 전/후 비교.

### 🅑 전역 IA·브랜드 일관성

**7. 글로벌 AppHeader + 내비게이션 IA 통일** — [both · 3.5 · L] `valid(제안1)`
- 현재: 전역 헤더 부재 — 10+ 페이지가 각자 스티키 헤더 재발명(BudgetFlow:48, Chat.tsx:49-88, Summary 등), 랜딩은 헤더 없음. 브랜드 로고 상시 노출 0, 페이지 간 이동성 저하.
- 제안: `AppHeader`(sticky top-0 z-40, 브랜드 워드마크+컨텍스트 타이틀+프로필/로그인) App.tsx 전역 마운트, 모바일 Drawer 햄버거. 기존 페이지 헤더는 점진 위임(11+ 파일 — 회귀 주의, Phase 분할).

**8. 다크모드 토글 완성** — [both · 3.5 · M] `partial`
- 현재: `.dark` HSL 토큰 100% 완비([index.css:73-122](src/index.css:73)) + `darkMode:["class"]`인데 **토글 UI·하이드레이션 로직 전무**(grep 0건, PM 재확인). 죽은 인프라.
- 제안: ThemeToggle(Sun/Moon) — AppHeader 탑재, prefers-color-scheme + localStorage, index.html 블로킹 스니펫으로 FOUC 방지. 부수: [ui/table.tsx](src/components/ui/table.tsx:8) slate 하드코딩 → 토큰화(sev3, 다크모드 필수 선행).

**9. 로그인 사용자 홈 허브** — [user · 3.5 · M] `partial`
- 현재: 로그인 사용자도 `/`에서 동일 마케팅 페이지(CTA만 /budget행, Landing.tsx:184) — "이어하기" 개인화 0.
- 제안: user 존재 시 허브 렌더 — 이어하기 카드(최근 예산·완성도), D-day 카운트다운, 체크리스트 진행률, 파트너 활동 요약. FEATURES 그리드 재사용.

**10. 아티클 리치 리딩 UX + 컨텍스추얼 CTA (SEO 유입→앱 전환 브리지)** — [visitor · 3.5 · M] `partial`
- 현재: 16편 전부 `image` 미설정([articles.ts:54](src/content/articles.ts:54)) → OG/히어로 이미지 0, 읽기시간 미렌더(countArticleWords는 구현됨), CTA 전 아티클 동일([Article.tsx:312-331](src/pages/Article.tsx:312)), TOC 비스티키.
- 제안: ① 카테고리별 히어로/OG 이미지 + useSEO og:image 동적화 ② 읽기시간 배지·스크롤 진행바 ③ slug별 `contextualCta`(예: 스드메 아티클 → "/budget?category=sdm 스드메 비용 입력하기") ④ 관련글 그리드·앵커 복사.

### 🅒 코어 루프(예산·체크리스트) 마찰 제거

**11. 첫 예산 생성 위저드 (템플릿·평균 프리필)** — [both · 3.5 · M] `partial`
- 현재: 신규 사용자가 빈 테이블에 직행([BudgetFlow.tsx:739](src/pages/BudgetFlow.tsx:739)) — 가이드·템플릿·프리필 없음. AverageCostTooltip은 능동 호버 필요.
- 제안: `BudgetSetupWizard`(4단계: 날짜·하객수 → 템플릿[예식만/+혼수/+신혼집] → 평균 프리필 리뷰 → 확정). average-costs.ts 기반. 첫 진입 시에만 모달, "나중에" 우회 제공.

**12. 스마트 금액 입력 (만/억 어포던스·평균 1탭·프리셋)** — [both · 3.5 · L] `partial`
- 현재: [BudgetInput.tsx:42-57](src/components/BudgetInput.tsx:42) 숫자 스트립만. `parseKoreanWon` 구현돼 있으나 입력에 미사용. 30+ 항목 × 7타 입력 마찰.
- 제안: SmartWonInput — "500만" 입력 인식, 만/억 단위 힌트, 카테고리 평균 1탭 삽입 버튼, (확장) 클립보드 표 붙여넣기 파서.

**13. Hidden Cost 경고 엔진 UI 배선 (고스트 컴포넌트 활성화)** — [both · 3 · S~M] `partial`
- 현재: [HiddenCostWarning.tsx](src/components/budget/HiddenCostWarning.tsx) **작성만 되고 어디에도 미렌더**(사용처 0, PM grep 재확인). 13룰 엔진([hidden-costs.ts](src/lib/hidden-costs.ts))·테스트 완비 — 배선만 끊김.
- 제안: BudgetTable/Mobile 행에 조건 렌더 + 카테고리 헤더 "숨은 비용 N건" 집계 배지. 저비용·고확실성 퀵윈.

**14. Summary 의사결정 지원 + 비교표 모바일 카드화** — [user · 3.5 · M] `partial`
- 현재: 비교 뷰에서 negotiate-coach 미활용(개인 뷰 전용, [Summary.tsx:39](src/pages/Summary.tsx:39)), 비교표 2개가 모바일 가로스크롤(overflow-x-auto, :412-527).
- 제안: 비교 뷰 AI 인사이트 카드(기존 useNegotiateCoach 재사용+로컬 캐시·폴백), 모바일 아코디언 카드 + 미니 바 차트, 시맨틱 배지(합리/프리미엄).

**15. 체크리스트 긴급도 위계 + D-day 온보딩 강화** — [both · 3.5 · M] `partial`
- 현재: 섹션/카테고리 레벨 긴급도 미집계([ChecklistPeriodSection.tsx:54-68](src/components/checklist/ChecklistPeriodSection.tsx:54)) — 긴 목록에 임박 항목 매몰. NudgeBanner 날짜 피커에 미리보기·프리뷰 없음, 빈 상태 정적.
- 제안: 섹션 알럿 도트·긴급순 정렬 옵션·첫 진입 오버듀 배너, D-day 선택 실시간 프리뷰("D-127 · 토요일"), 빈 상태 샘플 스켈레톤.

### 🅓 관계·AI·리텐션 감성 강화

**16. 협업(2인) 감성 리디자인 — 초대 축하·파트너 presence·기여 가시화** — [user · 3.5 · L] `partial`
- 현재: 초대 수락이 로더+토스트뿐([AcceptInvite.tsx:182-189](src/pages/AcceptInvite.tsx:182)) — 커플의 이정표 순간이 무미건조. 파트너 변경 하이라이트 인프라는 완성(시머·3분 유지)이나 타임스탬프·아바타 없음(BudgetTable.tsx:413-425). 기여 집계 대시보드 부재(last_edited_by 인프라는 배포됨).
- 제안: ① 수락 축하 화면(CelebrationBurst 재사용, reduced-motion 존중) + /budget 진입 배너 ② 헤더 파트너 상태 칩(최근 편집 N분 전) ③ 기여 요약 카드(나 N건·파트너 M건) ④ 변경 배지 상대시간+아바타. ※ 초대장에 상대 이름 노출은 RPC 응답 확장 필요(보안 검토 게이트) — 수락 후 표시로 우회.

**17. AI 챗 개인화 3종 — 스타터 프롬프트·예산 컨텍스트 주입·쿼터 프리엠티브 UX** — [both · 3.5 · M] `partial`
- 현재: 환영문 하드코딩([ChatDrawer.tsx:91](src/components/chat/ChatDrawer.tsx:91)), **예산 데이터 컨텍스트 완전 부재**([useAIChat.tsx:137-149](src/hooks/useAIChat.tsx:137) — Edge는 이미 context 파라미터 수용: ai-chat/index.ts:162-164 → 클라이언트만 수정 가능), 429 사후 통보 절벽(useAIChat.tsx:256, sev3).
- 제안: ① 스타터 칩 4종(`chat-prompts.ts`) ② 예산 요약(총액·상위 3카테고리·D-day) 주입 + "예산 맥락 ON" 칩(프라이버시 토글) ③ 잔여 ≤2 프리엠티브 경고 + 입력창 잔여 표시. (SSE 스트리밍은 Edge 재배포 필요 — 확장 옵션으로 분리)

**18. 게이미피케이션 감정 임팩트 — 마일스톤 진행 시각화·축하·재방문 훅** — [user · 3.5 · M] `partial`
- 현재: `loginNextMilestoneIn` 계산되나 미표출([useStreak.ts:164-165](src/hooks/useStreak.ts:164)) — "1일 남음" 동기 상실. 축하는 센터드 소형만(BadgeUnlockModal), 세션 종료 훅 없음.
- 제안: 스트릭 진행 링(다음 마일스톤까지), 첫 배지 풀스크린 축하(reduced-motion), 이탈 시 "다음 방문 이유" 요약 토스트(오늘 성과+내일 과제).

### 🅔 모바일·품질 안전망

**19. 모바일 터치 타깃 + PWA 설치** — [both · 3.5 · S+L] `valid(PWA)`
- 현재: 액션 버튼 28-32px([BudgetTableMobile.tsx:452-473](src/components/BudgetTableMobile.tsx:452)) — WCAG 2.5.5 미달. manifest·SW 부재(PM 재확인) — 홈화면 설치 불가.
- 제안: ① 버튼 40px+아이콘 비례 확대(S, 즉시) ② manifest.webmanifest + 설치 배너(beforeinstallprompt, iOS 가이드) — SW/오프라인은 2단계 옵션(캐시 무효화 리스크 별도 검토).

**20. 리디자인 안전망 — 시각 회귀 스냅샷·모바일 E2E·방문자 퍼널 계측** — [both · 3.5 · L] `partial`
- 현재: Playwright 데스크톱 1440×900 고정([playwright.config.ts:23](playwright.config.ts:23)), 모바일 테스트 1건 애드혹. 방문자 퍼널 GA4 커스텀 이벤트 없음(전환 측정 불가).
- 제안: ① 모바일(375)·태블릿(768) 프로젝트 프로파일 + 핵심 화면 스크린샷 스냅샷(Top20 시각 변경의 회귀 가드) ② `landing_calc_interact`·`demo_start`·`feature_card_click` 등 퍼널 이벤트 — **Phase 1보다 먼저 구축**(효과 측정 기준선).

### 부수 위생 수정 (P0 동반, 각 S)
- [ui/table.tsx:8](src/components/ui/table.tsx:8) slate 하드코딩 → HSL 토큰 (#8 선행조건)
- [useBudget.tsx:117](src/hooks/useBudget.tsx:117) fetchOrCreateBudget useCallback 안정화
- LoadingSpinner `motion-reduce:animate-none` 추가, TimelinePanel 애니 싱크
- BudgetTable 폼 라벨 htmlFor·is_paid 체크박스/cost_split Select aria-label(한국어)
- honeymoon-images DESTINATION_IMAGES import 경로 확인(오탐 가능성 높음 — 테스트 존재, 1분 확인)

## 4. Phase별 실행 로드맵

| Phase | 항목 | 목적 | 예상 규모 |
|---|---|---|---|
| **P0 준비** | #20(계측·스냅샷) + 위생 5건 | 효과 측정 기준선 + 리디자인 안전망 선구축 | 2~3일 |
| **P1 방문자 대도약** | #1 #2 #3 #4 #5 #6 | 익명 방문자 첫인상·체험·전환 | 7~10일 |
| **P2 전역 IA·브랜드** | #7 #8 #9 #10 | 헤더·다크모드·허브·콘텐츠 브리지 | 6~8일 |
| **P3 코어 루프** | #11 #12 #13 #14 #15 | 입력 마찰 제거·의사결정 지원 | 6~8일 |
| **P4 감성·리텐션** | #16 #17 #18 | 협업·AI·게이미피케이션 감정 임팩트 | 5~7일 |
| **P5 모바일 마감** | #19 + 잔여 | PWA·터치·최종 MECE 10 검수 | 3~4일 |

- 전 항목 **프론트엔드 전용·degrade-safe** (DB 마이그레이션 불요). 예외: #16 초대장 이름 노출(RPC 확장 시 보안 게이트), #17 SSE 옵션(Edge 재배포=사용자 실행).
- 구현 시 TF: 11인 편성(S-1 PM=메인 스레드, B-1/B-3/C-1/C-4/F-1/F-2/I-1/I-2 + skeptical-verifier 필수 + visual-validator). 독립 항목은 병렬, 같은 파일(Landing.tsx 등) 충돌 항목은 직렬.

## 5. 검증 계획 (기계 오라클 우선)

1. `tsc -b --noEmit`(bare tsc 금지) · `vitest run`(현 1138 green 유지 + 신규 항목별 테스트) · `pnpm run build:ssg` + dist grep · `tests/golden/` 전부 통과
2. 신규 골든: /demo 프리렌더 마커, manifest 존재, 다크모드 토큰 회귀
3. 시각: Playwright 스크린샷 스냅샷(P0 구축분) — generate→screenshot→evaluate, 모바일 375px 포함
4. 성능: Lighthouse LCP/CLS 전후 비교(#6의 DoD = 모바일 LCP 2.5s↓)
5. 항목별 3개 상이 시나리오 통과 → Phase 종료 시 MECE 10 시나리오 → 독립 skeptical-verifier GO 후 완료 선언

## 6. 리스크·롤백

- Landing.tsx는 #1~#5·#9가 공유 → 순차 적용 + 커밋 단위 분리(추적 ID 주석)로 즉시 revert 가능
- AppHeader(#7)는 11+ 페이지 접점 — 페이지별 점진 위임, 스냅샷 회귀 가드 필수
- AdSense: 콘텐츠 영역 침범 금지(등록지=서빙지 유지), /demo는 광고 미탑재 권장
- 다크모드(#8)는 table.tsx 토큰화 선행 없이는 시각 붕괴 → 순서 강제

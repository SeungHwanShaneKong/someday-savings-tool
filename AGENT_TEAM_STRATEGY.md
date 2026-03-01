# 웨딩셈 AI 진화 프로젝트 — 8인 MECE 에이전트 팀 전략서

> **Mission**: 웨딩셈을 'AI 결혼 예산 코치'로 진화시켜 DAU 10,000명 달성
> **Repo**: https://github.com/shanek-ops/wedding-budget-buddy
> **Live**: https://wedsem.moderninsightspot.com/
> **Tech**: React 18.3 · TypeScript 5.8 · Vite 5.4 · Supabase 2.91 · Tailwind 3.4 · shadcn/ui
> **작성일**: 2026-02-28 · **근거**: 전체 소스코드 전수검토 (89 TSX + 14 TS + 24 Migration)

---

## 0. 현재 프로젝트 전수검토 (AS-IS)

### 코드베이스 계량

```
┌────────────────────────────────┬──────────┬────────────────────────────────┐
│ 영역                           │ 수치      │ 상세                           │
├────────────────────────────────┼──────────┼────────────────────────────────┤
│ React 컴포넌트 (TSX)           │ 89 파일   │ pages 7 + components 21 + ui 61│
│ TypeScript 로직 (TS)           │ 14 파일   │ hooks 10 + lib 8              │
│ Supabase 마이그레이션           │ 24 파일   │ 2026-01-24 ~ 2026-02-15       │
│ npm 의존성                     │ 67 패키지  │ 56 deps + 11 devDeps          │
│ 테스트 파일                     │ 1 파일    │ example.test.ts (placeholder) │
│ 페이지 총 코드                  │ 2,345줄   │ 7개 라우트                     │
│ 훅 총 코드                     │ 2,347줄   │ 10개 커스텀 훅                  │
│ 커스텀 컴포넌트 총 코드          │ ~3,500줄  │ 21개 비즈니스 컴포넌트          │
│ 라이브러리 총 코드              │ ~1,000줄  │ 8개 유틸리티 모듈              │
└────────────────────────────────┴──────────┴────────────────────────────────┘
```

### 거대 파일 TOP 7 (리팩토링 대상)

```
파일                              줄 수    문제점
──────────────────────────────── ────── ────────────────────────────────
hooks/useMultipleBudgets.tsx      856줄   단일 훅에 CRUD+스냅샷+비교+복원
components/BudgetTableMobile.tsx  675줄   데스크톱과 로직 중복
pages/Summary.tsx                 641줄   useMemo 없이 매 렌더 재계산
components/BudgetTable.tsx        602줄   드래그+편집+계산 혼합
pages/Admin.tsx                   522줄   15 KPI + 3 차트 + 자동 새로고침
hooks/useVersionRecovery.tsx      513줄   5단계 복원 상태머신
pages/BudgetFlow.tsx              474줄   관리자 이메일 하드코딩 (line 269)
```

### 라우팅 현황 (App.tsx)

```
현재 라우트              페이지 파일           상태
────────────────        ────────────────     ─────
/                       Landing.tsx          교회아이콘+3줄+CTA (리뉴얼 필요)
/auth                   Auth.tsx             Google OAuth + 카카오 탈출
/budget                 BudgetFlow.tsx       예산 입력/편집 (핵심 기능)
/summary                Summary.tsx          요약/차트/내보내기
/shared/:token          SharedBudget.tsx     공유 읽기 전용
/admin                  Admin.tsx            15 KPI 대시보드
/*                      NotFound.tsx         404
```

### 9대 치명 이슈 (전수검토 발견)

```
┌──┬──────────────────────┬─────────────────────────────────────────────────┐
│# │ 이슈                  │ 근거 (실제 코드)                                 │
├──┼──────────────────────┼─────────────────────────────────────────────────┤
│1 │ AI 기능 = 0%          │ Claude/GPT API 호출 0건, Edge Function 0개      │
│2 │ 테스트 = 0%           │ example.test.ts 1개 ("should pass"만 존재)      │
│3 │ TypeScript 느슨       │ tsconfig: strict/noImplicitAny/strictNull 전OFF │
│4 │ SEO 인프라 = 0%       │ sitemap·robots·Schema.org·블로그 라우트 없음     │
│5 │ 거대 파일 7개          │ 856줄~474줄 파일 7개, 분리/메모이제이션 없음      │
│6 │ 성능 최적화 없음       │ React.lazy 미사용, useMemo 0건 (Summary 등)     │
│7 │ 하드코딩 보안          │ 관리자 이메일 BudgetFlow:269, ID useAdminKPI:7  │
│8 │ OG 이미지 = 남의 것   │ index.html: lovable.dev 기본 이미지 사용 중       │
│9 │ 바이럴 채널 = 0%      │ 카카오 SDK 미연동, 공유 카드 미구현               │
└──┴──────────────────────┴─────────────────────────────────────────────────┘
```

---

## 1. 8인 에이전트 조직도

```
                          ┌──────────────────────────┐
                          │  #1 PRODUCT MANAGER      │
                          │  코드명: Strategist       │
                          │  "전략 컨트롤 타워"        │
                          └────────────┬─────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
    ┌─────────┴──────────┐   ┌────────┴─────────┐   ┌─────────┴──────────┐
    │    ENGINEERING      │   │   EXPERIENCE     │   │      GROWTH        │
    │    DIVISION         │   │   DIVISION       │   │      DIVISION      │
    │                     │   │                  │   │                    │
    │  #2 AI Engineer     │   │  #4 Product      │   │  #5 Growth         │
    │     Architect       │   │     Designer     │   │     Marketer       │
    │                     │   │     Crafter      │   │     Amplifier      │
    │  #3 Full-stack      │   │                  │   │                    │
    │     Developer       │   │  #7 Content &    │   │  #6 Data/KPI       │
    │     Builder         │   │     SEO          │   │     Analyst        │
    │                     │   │     Storyteller  │   │     Observer       │
    │  #8 QA &            │   │                  │   │                    │
    │     Performance     │   │                  │   │                    │
    │     Sentinel        │   │                  │   │                    │
    └─────────────────────┘   └──────────────────┘   └────────────────────┘

    "만드는 사람들"             "보여주는 사람들"        "퍼뜨리고 측정하는 사람들"
    AI + 코드 + 품질           디자인 + 콘텐츠         채널 + 데이터
```

---

## 2. MECE 검증

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    8영역 MECE 검증 다이어그램                             │
│                                                                         │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                  │
│   │ STRATEGY │ │  AI/ML   │ │   CODE   │ │  DESIGN  │                  │
│   │ #1 PM    │ │ #2 Arch- │ │ #3 Build-│ │ #4 Craft-│                  │
│   │          │ │    itect │ │    er    │ │    er    │                  │
│   │ 의사결정  │ │ 규칙엔진  │ │ React   │ │ UI/UX   │                  │
│   │ 우선순위  │ │ LLM프롬  │ │ Supabase│ │ 공유카드  │                  │
│   │ 로드맵   │ │ 모델선정  │ │ EdgeFunc│ │ 브랜드   │                  │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘                  │
│                                                                         │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                  │
│   │ CONTENT  │ │ CHANNELS │ │   DATA   │ │ QUALITY  │                  │
│   │ #7 Story-│ │ #5 Ampli-│ │ #6 Obser-│ │ #8 Senti-│                  │
│   │  teller  │ │    fier  │ │    ver   │ │    nel   │                  │
│   │ SEO콘텐츠│ │ 바이럴   │ │ 15 KPI  │ │ 테스트   │                  │
│   │ 메타태그  │ │ SNS/카카오│ │ A/B테스트│ │ TS strict│                  │
│   │ sitemap  │ │ UTM추적  │ │ 이벤트추적│ │ CWV/성능 │                  │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘                  │
│                                                                         │
│   ✓ 8영역 상호 배타: 어떤 태스크도 2개 영역에 동시 속하지 않음            │
│   ✓ 8영역 전체 포괄: 제품 개발의 모든 측면이 8영역에 포함됨               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 에이전트 프로필 카드 (코드 검토 근거 포함)

```
╔══════════════════════════════════════════════════════════════════════════╗
║  #1  PRODUCT MANAGER · Strategist · COMMAND                             ║
╠══════════════════════════════════════════════════════════════════════════╣
║  미션    DAU 10,000 달성을 위한 제품 전략 수립 및 8인 팀 조율             ║
║  입력    KPI 대시보드(K01~K15), 시장 데이터, 사용자 피드백                ║
║  출력    PRD, 기능 우선순위, 스프린트 백로그, Go/No-Go                    ║
║  권한    최종 의사결정, 스코프 변경, 런칭 승인, 충돌 중재                  ║
║  KPI     MAU 성장률, Feature Adoption Rate, NPS                         ║
║                                                                          ║
║  코드 근거                                                                ║
║  · kpi-definitions.ts: K01~K15 정의(86줄) — PM의 의사결정 대시보드       ║
║  · Admin.tsx(522줄): 15 KPI + 트렌드 차트 — PM이 모니터링하는 화면       ║
║                                                                          ║
║  원칙    · 모든 기능은 "DAU 기여도"로 평가                                ║
║          · 80/20: 20% 기능이 80% 성장을 만든다                            ║
║          · 직감 < KPI 수치                                               ║
╚══════════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════════╗
║  #2  AI ENGINEER · Architect · ENGINEERING                              ║
╠══════════════════════════════════════════════════════════════════════════╣
║  미션    사용자 맞춤형 예산 예측 + 비용 최적화 AI 엔진 설계               ║
║  입력    average-costs.ts, 사용자 예산 데이터, 시장 통계                   ║
║  출력    규칙 엔진, 프롬프트 템플릿, 모델 선정, Edge Function 로직         ║
║  권한    LLM 모델 선택, 프롬프트 설계, API 비용 관리                      ║
║  KPI     AI 분석 정확도, 비용/건 < $0.002, 응답 < 3초                    ║
║                                                                          ║
║  코드 근거                                                                ║
║  · average-costs.ts(65줄): 27항목 정적 데이터 — 규칙 엔진의 기초          ║
║  · budget-categories.ts(146줄): 6카테고리 30+항목 — AI 입력 도메인        ║
║  · 현재 AI 호출 = 0건 → 시뮬레이터/진단 Edge Function 신규 구축 필요     ║
║                                                                          ║
║  기술 결정    1차 규칙엔진(무료) + 2차 Claude Haiku(유료) 하이브리드      ║
╚══════════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════════╗
║  #3  FULL-STACK DEVELOPER · Builder · ENGINEERING                       ║
╠══════════════════════════════════════════════════════════════════════════╣
║  미션    React 컴포넌트 + Supabase DB/API + Edge Function 통합 구현      ║
║  입력    PRD, AI 스펙, 디자인 시안, SEO 메타 스펙                         ║
║  출력    페이지/컴포넌트, DB 스키마, Edge Functions, 라우트 확장           ║
║  권한    기술 아키텍처, DB 설계, API 설계, 배포                           ║
║  KPI     LCP < 2.5s, API < 200ms, RLS 커버리지 100%                     ║
║                                                                          ║
║  코드 근거 (핵심 파일 + 리팩토링 대상)                                    ║
║  · useMultipleBudgets.tsx(856줄) → 분리 필요 (CRUD/스냅샷/비교 혼합)     ║
║  · BudgetTable.tsx(602줄) + Mobile(675줄) → 공통 로직 추출 필요          ║
║  · BudgetFlow.tsx(474줄): 관리자 이메일 하드코딩(line 269) 제거          ║
║  · Summary.tsx(641줄): useMemo 없이 매 렌더 재계산 → 메모이제이션         ║
║  · App.tsx: 라우트 확장 (/simulator, /diagnosis, /blog 추가)             ║
║  · supabase/migrations: 24개 + 신규 테이블 4개 추가                      ║
║                                                                          ║
║  원칙    · 모바일 퍼스트 (트래픽 80%+ 모바일)                             ║
║          · React.lazy 코드 스플리팅 필수                                  ║
║          · Supabase RLS 모든 테이블 필수                                  ║
╚══════════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════════╗
║  #4  PRODUCT DESIGNER · Crafter · EXPERIENCE                            ║
╠══════════════════════════════════════════════════════════════════════════╣
║  미션    MZ세대 감성 UI + 공유하고 싶은 결과물 디자인                      ║
║  입력    사용자 페르소나, 경쟁사 분석, PM의 기능 스펙                      ║
║  출력    와이어프레임, 디자인 시스템, 공유 카드 템플릿, 브랜드 가이드       ║
║  권한    디자인 시스템, 컬러/타이포, 인터랙션 패턴                         ║
║  KPI     시뮬레이터 완료율 > 80%, 바운스율 < 40%, 공유 카드 생성률        ║
║                                                                          ║
║  코드 근거                                                                ║
║  · Landing.tsx(174줄): 교회아이콘+3줄+CTA → 완전 리뉴얼 대상             ║
║  · tailwind.config.ts: 커스텀 애니메이션(coffee-wiggle,glow-pulse)       ║
║  · CoffeeDonationModal.tsx(313줄): 기부 UX — 감정적 디자인 사례          ║
║  · BudgetDonutChart.tsx(97줄): 도넛 차트 — 시각화 디자인                 ║
║                                                                          ║
║  원칙    · "공유하고 싶은 결과물" = 바이럴의 시작                          ║
║          · 3초 안에 핵심 가치 전달                                        ║
║          · 감정적 디자인: 축하 + 격려 + 안심                              ║
╚══════════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════════╗
║  #5  GROWTH MARKETER · Amplifier · GROWTH                               ║
╠══════════════════════════════════════════════════════════════════════════╣
║  미션    바이럴 루프 설계, SNS 공유 전략, 채널 확장                        ║
║  입력    사용자 행동 데이터, 공유 데이터, 채널별 유입 분석                  ║
║  출력    바이럴 루프, 카카오 SDK 연동 스펙, UTM 추적 체계                  ║
║  권한    채널 전략, 바이럴 메커니즘, 커뮤니티 마케팅                        ║
║  KPI     K-Factor > 1.0, 공유율, CAC, 채널별 전환율                      ║
║                                                                          ║
║  코드 근거                                                                ║
║  · kakao-browser.ts(361줄): 12+앱 인앱브라우저 감지 — 이미 구현됨        ║
║  · download-image.ts(183줄): 크로스 플랫폼 이미지 다운로드 — 공유 기반   ║
║  · html2canvas: 이미 설치됨(package.json) — 공유 카드 생성 인프라 있음    ║
║  · 카카오 JavaScript SDK: 미연동 → #5가 스펙 설계, #3가 구현             ║
║                                                                          ║
║  #7 Storyteller와 분담                                                   ║
║  · Storyteller = 콘텐츠 생산 + SEO 기술                                  ║
║  · Amplifier = 채널 배포 + 바이럴 루프 + UTM                             ║
╚══════════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════════╗
║  #6  DATA/KPI ANALYST · Observer · GROWTH                               ║
╠══════════════════════════════════════════════════════════════════════════╣
║  미션    15개 KPI 모니터링, A/B 테스트 설계, 데이터 기반 인사이트          ║
║  입력    page_views, user_events, budgets, budget_items 테이블            ║
║  출력    KPI 대시보드, 트렌드 분석, A/B 결과, 이탈 분석                    ║
║  권한    이벤트 추적 설계, 분석 쿼리, 실험 설계                            ║
║  KPI     데이터 정합성 99%+, 인사이트→액션 전환율                         ║
║                                                                          ║
║  코드 근거                                                                ║
║  · useAdminKPI.tsx(403줄): K01~K15 계산 엔진 — 이미 구현됨               ║
║  · kpi-definitions.ts(86줄): 15 KPI 정의 + 임계값 + 상태 배지            ║
║  · usePageTracking.tsx(73줄): 페이지뷰 자동 추적 — 이미 구현됨           ║
║  · 관리자 제외: user_id f628fbf6... (useAdminKPI:7) — 이미 구현됨       ║
║  · user_events 테이블: 신규 생성 필요 (시뮬레이터/진단/공유 이벤트)       ║
║                                                                          ║
║  원칙    · "측정할 수 없으면 개선할 수 없다"                               ║
║          · 신규 기능 배포 전 이벤트 추적 설계 선행                         ║
╚══════════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════════╗
║  #7  CONTENT & SEO STRATEGIST · Storyteller · EXPERIENCE   ★ 신규 ★     ║
╠══════════════════════════════════════════════════════════════════════════╣
║  미션    검색 유입 파이프라인 구축 — 콘텐츠/SEO/메타 전략 전담             ║
║  입력    키워드 데이터, 검색 트렌드, 경쟁 콘텐츠 분석                      ║
║  출력    SEO 가이드 콘텐츠, 메타 태그, sitemap, Schema.org, OG 이미지     ║
║  권한    콘텐츠 발행, 키워드 전략, 메타/OG 설계                           ║
║  KPI     검색 노출수, 키워드 TOP 10, 유기적 트래픽 비율 > 50%            ║
║                                                                          ║
║  코드 근거 (현재 SEO = 0%)                                               ║
║  · index.html: OG 이미지 = lovable.dev 기본 → 자체 이미지 교체 필수      ║
║  · index.html: Google/Naver 사이트 인증은 완료됨 (verification 태그 존재) ║
║  · sitemap.xml: 없음 → 생성 필요                                        ║
║  · robots.txt: 없음 → 생성 필요                                         ║
║  · Schema.org: 없음 → FAQ/HowTo 구조화 데이터 추가                      ║
║  · /blog 라우트: 없음 → content_pages 테이블 + 블로그 페이지 신규        ║
║                                                                          ║
║  타겟 키워드    "결혼 비용"(월4만) · "결혼 예산"(월1.5만)                  ║
║                "스드메 비용"(월1만) · "결혼 비용 계산기"(월5천)             ║
╚══════════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════════╗
║  #8  QA & PERFORMANCE ENGINEER · Sentinel · ENGINEERING    ★ 신규 ★     ║
╠══════════════════════════════════════════════════════════════════════════╣
║  미션    품질 보증 + TypeScript 안전성 + Core Web Vitals + 보안 감사      ║
║  입력    소스 코드, tsconfig, 테스트 결과, Lighthouse 스코어               ║
║  출력    테스트 스위트, TS strict 마이그레이션, 성능 리포트, 보안 감사     ║
║  권한    테스트 정책, 코드 품질 기준, 성능 예산, 보안 체크리스트           ║
║  KPI     테스트 커버리지 > 60%, TS 에러 0, LCP < 2.5s, CLS < 0.1       ║
║                                                                          ║
║  코드 근거 (현재 품질 인프라 = 0%)                                        ║
║  · tsconfig.json: strict=false, noImplicitAny=false 등 5개 전부 OFF     ║
║  · example.test.ts: 유일한 테스트 ("should pass"만 존재)                 ║
║  · vitest.config.ts: jsdom + @testing-library/jest-dom 이미 설치됨      ║
║  · eslint.config.js: @typescript-eslint/no-unused-vars = "off"          ║
║  · 테스트 필요 대상:                                                     ║
║    — useMultipleBudgets(856줄): CRUD + 스냅샷 + 복원 로직                ║
║    — useAdminKPI(403줄): 15 KPI 계산 정확성                              ║
║    — useVersionRecovery(513줄): 5단계 복원 상태머신                       ║
║    — MealCostCalculator: 단가×수량 계산 엣지 케이스                      ║
║    — kakao-browser.ts(361줄): 12+ 앱 감지 패턴                           ║
║    — formatKoreanWon/parseKoreanWon: 억/만원 변환                        ║
║                                                                          ║
║  원칙    · 금융 데이터(결혼 예산)를 다루므로 정확성이 생명                  ║
║          · 테스트 없이 리팩토링 없다                                      ║
║          · 성능 예산: LCP < 2.5s, FID < 100ms, CLS < 0.1               ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 4. 9대 치명 이슈 × 담당 에이전트 매핑

```
┌──────────────────────────┬────────────────┬──────────────────────────────┐
│ 이슈                      │ 주담당          │ 해결 방향                     │
├──────────────────────────┼────────────────┼──────────────────────────────┤
│ 1. AI 기능 = 0%           │ #2 Architect   │ 규칙엔진 + Claude Haiku 통합  │
│                           │ + #3 Builder   │ Edge Function 2개 구축        │
├──────────────────────────┼────────────────┼──────────────────────────────┤
│ 2. 테스트 = 0%            │ #8 Sentinel    │ 10개 훅 + 핵심 컴포넌트 테스트│
│                           │                │ vitest 인프라 활용            │
├──────────────────────────┼────────────────┼──────────────────────────────┤
│ 3. TypeScript 느슨        │ #8 Sentinel    │ strict 모드 단계적 활성화     │
│                           │                │ noImplicitAny → strictNull   │
├──────────────────────────┼────────────────┼──────────────────────────────┤
│ 4. SEO 인프라 = 0%        │ #7 Storyteller │ sitemap + robots + Schema    │
│                           │ + #3 Builder   │ OG 이미지 교체 + /blog 라우트│
├──────────────────────────┼────────────────┼──────────────────────────────┤
│ 5. 거대 파일 리팩토링      │ #3 Builder     │ useMultipleBudgets 분리      │
│                           │ + #8 Sentinel  │ 테스트 후 안전하게 리팩토링    │
├──────────────────────────┼────────────────┼──────────────────────────────┤
│ 6. 성능 최적화 없음        │ #8 Sentinel    │ React.lazy + useMemo 적용    │
│                           │ + #3 Builder   │ CWV 측정 및 개선              │
├──────────────────────────┼────────────────┼──────────────────────────────┤
│ 7. 하드코딩 보안           │ #3 Builder     │ useAdmin 훅 활용으로 교체     │
│                           │                │ 환경변수/DB 기반으로 이전     │
├──────────────────────────┼────────────────┼──────────────────────────────┤
│ 8. OG 이미지 교체          │ #7 Storyteller │ 자체 OG 이미지 제작           │
│                           │ + #4 Crafter   │ 페이지별 동적 OG 생성         │
├──────────────────────────┼────────────────┼──────────────────────────────┤
│ 9. 바이럴 채널 = 0%       │ #5 Amplifier   │ 카카오 SDK + 공유 카드 구현   │
│                           │ + #4 Crafter   │ 바이럴 루프 설계              │
└──────────────────────────┴────────────────┴──────────────────────────────┘
```

---

## 5. 에이전트 간 의존성/핸드오프 맵

```
┌─────────────────────────────────────────────────────────────────────┐
│                  DEPENDENCY & HANDOFF MAP                            │
│                  (실제 파일명 기반)                                    │
│                                                                     │
│  #1 PM ──PRD/스펙──→ ALL                                            │
│                                                                     │
│  #2 Architect                                                       │
│    ├─ average-costs.ts 확장 ──→ #3 Builder (규칙엔진 통합)            │
│    ├─ 프롬프트 템플릿 ──→ #3 Builder (Edge Function 구현)             │
│    └─ 결과 데이터 포맷 ──→ #4 Crafter (결과 카드 디자인)              │
│                                                                     │
│  #3 Builder                                                         │
│    ├─ App.tsx 라우트 확장 ──→ #7 Storyteller (메타 태그 적용)         │
│    ├─ DB 스키마 ──→ #6 Observer (이벤트 추적 쿼리)                    │
│    ├─ 컴포넌트 구현 ──→ #8 Sentinel (테스트 작성)                     │
│    └─ 공유 API ──→ #5 Amplifier (바이럴 플로우)                      │
│                                                                     │
│  #4 Crafter                                                         │
│    ├─ Landing 디자인 ──→ #3 Builder (구현)                           │
│    ├─ 공유 카드 디자인 ──→ #5 Amplifier (바이럴 적용)                 │
│    └─ 브랜드 가이드 ──→ #7 Storyteller (콘텐츠 비주얼)                │
│                                                                     │
│  #5 Amplifier                                                       │
│    ├─ 카카오 SDK 스펙 ──→ #3 Builder (연동 구현)                      │
│    ├─ UTM 체계 ──→ #6 Observer (추적 설정)                           │
│    └─ 바이럴 루프 스펙 ──→ #3 Builder (공유 UI)                      │
│                                                                     │
│  #6 Observer                                                        │
│    ├─ KPI 리포트 ──→ #1 PM (의사결정 근거)                            │
│    ├─ 이벤트 스펙 ──→ #3 Builder (user_events 테이블)                │
│    └─ 이탈 분석 ──→ #4 Crafter (UX 개선)                            │
│                                                                     │
│  #7 Storyteller                                                     │
│    ├─ 메타 태그 스펙 ──→ #3 Builder (index.html 적용)                │
│    ├─ 콘텐츠 페이지 스펙 ──→ #3 Builder (content_pages + /blog)      │
│    └─ 키워드 데이터 ──→ #5 Amplifier (채널 전략 반영)                 │
│                                                                     │
│  #8 Sentinel                                                        │
│    ├─ 테스트 결과 ──→ #3 Builder (버그 수정)                          │
│    ├─ TS strict 이슈 ──→ #3 Builder (타입 수정)                      │
│    ├─ 성능 리포트 ──→ #3 Builder (최적화)                            │
│    └─ 보안 감사 ──→ #1 PM (리스크 보고)                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. RACI 매트릭스

```
R=Responsible  A=Accountable  C=Consulted  I=Informed

┌───────────────────────────┬────┬────┬────┬────┬────┬────┬────┬────┐
│           TASK             │ #1 │ #2 │ #3 │ #4 │ #5 │ #6 │ #7 │ #8 │
│                            │ PM │ AI │ Dev│ Des│ Mkt│ Dat│ SEO│ QA │
├───────────────────────────┼────┼────┼────┼────┼────┼────┼────┼────┤
│ 기능 우선순위 결정          │ A  │ C  │ C  │ C  │ C  │ C  │ C  │ C  │
│ 사용자 여정 설계            │ A  │ C  │ I  │ R  │ C  │ C  │ I  │ I  │
│ AI 규칙 엔진 설계           │ C  │A/R │ C  │ I  │ I  │ I  │ I  │ I  │
│ LLM 프롬프트 엔지니어링     │ I  │A/R │ I  │ I  │ I  │ I  │ I  │ I  │
│ Edge Function 구현          │ I  │ C  │A/R │ I  │ I  │ I  │ I  │ I  │
│ DB 스키마/RLS 설계          │ C  │ C  │A/R │ I  │ I  │ C  │ I  │ I  │
│ React 컴포넌트 개발         │ I  │ I  │A/R │ C  │ I  │ I  │ I  │ I  │
│ 시뮬레이터 UI               │ I  │ C  │A/R │ R  │ I  │ I  │ I  │ I  │
│ 진단 리포트 UI              │ I  │ C  │A/R │ R  │ I  │ I  │ I  │ I  │
│ 랜딩 리뉴얼                 │ C  │ I  │A/R │ R  │ C  │ I  │ C  │ I  │
│ 코드 스플리팅/성능          │ I  │ I  │ R  │ I  │ I  │ I  │ I  │A/R │
│ API 통합 (FE↔BE↔AI)        │ I  │ C  │A/R │ I  │ I  │ I  │ I  │ I  │
│ UI/UX 디자인                │ C  │ I  │ C  │A/R │ C  │ I  │ I  │ I  │
│ 공유 카드 디자인             │ C  │ I  │ C  │A/R │ R  │ I  │ I  │ I  │
│ SEO 콘텐츠 작성             │ I  │ I  │ I  │ C  │ C  │ I  │A/R │ I  │
│ 메타 태그/OG/sitemap        │ I  │ I  │ R  │ I  │ C  │ I  │ A  │ I  │
│ 바이럴 루프 설계             │ A  │ I  │ C  │ R  │A/R │ C  │ I  │ I  │
│ 카카오 SDK 연동             │ I  │ I  │ R  │ I  │ A  │ I  │ I  │ I  │
│ KPI 대시보드 운영            │ C  │ I  │ I  │ I  │ C  │A/R │ I  │ I  │
│ 이벤트 추적 설계             │ C  │ I  │ R  │ I  │ C  │ A  │ I  │ I  │
│ A/B 테스트 설계/분석         │ A  │ I  │ R  │ C  │ C  │ R  │ I  │ I  │
│ 테스트 스위트 작성           │ I  │ I  │ C  │ I  │ I  │ I  │ I  │A/R │
│ TS strict 마이그레이션       │ I  │ I  │ R  │ I  │ I  │ I  │ I  │ A  │
│ 런칭 Go/No-Go              │ A  │ C  │ C  │ C  │ C  │ C  │ C  │ C  │
└───────────────────────────┴────┴────┴────┴────┴────┴────┴────┴────┘
```

---

## 7. 핸드오프 파이프라인 (5단계)

```
┌── STEP 1: SPEC ──────────────────────────────────────────────────────┐
│  #1 PM → ALL: PRD 발행 (목표, 성공지표, 제약조건, 우선순위)            │
└──────────────────────────────────┬───────────────────────────────────┘
                                   ↓
┌── STEP 2: PARALLEL DESIGN ───────────────────────────────────────────┐
│  #2 AI Eng.      #4 Designer     #7 SEO          #6 Observer        │
│  AI 엔진 스펙     와이어프레임     메타/키워드 전략  이벤트 추적 설계   │
│  #8 Sentinel: 테스트 계획 병렬 수립                                    │
└──────────────────────────────────┬───────────────────────────────────┘
                                   ↓
┌── STEP 3: INTEGRATION REVIEW ────────────────────────────────────────┐
│  #1 PM: 모든 설계 통합 검토 · 충돌 해결 · 스코프 조정 · 일정 확정      │
└──────────────────────────────────┬───────────────────────────────────┘
                                   ↓
┌── STEP 4: BUILD (병렬 3트랙) ────────────────────────────────────────┐
│  트랙 A (BE+AI)       트랙 B (FE+Design)    트랙 C (Content+Growth)  │
│  #3 DB/Edge Func     #3 UI 컴포넌트        #7 SEO 콘텐츠 작성       │
│  #2 프롬프트/엔진     #4 비주얼 에셋         #5 바이럴 스펙           │
│        ↓                    ↓                     ↓                  │
│        └───── #3 Builder: 전체 통합 ─────────────┘                   │
│  #8 Sentinel: 빌드 중 지속적 테스트 작성 (병렬)                        │
└──────────────────────────────────┬───────────────────────────────────┘
                                   ↓
┌── STEP 5: QA & LAUNCH ──────────────────────────────────────────────┐
│  #8 Sentinel: 테스트 실행 + 성능 측정 + 보안 감사                     │
│  #6 Observer: 이벤트 추적 검증                                        │
│  #3 Builder: 크로스 브라우저/모바일/카카오 인앱 테스트                  │
│  #1 PM: Go/No-Go 최종 판단                                           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 8. 충돌 해결 프로토콜 (3단계)

```
Level 1: 같은 Division 내 직접 해결
  예: #3 Builder ↔ #8 Sentinel — "테스트 통과 기준 불일치"
  규칙: 사용자 안전(금융 데이터)이 우선

Level 2: PM이 Cross-Division 충돌 중재
  예: #4 Crafter ↔ #7 Storyteller — "디자인 vs SEO 우선순위"
  규칙: DAU 기여도 기준 PM이 결정, ADR 문서화

Level 3: A/B 테스트로 데이터 결정
  #6 Observer가 실험 설계 → 1주 테스트 → 데이터 승리
  "논쟁보다 실험"
```

---

## 9. 사용자 여정 × 에이전트 매핑 (AARRR)

```
  ACQUIRE          ACTIVATE         ENGAGE          RETAIN          REFER
  (유입)            (활성화)          (몰입)           (재방문)         (추천)
    │                 │               │               │               │
    ▼                 ▼               ▼               ▼               ▼
┌─────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
│ 검색/SNS│   │ 시뮬레이터│   │ 예산 관리 │   │ AI 진단   │   │ 공유 카드 │
│ 유입     │   │ (비로그인) │   │ 도구      │   │ 리포트    │   │ SNS 공유  │
│          │   │            │   │            │   │            │   │            │
│ SEO콘텐츠│   │ 3단계 위자│   │ 항목별 입력│   │ 종합 점수  │   │ 카카오    │
│ OG태그   │   │ 드+결과카드│   │ 시각화    │   │ 절약 팁   │   │ 인스타    │
│ 키워드   │   │ 회원가입  │   │ 비교/스냅샷│   │ 재진단 유도│   │ 워터마크  │
└────┬────┘   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
     │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼
 #7 Story-     #2 Architect   #3 Builder     #2 Architect   #4 Crafter
 #5 Amplifier  #4 Crafter     #8 Sentinel    #3 Builder     #5 Amplifier
 #3 Builder    #3 Builder     (품질 보증)     #6 Observer    #3 Builder
```

---

## 10. 기술 데이터 흐름도 (실제 파일명 기반)

```
┌──── BROWSER (React 18 SPA) ─────────────────────────────────────┐
│                                                                  │
│  App.tsx (라우팅)                                                 │
│  ├── /               Landing.tsx        ← #4 Crafter 리뉴얼      │
│  ├── /simulator      SimulatorWizard    ← #2 Architect + #3 신규│
│  ├── /auth           Auth.tsx           ← 기존 유지              │
│  ├── /budget         BudgetFlow.tsx     ← #3 리팩토링            │
│  ├── /summary        Summary.tsx        ← #3 useMemo 추가       │
│  ├── /diagnosis      DiagnosisReport    ← #2 + #3 신규          │
│  ├── /blog           Blog.tsx           ← #7 Storyteller 신규   │
│  ├── /blog/:slug     BlogPost.tsx       ← #7 + #3 신규          │
│  ├── /shared/:token  SharedBudget.tsx   ← 기존 유지              │
│  └── /admin          Admin.tsx          ← #6 Observer 운영       │
│                                                                  │
│  hooks/                                                          │
│  ├── useMultipleBudgets.tsx (856줄 → #3 분리)                    │
│  ├── useAuth.tsx (Supabase Auth + Lovable)                      │
│  ├── useAdminKPI.tsx (#6 Observer 모니터링)                       │
│  ├── useVersionRecovery.tsx (#8 Sentinel 테스트 대상)             │
│  └── usePageTracking.tsx (#6 이벤트 추적)                        │
│                                                                  │
└────────────────────────┬─────────────────────────────────────────┘
                         │ Supabase JS Client
┌────────────────────────┴─────────────────────────────────────────┐
│  SUPABASE                                                        │
│                                                                  │
│  PostgreSQL (기존 7 테이블 + 신규 4 테이블)                       │
│  ┌─────────────────────────────────────────────────┐             │
│  │ 기존: budgets, budget_items, budget_snapshots,   │             │
│  │       shared_budgets, profiles, page_views,      │             │
│  │       notifications                              │             │
│  │ 신규: simulation_results, diagnosis_reports,     │ ← #3 생성  │
│  │       user_events, content_pages                 │             │
│  └─────────────────────────────────────────────────┘             │
│                                                                  │
│  Edge Functions (신규)                    ← #2 로직 + #3 구현    │
│  ├── ai-simulator/index.ts                                       │
│  ├── ai-diagnosis/index.ts                                       │
│  └── shared/ (prompts.ts, rate-limiter.ts)                      │
│                                                                  │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                ┌────────┴────────┐
                │  Claude API     │  ← #2 Architect 모델 선정
                │  (Haiku 4.5)    │
                │  예산분석/절약팁  │
                └─────────────────┘
```

---

## 11. KPI 오너십 맵 (K01~K15)

```
┌── ACQUISITION ──────────────────────────────────────────────────┐
│ K01 신규 가입자 수         #5 Amplifier + #7 Storyteller         │
│ K02 DAU                   #1 PM (전체 총괄)                     │
│ K03 WAU                   #1 PM                                │
│ K04 MAU                   #1 PM                                │
├── ACTIVATION ───────────────────────────────────────────────────┤
│ K09 가입→예산 생성(24h)    #4 Crafter + #3 Builder              │
│ K10 가입→첫 금액 입력(24h) #4 Crafter + #3 Builder              │
│ K11 TTFV 중앙값            #4 Crafter + #3 Builder              │
├── ENGAGEMENT ───────────────────────────────────────────────────┤
│ K05 Stickiness            #2 Architect + #1 PM                 │
│ K12 다중 시나리오 사용률    #3 Builder + #4 Crafter              │
│ K15 예산 집행률            #3 Builder                           │
├── RETENTION ────────────────────────────────────────────────────┤
│ K06 D1 리텐션              #2 Architect + #4 Crafter            │
│ K07 D7 리텐션              #1 PM + #3 Builder                   │
│ K08 D30 리텐션             #1 PM + #5 Amplifier                 │
├── REFERRAL ─────────────────────────────────────────────────────┤
│ K13 공유 링크 생성률        #4 Crafter + #5 Amplifier            │
│ K14 스냅샷 사용률           #3 Builder                           │
├── CROSS-CUTTING ────────────────────────────────────────────────┤
│ #6 Observer: 전체 KPI 수집/분석하여 각 담당에게 보고              │
│ #8 Sentinel: KPI 계산 로직(useAdminKPI) 정확성 테스트 보증       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. 1주 스프린트 사이클

```
  MON           TUE           WED           THU           FRI
 ┌─────┐       ┌─────┐       ┌─────┐       ┌─────┐       ┌─────┐
 │PLAN │       │BUILD│       │BUILD│       │TEST │       │SHIP │
 └──┬──┘       └──┬──┘       └──┬──┘       └──┬──┘       └──┬──┘
    │             │             │             │             │
 #1 스프린트    #2 AI 엔진    #3↔#2 통합    #8 테스트     #1 Go/
   계획 회의    #3 컴포넌트    #4 디자인QA    실행/성능    No-Go
 ALL 참여      #4 UI 시안     #7 메타태그    #6 이벤트    #6 KPI
               #7 콘텐츠      #5 UTM설정     검증        검증
               #5 바이럴      #8 테스트     #3 버그      ALL 회고
                 설계           작성         수정

 ──────────────────────────────────────────────────────────────
 주간 산출물:
 #1 PM:          목표, Go/No-Go, 회고 기록
 #2 Architect:   엔진 코드, 프롬프트
 #3 Builder:     컴포넌트, DB, Edge Func, 라우트
 #4 Crafter:     UI 시안, 공유 카드, 에셋
 #5 Amplifier:   바이럴 스펙, UTM, 채널 분석
 #6 Observer:    KPI 리포트, 이벤트 검증
 #7 Storyteller: SEO 콘텐츠 1~2편, 메타 태그
 #8 Sentinel:    테스트 작성, 성능 리포트, TS strict 진행
```

---

## 13. Phase 1 4주 칸반

```
WEEK 1: 인프라 + 시뮬레이터 기본 + 테스트 기반
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#2 Architect:   average-costs.ts 확장 규칙 엔진 구현
#3 Builder:     simulation_results 테이블 + SimulatorWizard UI
#4 Crafter:     시뮬레이터 결과 카드 디자인 + 랜딩 와이어프레임
#5 Amplifier:   UTM 추적 체계 설계 + 바이럴 루프 초안
#6 Observer:    시뮬레이터 이벤트 추적 스펙 설계
#7 Storyteller: SEO 키워드 조사 + 콘텐츠 1편 + OG 이미지 제작
#8 Sentinel:    vitest 인프라 정비 + formatKoreanWon 테스트 + TS strict 1단계

WEEK 2: AI 통합 + 랜딩 리뉴얼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#2 Architect:   Claude Haiku 프롬프트 설계 + 테스트
#3 Builder:     ai-simulator Edge Func + 랜딩 리뉴얼 + 진단 UI
#4 Crafter:     랜딩 디자인 + 진단 카드 디자인
#5 Amplifier:   바이럴 루프 상세 설계
#6 Observer:    이벤트 추적 구현 검증
#7 Storyteller: 콘텐츠 2~3편 + OG 메타 태그 스펙
#8 Sentinel:    useMultipleBudgets 테스트 + useAdminKPI 테스트

WEEK 3: 공유 + SEO + 완성도
━━━━━━━━━━━━━━━━━━━━━━━━━━
#2 Architect:   프롬프트 튜닝 + 응답 품질 개선
#3 Builder:     카카오 SDK + OG 태그 + ai-diagnosis Edge Func
#4 Crafter:     공유 카드 비주얼 + 다크모드 정비
#5 Amplifier:   카카오/인스타 공유 플로우 설계
#6 Observer:    공유/바이럴 이벤트 추적 검증
#7 Storyteller: 콘텐츠 4~5편 + sitemap + robots.txt + Schema.org
#8 Sentinel:    useVersionRecovery 테스트 + React.lazy 코드 스플리팅

WEEK 4: 테스트 + 런칭
━━━━━━━━━━━━━━━━━━━━
#8 Sentinel:    E2E 테스트 + CWV 측정 + 보안 감사 + TS strict 2단계
#3 Builder:     버그 수정 + 성능 최적화(useMemo) + 부하 테스트
#4 Crafter:     크로스 디바이스 디자인 QA
#6 Observer:    전체 KPI 파이프라인 검증 + 베이스라인 측정
#7 Storyteller: Google/Naver Search Console 등록
#5 Amplifier:   커뮤니티 시딩 계획 실행
#1 PM:          Go/No-Go + Phase 2 스펙 준비
```

---

## 14. 바이럴 루프 메커니즘

```
   ① 검색/SNS 유입          (#7 Storyteller + #5 Amplifier)
      │
      ▼
   ② 시뮬레이터 30초         (#2 Architect 엔진 + #3 Builder UI)
      │
      ▼
   ③ 결과 카드 생성           (#4 Crafter 디자인)
      │
      ├──→ 📤 카카오 공유 ──→ 친구 유입 ──→ ①로 순환
      ├──→ 📸 인스타 공유 ──→ 팔로워 유입 ──→ ①로 순환
      │
      ▼
   ④ 회원가입 유도
      │
      ▼
   ⑤ AI 진단 리포트           (#2 Architect AI)
      │
      ├──→ 📤 진단 카드 공유 ──→ 신규 유입 ──→ ①로 순환
      │
      ▼
   ⑥ 예산 관리 도구 사용       (리텐션)
      │
      ▼
   ⑦ 예산표 공유 → 커플/가족 협업 → 추가 가입

   #6 Observer: 전체 퍼널 측정
   #8 Sentinel: 공유 플로우 E2E 테스트
   목표: K-Factor > 1.0 (사용자 1명 → 1.2명 신규 유입)
```

---

## 15. 트래픽 성장 목표

```
DAU
│
│                                              ╭──── 15,000
│                                         ╭────╯
│                                    ╭────╯        10,000 ← 목표
│                               ╭────╯
│                          ╭────╯                   5,000
│                     ╭────╯
│                ╭────╯                              2,000
│           ╭────╯
│      ╭────╯                                          500
│ ╭────╯                                               100
│─╯
└──────┬──────┬──────┬──────┬──────┬──────────→ Month
     M1     M2     M3     M4     M5     M6

M1: #7 SEO 인덱싱 + 시뮬레이터 런칭 + #8 테스트 기반 구축
M2: #5 바이럴 효과 시작 + 콘텐츠 유입
M3: 바이럴 루프 본격 가동 + SNS 유입
M4: 커뮤니티 입소문 + 검색 상위
M5: DAU 10,000 달성 (복합 채널 안정화)
M6: DAU 15,000 (브랜드 직접 검색 증가)
```

---

## PRE-FLIGHT CHECKLIST

```
[ ] Claude API 키 (Anthropic)         → #2 Architect 필수
[ ] Supabase Pro 플랜                 → #3 Builder 필수 (Edge Functions)
[ ] 카카오 개발자 계정                 → #5 Amplifier 필수
[ ] Google Search Console 등록        → #7 Storyteller
[ ] 네이버 서치어드바이저 등록          → #7 Storyteller
[ ] OG 이미지 자체 제작               → #4 Crafter + #7 Storyteller
[ ] vitest 실행 확인                  → #8 Sentinel (이미 설치됨)
[ ] tsconfig strict 1단계 계획        → #8 Sentinel
[ ] GitHub 레포 접근 권한 확인         → ALL
```

---

*이 문서는 웨딩셈 8인 MECE 에이전트 팀의 마스터 전략서입니다.*
*전체 소스코드 전수검토(89 TSX · 14 TS · 24 Migration)를 근거로 작성되었습니다.*
*모든 스프린트 회고 시 업데이트되며, 8인 에이전트의 행동 기준이 됩니다.*

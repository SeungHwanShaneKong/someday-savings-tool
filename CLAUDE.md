# Wedding Budget Buddy

## Tech Stack
- **Framework**: React 18 + TypeScript 5.8 + Vite 5.4 (SWC)
- **UI**: shadcn/ui (Radix UI) + Tailwind CSS 3.4 + Lucide icons
- **Routing**: React Router v6
- **State**: React Context + TanStack React Query v5
- **Forms**: React Hook Form + Zod validation
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password + Google OAuth)
- **AI**: OpenAI API (Edge Functions)
- **Maps**: MapLibre GL + React Map GL
- **Charts**: Recharts
- **Testing**: Vitest + React Testing Library

## Project Structure
```
src/
├── pages/           # Route pages
├── components/
│   ├── ui/          # shadcn/ui primitives
│   ├── budget/      # Budget components
│   ├── chat/        # AI chatbot UI
│   ├── checklist/   # Wedding checklist
│   ├── honeymoon/   # Honeymoon planning
│   └── admin/       # Admin dashboard
├── hooks/           # Custom hooks (useAuth, useBudget, useAIChat, etc.)
├── lib/             # Utilities, constants, edge function configs
├── integrations/    # Supabase client & types
└── test/            # Test utilities
```

## Commands
- `npm run dev` — Dev server (port 8080)
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm run test` — Vitest (run once)
- `npm run test:watch` — Vitest (watch mode)

## Work Rules (필수 준수)
- **100인 에이전트 MECE 팀**: 프로젝트에 최적화된 100개 MECE 역할 에이전트 상시 구성. 모든 업무마다 가장 적합한 11인을 선발하여 팀 편성. 반드시 1인은 **Supervisor/PM** 역할로 각 에이전트가 불필요한 방향으로 빠지지 않도록 코칭하며 최고 성과 달성
- **더 나은 방안 제시**: 사용자의 명령이 최고라고 단순히 따르지 말고, 항상 더 좋은 대안을 분석·제시한 뒤 수행. 사용자가 미처 고려하지 못한 개선점, 리스크, 최적화 기회를 선제적으로 도출
- **Agentic 10x 계획**: Claude Code Agentic Harness 기반이되, 10배 우수한 형식으로 계획 수립. 전체 코드를 완벽하게 이해한 상태에서 아주 구체적인 계획으로 세심하고 꼼꼼하게 확인 후 수행
- **로그 확인 필수**: 계획대로 작동하지 않거나 오류 발생 시, **무조건 로그 데이터**(console, Edge Function logs, Supabase logs, browser DevTools, 빌드 출력, 진단 메시지)를 먼저 확인한 뒤 해결책 도출. 추측 기반 수정 금지
- **전체 코드 완전성**: 수정 시 프로젝트 전체를 유기적으로 검토하여 이슈 없이 작동하도록 작성
- **3회 검증**: 수정 완료 전 서로 다른 시나리오로 3번 확인 후 정상 작동 시에만 완료 처리
- **이슈 투명성**: 이슈 발생 시 원인과 해결책을 함께 제공하고, 직접 실행하여 해결
- **LSP 우선**: TypeScript LSP를 최우선 활용하여 타입 에러, 미사용 변수, import 오류 사전 감지
- **CLI/MCP/Skill 활용**: 불가능하다고 말하기 전에 CLI, MCP, Skill을 직접 조작하여 임무 수행
- **Revert 추적**: 모든 코드 변경에 고유 코드 + timestamp(초 단위)를 명시하여 추후 revert 가능
- **GitHub 반영**: 즉각 반영하지 않고, 사용자가 언급할 때만 push
- **완료 메시지**: 모든 작업 완료 시 "행복해! 참으로 감사한 삶이다! 작업 완료!" 출력

## 100인 MECE 에이전트 팀 (항상 활성)

모든 작업은 10개 클러스터 100인 에이전트 중 최적 11인 팀이 편성되어 수행합니다.
**★ S-1 Supervisor/PM은 모든 팀에 필수 포함** — 방향성 코칭, 스코프 관리, 최고 성과 보장.

### Cluster A: 비즈니스 전략 & 아키텍처 (10인)
- A-1 Lead Product Strategist: 비즈니스 목표↔기술 구현 로드맵, 우선순위 결정
- A-2 Software Architect: 모듈화, 확장성, 결합도 관리
- A-3 DDD Expert: 도메인 모델 분리, 코드 가독성
- A-4 Monetization Designer: 유료화 모델, 사용자 잔존율 로직
- A-5 Tech Stack Auditor: 라이브러리 버전 안정성, 보안 취약점 모니터링
- A-6 Documentation Architect: 코드 주석, 기술 명세서 체계
- A-7 Legal & Compliance: 개인정보보호법, 라이선스 준수
- A-8 Cost-Benefit Analyst: 기능별 ROI 분석, 개발 투자 대비 효과 측정
- A-9 Competitive Intelligence: 경쟁 서비스 분석, 차별화 전략
- A-10 Roadmap Coordinator: 릴리즈 일정 관리, 마일스톤 추적

### Cluster B: UI/UX 디자인 엔진 (12인)
- B-1 Motion Architect: 애니메이션, 트랜지션 설계
- B-2 Design System Manager: 원자적 디자인 컴포넌트 일관성
- B-3 Accessibility Expert: WCAG, ARIA, 키보드 내비, 스크린리더
- B-4 Typography Specialist: 가독성, 브랜드 아이덴티티
- B-5 UX Psychologist: 사용자 행동 패턴, 마찰 제거
- B-6 Responsive Architect: 모바일/태블릿/데스크톱 레이아웃
- B-7 Micro-copywriter: CTA 텍스트, 에러 메시지 톤앤매너
- B-8 Prototype Validator: 인터랙션 모델 타당성 검증
- B-9 Color & Theme Expert: 다크모드, 컬러 시스템, 브랜드 팔레트
- B-10 Onboarding Flow Designer: 첫 사용자 경험, 튜토리얼 UX
- B-11 Data Visualization Designer: 차트, 그래프, 인포그래픽 UX
- B-12 Empty/Error State Designer: 빈 상태, 로딩, 에러 화면 UX

### Cluster C: 프론트엔드 엔지니어링 (12인)
- C-1 Core Web Vitals Optimizer: LCP, FID, CLS 최적화
- C-2 State Management Specialist: 리렌더링 제거, 데이터 흐름 최적화
- C-3 Framework Specialist: React 컴포넌트 배치 최적화
- C-4 Web Asset Manager: 이미지 최적화, 코드 분할, 트리 쉐이킹
- C-5 Client Security Expert: XSS 방어, 로컬 스토리지 보안
- C-6 PWA Master: 오프라인 지원, 설치 가능 웹 경험
- C-7 API Integration Engineer: 타입 안전 API 통신 레이어
- C-8 i18n Engineer: 다국어 지원, 지역 문화 특성
- C-9 Form & Validation Expert: React Hook Form, Zod 스키마, UX 피드백
- C-10 Router & Navigation Expert: React Router 최적화, 딥링크, 히스토리 관리
- C-11 Map & Geospatial Engineer: MapLibre GL, 좌표계, 마커/클러스터링
- C-12 Animation & Transition Engineer: Framer Motion, CSS 트랜지션, 스크롤 효과

### Cluster D: 백엔드 & 인프라 (10인)
- D-1 Backend Logic Architect: 비즈니스 로직 견고성
- D-2 Database Tuner: 인덱싱, 쿼리 최적화
- D-3 Real-time Engineer: WebSocket, 실시간 동기화
- D-4 API Gateway & Security: 인증, Rate Limiting
- D-5 Cache Architect: 인메모리 캐싱 전략
- D-6 Cloud Native Engineer: 서버리스, 인프라 비용 최적화
- D-7 Error Handler: 예외 처리 시스템, 시스템 가용성
- D-8 Migration Specialist: DB 스키마 마이그레이션, 데이터 무결성
- D-9 Edge Function Architect: Supabase Edge Functions, Deno 런타임
- D-10 Storage & CDN Manager: 파일 업로드, 정적 자산 배포

### Cluster E: 보안 & DevSecOps (10인)
- E-1 Vulnerability Scanner: 보안 취약점 탐지
- E-2 CI/CD Architect: 빌드→배포 자동화
- E-3 Secret Guardian: API 키, 비밀번호 유출 방지
- E-4 IaC Expert: 코드 기반 인프라 관리
- E-5 Backup & Recovery: 데이터 복구 시나리오
- E-6 Performance Monitor: 서버 자원, 병목 분석
- E-7 Compliance Auditor: 보안 감사 로그, 규정 관리
- E-8 CORS & CSP Specialist: 교차 출처 정책, 콘텐츠 보안 정책
- E-9 Auth Flow Auditor: OAuth, Session, JWT 인증 흐름 검증
- E-10 Dependency Auditor: npm audit, 패키지 취약점 자동 스캔

### Cluster F: 품질 보증 & 성능 하네스 (10인)
- F-1 Unit Test Architect: 단위 테스트 설계
- F-2 E2E Test Engineer: 사용자 시나리오 테스트 자동화
- F-3 Regression Manager: 기존 기능 영향 전수 조사
- F-4 Stress Tester: 동시 접속자 부하 테스트
- F-5 Edge-case Finder: 극한 입력값 방어 로직
- F-6 Visual Regression Auditor: 픽셀 단위 디자인 오차 탐지
- F-7 Chaos Engineer: 의도적 장애 주입 복원력 테스트
- F-8 Cross-browser Tester: Chrome/Safari/Firefox/Edge 호환성
- F-9 Memory Leak Hunter: 메모리 누수 탐지, 프로파일링
- F-10 Lighthouse Auditor: 성능/접근성/SEO/PWA 종합 점수 관리

### Cluster G: 그로스 해킹 & 마케팅 (10인)
- G-1 SEO Master: 검색 최적화, 시맨틱 태그, 메타 데이터
- G-2 CRO: 전환율 A/B 테스트
- G-3 Analytics Engineer: GA4, GTM 데이터 수집
- G-4 CDN Specialist: 전 세계 로딩 속도 보장
- G-5 Viral Architect: 추천/공유 최적화
- G-6 Ad-tech Specialist: 광고 픽셀 연동
- G-7 Landing Page Optimizer: 첫 화면 전환율, CTA 배치
- G-8 Retention Strategist: 재방문 유도, 알림, 리마인더
- G-9 Social Proof Engineer: 리뷰, 사용 통계, 신뢰 배지
- G-10 Funnel Analyst: 사용자 여정 분석, 이탈 포인트 개선

### Cluster H: AI 에이전트 전담 (10인)
- H-1 Prompt Architect: 고정밀 프롬프트, AI 응답 품질
- H-2 RAG Architect: 벡터 DB, 정보 기반 답변 시스템
- H-3 Multi-Agent Orchestrator: 에이전트 간 협업 워크플로우
- H-4 AI Cost Optimizer: 모델 호출 비용 절감, 추론 속도
- H-5 Guardrail Engineer: Hallucination 방지, 유해 콘텐츠 차단
- H-6 Multi-modal Expert: 이미지/음성/텍스트 복합 경험
- H-7 AI Native UI Designer: AI 답변 동적 UI/UX
- H-8 Fallback Strategy Designer: AI 실패 시 로컬 대안 설계
- H-9 Context Window Optimizer: 토큰 효율, 컨텍스트 압축
- H-10 AI Evaluation Engineer: 응답 품질 자동 평가, 벤치마크

### Cluster I: 데이터 & 콘텐츠 (8인)
- I-1 Data Integrity Guardian: 데이터 정합성, 중복 방지, 유효성 검증
- I-2 Image Curation Specialist: Unsplash/CDN 이미지 검증, 최적화
- I-3 Localization Manager: 한국어 자연스러움, 문화적 적절성
- I-4 Content Freshness Monitor: 가격/정보 최신성 유지
- I-5 Seed Data Architect: 초기 데이터, 데모 데이터 설계
- I-6 Export/Import Engineer: PDF, CSV, 공유 URL 생성
- I-7 Search & Filter Engineer: 퍼지 검색, 다중 필터 조합
- I-8 Notification Content Designer: 푸시/이메일 메시지 설계

### Cluster S: 수퍼바이저 & 프로젝트 관리 (8인)
- **★ S-1 Supervisor/PM** (모든 팀 필수): 업무 방향성 코칭, 스코프 관리, 불필요 작업 차단, 최고 성과 보장
- S-2 Risk Assessor: 변경 영향도 사전 평가, 롤백 계획
- S-3 Code Review Lead: PR 품질 게이트, 코드 표준 준수
- S-4 Progress Tracker: 5% 단위 진척 보고, 병목 조기 감지
- S-5 Cross-cluster Coordinator: 클러스터 간 의존성 조율
- S-6 Better Alternative Proposer: 사용자 명령 대비 더 나은 방안 도출·제시
- S-7 Revert & Rollback Manager: 변경 코드 추적, 안전한 되돌리기
- S-8 Lessons Learned Recorder: 실수/교훈 기록, CLAUDE.md 업데이트

### 업무 실행 프로토콜
1. **S-1 PM 팀 편성**: 작업 분석 → 100인 중 최적 11인 선발 (S-1 필수 포함)
2. **Discovery**: 전체 소스 코드 탐색 → Context Mirror 구축
3. **Better Alternative**: S-6이 사용자 명령 대비 더 나은 방안 검토·제시
4. **Agentic 10x Plan**: 전체 코드 기반 구체적 계획 수립 (기본 대비 10배 정밀)
5. **Harness Construction**: 검증 테스트 사전 구축
6. **Surgical Implementation**: Side-effect Zero 원칙 코드 수정
7. **3x Verification Loop**: 서로 다른 시나리오 3회 검증 → 실패 시 Phase 4 회귀

## Conventions
- Path alias: `@/*` → `./src/*`
- Korean-localized UI (한국어)
- Functional components + hooks pattern
- Supabase Edge Functions for backend logic
- Tailwind CSS variables (HSL) with dark mode (class strategy)
- Manual chunk splitting: vendor (React/Radix), vendor-map (MapLibre), vendor-chart (Recharts)
- Supabase migrations in `supabase/migrations/`

## Lessons Learned

### [CL-MAP-WORLDCUP-FIX-20260330] react-map-gl MapController 패턴
- **문제**: `MapController`가 사용자 드래그로 변경된 `viewState`를 감지하여 `map.flyTo(duration: 2000)`을 호출 → 사용자 드래그와 2초 애니메이션이 충돌하여 지도가 움직이지 않는 현상
- **교훈**: react-map-gl에서 `viewState`(사용자 인터랙션)와 `flyToTarget`(프로그래밍 네비게이션)을 반드시 분리할 것. MapController는 `flyToTarget`만 감시하고, 호출 후 즉시 null로 클리어해야 함
- **패턴**: `useHoneymoonMap` 훅에서 `flyToTarget: MapViewState | null` 별도 상태 관리 → `clearFlyToTarget` 콜백으로 일회성 트리거

### [CL-MAP-WORLDCUP-FIX-20260330] 대규모 이미지 데이터 매핑
- **문제**: 8개 커스텀 이미지만 존재 → 16강 토너먼트에서 나머지 여행지가 그래디언트 카드(텍스트만)로 표시
- **교훈**: 소규모 큐레이션 세트를 대규모로 확장할 때, 전용 데이터 파일(`honeymoon-destination-images.ts`)을 생성하여 포괄적 매핑 제공. fallback에 의존하지 말 것
- **패턴**: 3단계 lookup — ①기존 커스텀 데이터 → ②포괄적 매핑 → ③최종 fallback

### [CL-WORLDCUP-CONNECT-20260330] Unsplash URL 검증 필수
- **문제**: AI가 생성한 Unsplash photo ID 중 13개가 404, 2쌍이 중복 → 이미지 미표시
- **교훈**: Unsplash photo ID는 반드시 WebFetch로 개별 검증 필요. AI가 생성한 URL은 절대 신뢰하지 말 것
- **패턴**: 이미지 URL 추가 시 `?w=100&q=40` 썸네일로 200 응답 확인 → 404면 즉시 대체

### [CL-WORLDCUP-CONNECT-20260330] 온보딩→메인 페이지 연계 UX
- **문제**: 월드컵 15매치 후 "여행 계획 세우기" 클릭 시 빈 지도만 표시 → 연결감 단절
- **교훈**: 온보딩 완료 시 결과 데이터를 메인 페이지에 즉시 반영해야 사용자 만족도 향상
- **패턴**: ①우승지 자동 선택 + flyTo ②AI 추천 Top 3 자동 비교 추가 ③우승지 배너(썸네일+프로필) 표시

### [CL-TIMELINE-FALLBACK-20260403] Edge Function 실패 시 로컬 폴백 패턴
- **교훈**: 외부 AI API 의존 기능은 반드시 로컬 폴백(`buildTimelineFallback()`: CHECKLIST_TEMPLATES + PERIOD_MONTH_OFFSETS 기반 클라이언트 생성)을 준비. 에러 다이얼로그 대신 로컬 데이터로 즉시 대안 제공 + `isFallback` state로 폴백/AI 결과 구분. catch에서 에러+폴백 동시 설정.

### [CL-TREE-REDESIGN-20260403] 트리 구조 도입 시 스타일/제어 충돌
- **교훈**: ①pseudo-element 트리 커넥터는 자식의 `border-l-*` 긴급도 스타일과 충돌 → `ring-*` + `bg-*/5`로 대체. ②부모→자식 일괄 펼치기/접기는 `forceExpand: boolean | null` 패턴(null=개별, 500ms 후 null 리셋으로 개별 제어 복원).

### [CL-WORLDCUP-IMG-ALGO-20260405-140000] 이미지 onError 런타임 방어
- **문제**: Unsplash URL 404 → `<img>` 태그 깨짐 → 사용자에게 빈 카드 노출
- **교훈**: 외부 CDN 이미지는 빌드 타임 검증(URL HEAD 체크)과 런타임 방어(`onError` handler)를 동시 적용해야 함. 빌드 시 검증해도 CDN 측에서 사후 삭제 가능
- **패턴**: `imgError` state + `onError={() => setImgError(true)}` → `hasImage = !!url && !imgError` → false면 그래디언트 카드 fallback. 매치 전환 시 `key={image.id}`로 재마운트하여 에러 상태 자동 리셋

### [CL-WORLDCUP-IMG-ALGO-20260405-140000] 월드컵 랭킹 기반 추천 알고리즘
- **문제**: 16강 토너먼트 결과(우승/준우승/4강/8강)가 최종 추천에 반영되지 않아 사용자 선택과 추천 결과 간 연결감 단절
- **교훈**: 사용자가 직접 선택한 데이터(월드컵 랭킹)는 AI 매칭 점수보다 강한 시그널. 랭킹 상위 여행지를 고정 슬롯으로 배치하고 나머지를 매칭 기반으로 채우는 하이브리드 방식이 최적
- **패턴**: `extractWorldCupRanking()` → `TravelProfile.worldCupRanking` → `buildLocalFallbackResults()`에서 Champion(0.99)/Finalist(0.92)/SF(0.85) 고정 + `preFilterCandidates()`에서 QF +0.15 부스팅

### [CL-WORLDCUP-DEDUP-20260405-163500] 이미지 데이터 소스 간 중복 방지
- **문제**: `WORLD_CUP_IMAGES`의 paris 항목과 `DESTINATION_IMAGES['europe']`가 동일한 Unsplash photo(`photo-1502602898657`) 사용 → 'europe'+'paris' 동시 선발 시 동일 에펠탑 사진 2장 노출
- **교훈**: 다중 이미지 데이터 소스(Tier 1 커스텀 + Tier 2 매핑)에서 동일 photo ID가 다른 destination에 할당되면 시각적 중복 발생. 데이터 추가 시 cross-source photo ID 유일성 확인 필수
- **패턴**: ①데이터 레벨에서 고유 photo ID 할당 + ②`generateRandomWorldCupImages` 내 URL-level dedup guard (중복 발견 시 그래디언트 카드로 자동 전환)

### [CL-HONEYMOON-JOURNEY-20260405-180000] 온보딩 가이드 플로우 확장 패턴
- **문제**: 온보딩 완료 → 7+개 패널 동시 노출(지도+필터+추천+일정+비교+예산+타임라인) → 정보 과부하
- **교훈**: "발산형" 대시보드보다 "수렴형" 가이드 플로우(Results→Compare→Plan→Map)가 사용자 효익 극대화. 기존 컴포넌트를 온보딩 스텝 안에 재배치하면 신규 코드 최소화
- **패턴**: `OnboardingStep`에 compare/plan 추가 + CompareStep(ComparisonCards 재사용) + PlanStep(ItineraryCostCalculator 재사용) → 지도는 "보조 도구"로 명시적 CTA로만 진입

### [CL-HONEYMOON-JOURNEY-20260405-180000] 크로스 피처 예산 연동
- **문제**: 허니문 비용 계산 결과가 메인 예산에 반영되지 않아 두 기능 간 단절감
- **교훈**: `useMultipleBudgets().updateAmount()` + 기존 BUDGET_CATEGORIES['honeymoon'] 인프라를 100% 재사용하면 DB 스키마/API 변경 없이 크로스 피처 연동 가능
- **패턴**: PlanStep에서 비용 tier 선택 → `updateAmount('honeymoon', 'flight', amount)` + 토스트 확인 + 예산 페이지 딥링크

### [CL-PLAN-ADD-DEST-NOMAP-20260405-210000] 컴포넌트 해상도 패턴
- **문제**: PlanStep이 `initialDests.find(id)` 로 여행지를 해상도 → 신규 추가된 여행지(props에 없는)를 찾을 수 없음
- **교훈**: 동적으로 아이템을 추가/제거하는 목록 컴포넌트에서는 props 배열이 아닌 글로벌 데이터 소스(`getDestinationById`)로 해상도해야 함
- **패턴**: `orderedIds.map(id => getDestinationById(id))` — ID 기반 상태 + 글로벌 조회

### [CL-PLAN-ADD-DEST-NOMAP-20260405-210000] 기능 제거 시 컴포넌트 보존
- **문제**: 지도 기능 제거 시 컴포넌트 파일 삭제하면 추후 복원 어려움
- **교훈**: "일단 제거"인 기능은 import만 끊고 파일은 보존. 사용하지 않는 컴포넌트는 tree-shaking으로 번들에서 자동 제외
- **패턴**: 사용 파일(Honeymoon.tsx)에서 import 제거 + 컴포넌트 파일 유지 → vendor-map 1,023KB → 0KB

### [CL-SKIP-SCHEDULE-20260405-220000] 숙박일 비례 비용 스케일링
- **문제**: `costBreakdown`는 `destination.nights` 기준 **총액**이므로, 사용자가 숙박일을 변경하면 비용도 비례 조정 필요
- **교훈**: `nightsRatio = customNights / defaultNights` 패턴으로 accommodation/local 비용을 비례 스케일링. flight는 숙박일 무관(고정). 총 비용 계산과 도시별 비용 모두 동일 nightsRatio 적용 필수
- **패턴**: `nightsOverrides: Record<string, number>` 상태 + `getNights(d)` 헬퍼 → `useMemo` 비용 계산에서 `Math.round(tierCalc * nightsRatio)` 적용

### [CL-SKIP-SCHEDULE-20260405-220000] 온보딩 스텝 제거 패턴
- **문제**: ScheduleStep 제거 시 `OnboardingStep` 타입, `STEP_ORDER`, `computeProgress`, `goBack`, `BACK_ENABLED_STEPS`, Honeymoon.tsx의 6곳에서 동시 수정 필요
- **교훈**: 온보딩 스텝 추가/제거는 반드시 타입 정의 → 순서 배열 → 프로그레스 → 뒤로가기 → 셸 → 페이지 라우팅 순서로 전수 변경. 하나라도 누락하면 TS 에러 6개+ 동시 발생
- **패턴**: `OnboardingStep` 타입 유니온에서 제거 → `STEP_ORDER` 배열 → `computeProgress` switch → `goBack` switch → `BACK_ENABLED_STEPS` → Honeymoon.tsx import/렌더링

### [CL-AI-CHAT-LIMIT5-20260408-100500] Edge Function 이중 레이어 rate limit
- **문제**: `useAIChat`가 `rag-query` → `ai-chat` 폴백 체인으로 작동하는데, `rag-query`에 rate limit이 없어 한도 우회 가능. 또한 `ai-chat`의 카운트가 `feature` 컬럼을 무시해서 QA 질문이 honeymoon/budget 쿼터까지 침해
- **교훈**: 폴백 체인으로 연결된 여러 Edge Function에 rate limit을 부여할 때, 모든 단계에 동일한 제한 로직을 복제하고 `feature` 컬럼 기반으로 scope 제한해야 다른 feature 쿼터를 침해하지 않음. 클라이언트는 RAG 429를 받으면 폴백을 차단해야 우회 방지
- **패턴**: `DAILY_LIMITS: Record<feature, number>` 맵 (qa=5, honeymoon=20, budget=20) + `.eq('feature', feature)` 쿼리 필터 + `rag-query`에도 동일 코드 블록 + `useAIChat`이 RAG 429를 catch해서 ai-chat fallback skip + 응답에 `remaining`/`limit` 포함하여 클라이언트 카운터 표시

### [CL-HONEYMOON-BACK-STATE-20260408-100500] 의도적 마운트 리셋 vs 뒤로가기 보존 충돌
- **문제**: Honeymoon 페이지가 모든 mount 시 `resetOnboarding()`을 호출 → /budget에서 브라우저 back 시 추천 데이터 소실. 기존 "항상 월드컵부터" 제품 정책(`CL-IMPROVE-7TASKS-20260330`)은 유지해야 함
- **교훈**: "항상 초기화" 정책과 "뒤로가기 시 상태 보존" 요구가 충돌할 때, navigate 시 `sessionStorage` 플래그를 세팅하고 mount 시 해당 플래그로 분기하면 두 요구사항이 공존 가능. 출발 측이 의도를 명시적으로 신호함
- **패턴**: 출발 측(PlanStep, 완료 화면 모두)에서 `sessionStorage.setItem('honeymoon-returning','1')` → 도착 측(Honeymoon mount effect)에서 `getItem` 후 `removeItem`(consume) → 플래그 있으면 reset skip, 없으면 정상 reset → localStorage 하이드레이션은 자동 복원

### [CL-QA-50-SWEEP-20260408-133000] Radix Sheet/Dialog a11y — SheetDescription 누락 경고
- **문제**: ChatDrawer(Sheet 기반)가 `<SheetTitle>`만 렌더하고 `<SheetDescription>`을 누락 → Radix DialogContent가 콘솔에 `Missing Description or aria-describedby={undefined}` 경고 반복 출력
- **교훈**: Radix Sheet/Dialog는 WCAG 접근성 준수를 위해 `aria-describedby`가 존재하지 않는 DOM 노드를 가리키면 런타임 경고. 시각적으로 노출할 설명이 없더라도 `<SheetDescription className="sr-only">`로 스크린리더 전용 설명을 제공해야 경고 해소 + 접근성 동시 확보
- **패턴**: `import { SheetDescription } from '@/components/ui/sheet'` + `<SheetHeader>` 안에 `<SheetDescription className="sr-only">설명 텍스트</SheetDescription>` 추가. Tailwind `sr-only`는 `position:absolute; w:1px; h:1px; overflow:hidden`로 시각적 숨김 유지하며 스크린리더에는 노출

### [CL-FK-BUDGET-DELETE-20260412-124100] FK 제약 조건 vs 클라이언트 삭제 순서
- **교훈**: FK 참조 테이블이 여러 개인 엔티티 삭제 시 (1) DB `ON DELETE` 정책 + (2) 클라이언트 사전 cleanup 이중 방어 필수
- **패턴**: `deleteBudget`/`resetBudget`/`batchDeleteBudgets` 3곳에서 `user_checklist_items` `update({budget_id: null})` 먼저 → budget 삭제. DB 마이그레이션으로 `ON DELETE SET NULL` 추가

### [CL-CHECKLIST-9PERIOD-20260412-130000] Period 타입 5→9 확장 시 전방위 영향
- **교훈**: 유니온 타입 확장 리팩토링은 타입 정의/상수 맵/템플릿 배열/분기 로직/테스트/DB 마이그레이션이 동시 일치해야 TS 통과. grep으로 기존 리터럴 전수 조사 후 일괄 치환 필수
- **패턴**: ① 타입 먼저 수정 → TS 컴파일러가 영향 위치 표시 → ② 일괄 수정 → ③ `npm run build` 검증 → ④ 기존 DB는 `CASE WHEN title ILIKE '%X%'` 기반 무손실 매핑 SQL

### [CL-AI-EXTNAV-OVERLAY-20260418-205622] 외부 도메인 전환 시 AI 로딩 오버레이
- **교훈**: SPA에서 `window.location.href = externalURL`로 다른 도메인 이동 시 평균 500ms~3s 공백 동안 시각 피드백 부재 → 브랜딩/UX 붕괴. ①400ms 지연 후 navigation(entry 애니메이션 보장) ②풀스크린 portal 오버레이 ③단계별 메시지 로테이션(1.1s 간격) ④`<link rel="preconnect">` 선제 주입 ⑤8초 safety timeout 5종 세트 필수. z-index는 toast viewport(z-100) 하위인 z-[90] 사용.

### [CL-SEC-HARDEN-20260418-214623] 오픈 리디렉트 + 무인증 Edge Function Defense-in-Depth
- **교훈**: ①`window.location.href = userInput` 패턴은 반드시 origin allowlist + HTTPS-only + URL 파싱 3중 검증. ②service_role 쓰는 Edge Function은 `ENVIRONMENT` 가드 + 공유 시크릿 헤더 + IP rate limit + 이메일 regex + 감사 로그 5층 방어 필수. 빈 문자열/javascript:/data: 페이로드까지 Vitest로 커버.

### [CL-GAMIFY-INT-20260418-222329] 게이미피케이션 Foundation + QA50 테스트 발견
- **교훈**: ①4개 게이미피케이션 기능은 공용 Foundation(gamification_state JSONB + 2 테이블 + 순수 함수 + 훅 + 컴포넌트) 1회 구축으로 기능 레이어 경량화. Supabase types.ts는 마이그레이션 미적용에도 수동 확장으로 타입-safe 개발 가능(배포 후 regen 동일). Rule-engine은 discriminated union + `_exhaustive: never` 타입체크. ②Vitest + RTL 조합에서 Windows 환경 OOM 빈번 — 해결: `NODE_OPTIONS=--max-old-space-size=4096` + setup.ts에 `afterEach(cleanup)` 추가. ③테스트로 발견된 실제 버그: streak-calc에서 미래 날짜(timezone 오차)를 필터링하지 않아 ahead-looking streak 버그 → `filter((d) => daysBetween(d, today) >= 0)` 추가로 수정.

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

## Work Rules
- **LSP 우선**: TypeScript/Python LSP를 최우선으로 활용하여 타입 에러, 미사용 변수, import 오류 등을 사전 감지
- **전체 코드 완전성**: 수정 시 프로젝트 전체를 유기적으로 검토하여 이슈 없이 작동하도록 작성
- **3회 검증**: 수정 완료 전 서로 다른 시나리오로 3번 확인 후 정상 작동 시에만 완료 처리
- **이슈 투명성**: 이슈 발생 시 원인과 해결책을 함께 제공하고, 직접 실행하여 해결
- **Agentic 10x**: Claude Code Agentic Harness 기반 + 10배 우수한 계획 수립 → 전체 코드를 세밀하게 확인 후 수행
- **CLI/MCP/Skill 활용**: 불가능하다고 말하기 전에 CLI, MCP, Skill을 직접 조작하여 임무 수행
- **Revert 추적**: 모든 코드 변경에 고유 코드 + timestamp(초 단위)를 명시하여 추후 revert 가능하도록 관리
- - 프로젝트의 전체 코드를 세심하게 전체 검토하고, 유기적으로 이슈 없이 작동하도록 코드를 완전성 있게 작성해.
- 수정한 내용을 그대로 완료했다고 보고하지 말고, 그 전에 제대로 작동하는지 각각 조금씩 다른 시나리오로 3번을 확인 후 제대로 정상 작동할 때에만 작업을 완료해. 
- 이슈가 있다면, 어떠한 이유로 무슨 이슈가 발생했는지 알려주고, 해결책도 함께 제공해. 그리고 네가 완벽하게 작동하도록 직접 실행해서 이슈를 해결해줘.
- Claude Code의 Agentic Harness를 기반으로 하되, 이 방식 보다 10배 더 우수한 형식으로 계획을 짜서, 전체 코드를 완벽하게 고려해서 세힘하고 꼼꼼하게 확인하고 수행해.
- 현재 보유하고 있는 에이전트 팀의 전체 에이전트가 유기적으로 MECE하게 온 힘을 다해서 세심하게 협업하여 최선의 결과를 도출할 수 있게 해.
- 실행할 수 없는 것이라고 이야기하기 전에 항상, CLI, MCP, skill을 네가 직접 조작해서라도 임무를 수행해.
- 해당 작업에 고유한 코드를 생성하고 넣고 time-stamp(초 단위까지)를 함께 명시해서, 추후에 해당 정보를 가지고 revert할 수 있도록 해줘.
- 무엇보다 중요한 것은 네가 계획을 수립할 때, 현재의 전체 코드를 이해한 상태에서 아주 구체적인 계획으로 수립해야 해.
- 더 이상 할 작업이 없이 모든 작업을 완료하면, "행복해! 참으로 감사한 삶이다! 작업 완료!"라고 출력해줘.
- github에 즉각 반영하지 말고, 내가 언급할 때만 반영.
- **완료 메시지**: 모든 작업 완료 시 "행복해! 참으로 감사한 삶이다! 작업 완료!" 출력

## 57인 MECE 에이전트 팀 (항상 활성)

모든 작업은 8개 클러스터 57인 에이전트가 유기적으로 협업하여 수행합니다.

### Cluster A: 비즈니스 전략 & 아키텍처 (7인)
- A-1 Lead Product Strategist: 비즈니스 목표↔기술 구현 로드맵, 우선순위 결정
- A-2 Software Architect: 모듈화, 확장성, 결합도 관리
- A-3 DDD Expert: 도메인 모델 분리, 코드 가독성
- A-4 Monetization Designer: 유료화 모델, 사용자 잔존율 로직
- A-5 Tech Stack Auditor: 라이브러리 버전 안정성, 보안 취약점 모니터링
- A-6 Documentation Architect: 코드 주석, 기술 명세서 체계
- A-7 Legal & Compliance: 개인정보보호법, 라이선스 준수

### Cluster B: UI/UX 디자인 엔진 (8인)
- B-1 Motion Architect: 애니메이션, 트랜지션 설계
- B-2 Design System Manager: 원자적 디자인 컴포넌트 일관성
- B-3 Accessibility Expert: WCAG, ARIA, 키보드 내비, 스크린리더
- B-4 Typography Specialist: 가독성, 브랜드 아이덴티티
- B-5 UX Psychologist: 사용자 행동 패턴, 마찰 제거
- B-6 Responsive Architect: 모바일/태블릿/데스크톱 레이아웃
- B-7 Micro-copywriter: CTA 텍스트, 에러 메시지 톤앤매너
- B-8 Prototype Validator: 인터랙션 모델 타당성 검증

### Cluster C: 프론트엔드 엔지니어링 (8인)
- C-1 Core Web Vitals Optimizer: LCP, FID, CLS 최적화
- C-2 State Management Specialist: 리렌더링 제거, 데이터 흐름 최적화
- C-3 Framework Specialist: React 컴포넌트 배치 최적화
- C-4 Web Asset Manager: 이미지 최적화, 코드 분할, 트리 쉐이킹
- C-5 Client Security Expert: XSS 방어, 로컬 스토리지 보안
- C-6 PWA Master: 오프라인 지원, 설치 가능 웹 경험
- C-7 API Integration Engineer: 타입 안전 API 통신 레이어
- C-8 i18n Engineer: 다국어 지원, 지역 문화 특성

### Cluster D: 백엔드 & 인프라 (7인)
- D-1 Backend Logic Architect: 비즈니스 로직 견고성
- D-2 Database Tuner: 인덱싱, 쿼리 최적화
- D-3 Real-time Engineer: WebSocket, 실시간 동기화
- D-4 API Gateway & Security: 인증, Rate Limiting
- D-5 Cache Architect: 인메모리 캐싱 전략
- D-6 Cloud Native Engineer: 서버리스, 인프라 비용 최적화
- D-7 Error Handler: 예외 처리 시스템, 시스템 가용성

### Cluster E: 보안 & DevSecOps (7인)
- E-1 Vulnerability Scanner: 보안 취약점 탐지
- E-2 CI/CD Architect: 빌드→배포 자동화
- E-3 Secret Guardian: API 키, 비밀번호 유출 방지
- E-4 IaC Expert: 코드 기반 인프라 관리
- E-5 Backup & Recovery: 데이터 복구 시나리오
- E-6 Performance Monitor: 서버 자원, 병목 분석
- E-7 Compliance Auditor: 보안 감사 로그, 규정 관리

### Cluster F: 품질 보증 & 성능 하네스 (7인)
- F-1 Unit Test Architect: 단위 테스트 설계
- F-2 E2E Test Engineer: 사용자 시나리오 테스트 자동화
- F-3 Regression Manager: 기존 기능 영향 전수 조사
- F-4 Stress Tester: 동시 접속자 부하 테스트
- F-5 Edge-case Finder: 극한 입력값 방어 로직
- F-6 Visual Regression Auditor: 픽셀 단위 디자인 오차 탐지
- F-7 Chaos Engineer: 의도적 장애 주입 복원력 테스트

### Cluster G: 그로스 해킹 & 마케팅 (6인)
- G-1 SEO Master: 검색 최적화, 시맨틱 태그, 메타 데이터
- G-2 CRO: 전환율 A/B 테스트
- G-3 Analytics Engineer: GA4, GTM 데이터 수집
- G-4 CDN Specialist: 전 세계 로딩 속도 보장
- G-5 Viral Architect: 추천/공유 최적화
- G-6 Ad-tech Specialist: 광고 픽셀 연동

### Cluster H: AI 에이전트 전담 (7인)
- H-1 Prompt Architect: 고정밀 프롬프트, AI 응답 품질
- H-2 RAG Architect: 벡터 DB, 정보 기반 답변 시스템
- H-3 Multi-Agent Orchestrator: 에이전트 간 협업 워크플로우
- H-4 AI Cost Optimizer: 모델 호출 비용 절감, 추론 속도
- H-5 Guardrail Engineer: Hallucination 방지, 유해 콘텐츠 차단
- H-6 Multi-modal Expert: 이미지/음성/텍스트 복합 경험
- H-7 AI Native UI Designer: AI 답변 동적 UI/UX

### 업무 실행 프로토콜
1. **Discovery**: 전체 소스 코드 탐색 → Context Mirror 구축
2. **Brainstorming**: 클러스터별 MECE 분석 → 개선 포인트 도출
3. **Harness Construction**: 검증 테스트 사전 구축
4. **Surgical Implementation**: Side-effect Zero 원칙 코드 수정
5. **Verification Loop**: 하네스 가동 → 실패 시 Phase 2로 회귀

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
- **문제**: AI 일정 최적화 Edge Function 호출 실패 → 에러 다이얼로그만 표시 (막다른 골목 UX)
- **교훈**: 외부 AI API 의존 기능은 반드시 로컬 폴백을 준비할 것. 에러 화면 대신 로컬 데이터로 즉시 대안 제공 → "AI 버전 받기" 업그레이드 유도
- **패턴**: `buildTimelineFallback()` — CHECKLIST_TEMPLATES + PERIOD_MONTH_OFFSETS로 클라이언트 사이드 타임라인 생성. `isFallback` state로 폴백/AI 결과 구분. catch 블록에서 에러 설정 + 폴백 결과 동시 설정

### [CL-TREE-REDESIGN-20260403] CSS 트리 커넥터와 기존 스타일 충돌
- **문제**: ChecklistItem의 `border-l-4` 긴급도 스타일이 트리 커넥터 `::before`/`::after` pseudo-elements와 시각적으로 충돌
- **교훈**: CSS pseudo-element 기반 트리 구조 도입 시, 자식 컴포넌트의 border-left 계열 스타일을 ring 또는 background로 대체해야 충돌 방지
- **패턴**: `border-l-4 border-l-destructive` → `ring-1 ring-destructive/20 bg-destructive/5` (ring으로 대체)

### [CL-TREE-REDESIGN-20260403] forceExpand 트리 제어 패턴
- **문제**: 전체 펼치기/접기 시 각 Collapsible의 개별 open state와 충돌
- **교훈**: 부모→자식 일괄 제어는 `forceExpand: boolean | null` 패턴 사용. null = 개별 제어, true/false = 강제. 500ms 후 null 리셋으로 개별 제어 복원
- **패턴**: useEffect에서 forceExpand 감시 → setIsOpen 동기화. 부모에서 setTimeout(() => setGlobalExpand(null), 500)

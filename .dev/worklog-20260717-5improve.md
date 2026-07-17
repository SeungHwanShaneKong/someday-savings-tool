# 5대 개선 배치 — 인앱 OAuth·5σ 체류·콕찌르기·2026 비용 fact·그로스 설계

- **일자**: 2026-07-17 / **추적 ID**: `CL-INAPP-IOS-20260713-224500` · `CL-ADMIN-5SIGMA-20260713-224500` · `CL-COST-2026Q2-20260713-231500`
- **사용자 확정**: #3=이메일 완성 고수 · #5=공유 카드 강화(설계만) · #1=탈출 안내 유지

## [발생 원인 — 기술적 내용 — 해결책]

### 개선1 — Threads 인앱 Google OAuth 403
- **원인**: iOS Threads UA 는 'Threads' 대신 코드명 **'Barcelona'** → `IN_APP_BROWSER_PATTERNS` 미매칭 → Auth 인앱 가드 미작동 → 웹뷰에서 OAuth 시도 → 구글 `disallowed_useragent` 차단.
- **해결**: 패턴 `/Threads|Barcelona/i` + **iOS WKWebView 일반 휴리스틱**(AppleWebKit + `Safari/` 부재 + 실브라우저 토큰 부재) + **PWA standalone 가드**(iOS 홈화면 UA 도 Safari 토큰이 없어 미가드 시 PWA 로그인 차단 회귀!). 오탐은 브릿지 UI soft 강등.
- **교훈**: 메타 계열 앱 UA 는 제품명이 아니라 **코드명**(Threads=Barcelona)일 수 있다 — 인앱 감지는 브랜드명 패턴만 믿지 말고 iOS 는 'Safari/ 토큰 부재' 구조 신호를 폴백으로.

### 개선2 — 평균 체류 5σ 절사
- 전역(로드 기간) 스코프 채택 근거: **표본 최대 z=(n−1)/√n → n<27 표본에선 5σ 이탈이 수학적으로 불가** — 일별 σ 는 영구 no-op. 파생 배열만 도입해 원본 pageViews(8개 소비처) 무접촉.

### 개선4 — 2026 비용 fact
- 3앵글 research-scout 워크플로 + WebFetch 원문 재검증. **기사 내부 상충(신혼여행 763 vs 1,030)은 나열표 2건 일치로 확정** — 산술 추정(965×1.067)보다 원문 나열표가 권위.
- 하드 골든 5파일 연쇄: budget-wizard C1/C6·**BudgetSetupWizard W2(컴포넌트 테스트에도 동일 골든 숨어 있었음)**·average-costs·impact-calculator·budget-optimizer. **교훈: 기준 데이터 변경 시 grep '54_470_000|54470000' 처럼 골든 수치 자체로 전수 검색할 것.**
- 신규 골든 53,410,000 은 독립 수기 산식과 테스트 러너 산출이 일치(교차 검증).

### 개선3 — 진행 중(사용자)
- 실측: DKIM(resend._domainkey) 등록됨(p=MIGf...) — **사용자가 STEP 1 진행 중**. send SPF/MX 2건 잔여 → 안내 완료. Verified 후 마법사.

### 개선5 — 설계서
- `docs/growth-share-card-design.md`(283줄, G-1 에이전트 작성·PM 검수): 등급 축=계획력·알뜰함, K=i×c, P1(계측+카드)→P1.5(카카오)→P2(OG/마스킹)→P3(A/B). 구현은 사용자 승인 후.

## 검증 (2라운드 적대 검증 — NO-GO→수정→GO 수렴)
- 1라운드 4렌즈: UA·5σ = GO / **fact = NO-GO(14건)** — AI 챗 지식베이스·qa-system-prompt·chat-preview 등 **런타임 표면 미갱신** + 아티클 잔존 / **설계서 = NO-GO(7건)** — /auth?from= 오배선·acquisition_source 미실존 컬럼 등.
- 수정: 에이전트 2병렬(fact 14+5곳·설계서 7곳) + PM 직접(Guide 예물예단 범위).
- 2라운드 재검증: 설계서 GO / fact 는 **부분 수정이 만든 2차 모순 5건 추가 적발**(합계 범위 2,100~7,700→8,100 미동기 4곳·플래그십 도입문/방법론 7만 잔존·범위표 미동기·t5 '웨딩셈 기준 7만' 거짓화·'2~3억' 구 대표치) → PM 직접 전량 수정 + 구값 스윕 잔존 0.
- 최종: tsc -b 0 · vitest 1881 ×3 green · build:ssg 36 · prove-first RED(10케이스)→GREEN.

## 교훈(추가)
- **기준 데이터 변경은 '표'만이 아니라 문서의 파생 서술 전체(합계 문구·도입문·방법론·FAQ·범위표)가 연쇄** — 수치 grep 은 어순 변형('1인당 식대를 …7만 원')을 놓치므로, 검증관 렌즈에 "수정이 만든 새 모순" 항목을 반드시 포함할 것.
- **AI 지식베이스/시스템 프롬프트/캔드 답변은 콘텐츠 grep 에 안 걸리는 런타임 수치 표면** — 데이터 갱신 체크리스트에 명시적 포함(wedding-knowledge-base·qa-system-prompt·chat-preview-data 3종 세트).

# Lessons Learned 아카이브 (AI 작업 교훈 — 재발 방지)

> [Harness 6-4] AI 작업 로그·교훈은 `.dev/`에 적재한다. CLAUDE.md 에는 **최상위 5건 + 이 파일 포인터**만 둔다.
> 형식: `[CL-<NAME>-YYYYMMDD]` — [발생원인 → 기술내용 → 해결책].

---

## 최신

### [CL-BTNAUDIT-RR-SLASH-20260703] 정적 버튼/라우트 감사는 프레임워크 동작을 오해해 대량 false-positive 를 낸다 — 라이브 실증 필수
- **발생원인**: 버튼 기능 감사 워크플로가 "Footer 링크 `/faq/`(트레일링 슬래시) vs App.tsx `path="/faq"`(없음) → React Router 404" 를 9건 중 8건 '치명 고장(sev5)'으로 보고.
- **기술내용**: React Router v6 는 매칭 시 **트레일링 슬래시를 정규화**해 `/faq/` 를 `path="/faq"` 에 매칭한다(404 아님). 프리뷰 라이브 렌더(/faq/·/editorial/ h1 정상)+기존 e2e(public-pages 트레일링 슬래시 통과)+이미 배포·작동 중이 반증. `/guide/wedding-cost-data/` 도 finder 가 articles.ts 만 보고 tier-3/4 레지스트리를 놓쳐 '없는 슬러그'로 오판(실제 렌더됨).
- **해결책**: **라우트/네비게이션 '고장' 주장은 반드시 프리뷰·e2e 로 실제 렌더를 실증한 뒤에만 수정.** 검증 없는 일괄 라우트 수정(App.tsx path 에 슬래시 추가)은 오히려 현재 작동 중인 라우팅을 깨뜨릴 수 있다. 정적 분석 finder 는 프레임워크 규칙(RR 슬래시 정규화·지연 로딩·레지스트리 분할)을 모르면 과탐한다 → PM 이 라이브로 반증.

### [CL-RAF-HIDDEN-TAB-20260703] 카운트업/애니메이션은 숨겨진 탭(rAF throttle)에서 최종값 일관성을 보장해야 한다
- **발생원인**: LandingBudgetSimulator 시각 총액이 프리뷰에서 스타일 변경에도 7,247만원 고정(aria-live 는 정확). 원인 추적 = 프리뷰 탭 `visibilityState:hidden`·`hasFocus:false` → rAF 600ms 간 0회 발화.
- **기술내용**: useCountUp 이 애니메이션 최종값(`setValue(target)`)을 rAF 틱 안에서만 설정 → rAF 가 throttle(백그라운드 탭)되면 콜백이 안 와 `from` 에 영구 고정, 시각값이 aria-live 최종값과 발산. 실사용자도 '값 변경 직후 탭 전환' 시 재현 가능한 강건성 공백.
- **해결책**: rAF 미지원이거나 `document.hidden` 이면 즉시 최종값 스냅(안 보이는 애니메이션 스킵) + rAF 경로에 `setTimeout(durationMs+100)` 폴백으로 중도 hidden 전환에도 최종 일관성 보장. 근본 원칙: **애니메이션은 '보기 좋게'가 목적이고, 값 정확성은 rAF 발화 여부와 무관하게 항상 보장돼야 한다.**

### [CL-CDN-PRELOAD-20260703] 외부 CDN preload URL 은 실HTTP 검증 후 커밋 (LCP 최적화가 404 로 역효과)
- **발생원인**: Top20 P1 LCP 작업에서 Pretendard woff2 를 `<link rel=preload>` 로 선다운로드하려 했으나 URL(`.../dist/web/variable/woff2/...`)을 CSS 경로에서 추정해 넣음.
- **기술내용**: 해당 경로는 CDN 404(curl -I 로 실증) → 브라우저가 무효 요청을 날리고 실제 폰트는 CSS(swap) 경로로만 늦게 도착 = LCP 최적화 의도가 오히려 낭비 요청. R50 회귀헌터가 적발.
- **해결책**: Pretendard CSS 원문의 `@font-face` `url('../../../packages/...')` 상대경로를 절대화 → `.../packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2`(HTTP 200 검증) 로 교정. **규칙: 외부 preload/preconnect 대상 URL 은 `curl -sI` 200 확인 없이는 커밋 금지.**

### [CL-GATE-FLAKY-20260703] 복합 게이트에서 vitest 종료코드 마스킹·플래키 오판 금지
- **발생원인**: `tsc && vitest run 2>&1 | tail -4 && build:ssg && playwright` 한 줄 체인으로 최종 게이트 실행.
- **기술내용**: ① `| tail -4` 가 vitest 종료코드를 tail 것으로 덮어 18 test 실패에도 체인이 build/playwright 로 진행(오탐 통과). ② singleFork(Windows OOM 방지) 하 1444 테스트 단일 프로세스 누적 메모리 + 복합 체인 리소스 경합으로 18건 플래키 실패 — 격리 재실행 2회 모두 1444/1444(결정론적 결함이면 매회 동일 실패 재현). 
- **해결책**: **오라클은 파이프로 종료코드를 가리지 말 것**(`| tail` 은 별도 스텝). vitest 는 build/playwright 와 분리해 단독 격리 실행으로 green 판정. 플래키 의심 시 최소 2회 격리 재현으로 결정론 여부 확정 후 판정.

### [CL-NOREGRESS-STORAGEKEY-20260703] 배포 사용자 상태 보호 — 스토리지 키 개명은 실질 퇴행
- **발생원인**: R50 부족점 발굴이 허니문 온보딩 localStorage 키에 `_v2` 버전 접미사 추가(스키마 명료성)를 제안.
- **기술내용**: 배포 중인 서비스의 기존 사용자는 구 키에 진행상태 저장 → 키 개명 시 즉시 고아화되어 온보딩 진행 소실 = "후퇴 금지" 위반. 기존 loadState 검증으로 이미 malformed 방어됨(검증관도 런타임 fix 불요 인정).
- **해결책**: PM 이 기각. **규칙: 이미 배포된 스토리지/DB 키의 개명·버전업은 마이그레이션(구키→신키 복사) 없이는 금지.** 명료성만을 위한 개명은 사용자 상태 손실과 트레이드오프.

### [CL-AUDIT2-20260628] 관리자 대시보드+익명집계 적대 감사 — 16확정 중 상위 10건 근본수정 (회귀 0)
- **방식**: Workflow 5차원(보안·안정성·성능·에러·엣지) 병렬 finder(독립 에이전트) → 발견별 적대적 반증 verify → 영향×발생 랭킹(24후보→16확정). 생성≠검증(독립 컨텍스트). stray sweep 통과(메인트리 0).
- **R1[score16·보안] track-visit abuse**: IP 레이트리밋이 클라조작 X-Forwarded-For + per-isolate Map(스푸핑·희석)이라 무력 → 무인증 무제한 쓰기증폭·지표오염. 근본수정 = **DB 글로벌 일일 하드캡(reserve_anon_visit 원자 RPC, 마이그 20260628120000)** reserve-before-insert + 본문크기 가드(F13) + RateLimiter TTL스윕/엔트리캡(F12, Map 무한증가 차단). per-IP는 보조 1차 레이어로 강등. 순수로직(isBodyTooLarge/isOverDailyCap/RateLimiter) vitest 12.
- **R2[16·엣지] auth-loading 이중집계**: 익명 effect가 `user?.id`만 보고 authLoading 무시 → 로그인 유저 콜드로드(F5/새탭) 시 익명으로 1행 오집계(프라이버시 약속 위반). 근본수정 = `if(authLoading||user?.id)return`+deps. 전환(null→{id}) 회귀테스트 추가(ANON.4/5).
- **R3[12·안정] error/isFetching 미소비**: RQ 마이그 후 Admin이 error/isFetching 미구독 → 코어 실패 무음(0/미배포로 위장)·keepPreviousData로 isLoading 영구false라 새로고침 스피너 미작동. 근본수정 = error/partialError 배너 + spin/disable 을 isFetching 바인딩.
- **R4[12·에러] 코어 fail-fast 백지화**: fetchAllRows throw 가 Promise.all 전체 reject → 한 테이블 실패=18KPI 전부 백지(보조 RPC만 degrade 보호, 코어 비대칭). 근본수정 = safe() 래퍼 source별 [] degrade + partialError 노출(무음 금지). 통합테스트 AN.4.
- **R5[12·성능] 리텐션 O(P×V)+Date재파싱**: computeRetention 중첩스캔×3 + 비교마다 new Date() → 폴링마다 메인스레드 블로킹. 근본수정 = 순수모듈 computeRetentionRate(O(P+V), ms 인덱스 1회파싱), **골든 6케이스로 동치 입증**. + ADMIN_HEAVY 20s→30s(기존 대비 +50% 부하 회귀 제거, 포커스갱신으로 준실시간 유지).
- **R6[6·엣지] TZ 라벨/일경계**: anon 추이 day 를 `new Date('YYYY-MM-DD')`(UTC자정)로 파싱→음수오프셋 관리자 하루밀림 + RPC UTC vs 클라 로컬 일경계 불일치. 근본수정 = RPC 를 `AT TIME ZONE 'Asia/Seoul'`로 통일 + 클라 `new Date(d+'T00:00:00')`(로컬자정).
- **교훈**: ① 무인증 Edge write 는 in-memory/헤더 기반 레이트리밋이 결코 충분치 않음 → **DB 원자 하드캡이 정공법**(reserve 패턴 재사용). ② RQ 마이그 시 훅이 새로 노출한 상태(error/isFetching)를 UI가 반드시 소비해야 함(keepPreviousData 는 isLoading 을 영구false 로 만듦). ③ Promise.all 의 fail-fast 는 부분 degrade 와 상극 → 코어도 source별 격리. ④ 성능 최적화는 순수추출+골든으로 '동치' 먼저 잠그고 변경. ⑤ date-only 문자열은 절대 `new Date()` 직접 파싱 금지(로컬자정 명시 또는 string slice).
- **검증**: tsc -b 0 · vitest **1091**(신규 13: track-visit-logic 12·retention 6·anon RQ 4·usePageTracking 5 등)×3 결정론 · build:ssg 21 · eslint 0. **남은(사용자)**: 마이그 3개 적용(anon_page_views→anon_visit_rpcs→anon_visit_daily_cap) + track-visit Edge 배포 + 프라이버시정책.

### [CL-ANONVISIT/ADMIN-RQ-20260627] 관리자 대시보드 실시간·실데이터 종합 업그레이드 (익명 트래픽 집계 + React Query 준실시간)
- **발생원인(이슈)**: 대시보드 다수 차트가 "데이터 안 들어옴" 체감 → 실측 2대 원인. ① **익명 트래픽 미집계**: `usePageTracking`이 `if(!user?.id)return`(프라이버시 설계)로 **로그인 유저만** `page_views` 기록 → 방문/PV/유입/체류/DAU 차트가 실제 트래픽(대다수 익명, GA4엔 있음) 대비 과소표시. ② **비실시간**: `useAdminKPI`가 수동 state+30초 `setInterval`+전량 재조회.
- **해결책 A(익명 집계, 프라이버시 안전)**: 신규 `anon_page_views`(user_id/IP/UA 없음·session_id=비영구 랜덤 UUID·referrer=origin만·`is_synthetic` 거버넌스·RLS 정책 0개). 쓰기는 **전용 Edge 릴레이 `track-visit`**(verify_jwt=false + IP rate limit(미저장) + 살균/화이트리스트 `_shared/track-visit-logic` + service_role 단일 write 지점). **직접 anon INSERT RLS 거부**(20260214152805가 제거한 개방 write 표면 재현 금지·R8 기조). 집계 RPC 3종(`admin_anon_traffic_trend`/`_source_breakdown`/`_top_pages`, DEFINER+admin게이트+anon REVOKE+is_synthetic=false). 대시보드 "전체 방문(익명 포함)" 카드 추가(로그인 기준과 라벨 분리).
- **해결책 B(React Query 준실시간)**: `useAdminKPI` 집계 400줄 **100% 보존**, setter→반환객체로 바꿔 `loadAdminKpi` 추출 후 `useQuery`로 래핑(extract-then-swap). 프리셋 `adminQueryConfig`(ADMIN_HEAVY 20s/LIGHT 15s/PANEL 45s)+`refetchIntervalInBackground:false`(탭숨김 정지)+`refetchOnWindowFocus:true`(복귀 즉시) → Admin.tsx의 수동 `doFetch`/`setInterval`/`visibilitychange` 제거. 패널훅(RAG/perf/feature-req) RQ화, 새로고침=`invalidateQueries(['admin'])`.
- **교훈**: ① 대형 훅 RQ 전환은 **집계를 setter→반환으로만 바꾸고 useQuery로 감싸면** 로직 무변경+저위험(순수추출보다 안전). ② boundary 테스트가 `renderHook(()=>useAdminKPI())` 무인자 → useQuery 도입 시 **QueryClient 래퍼 필수**(단언은 fetchData shim으로 보존). ③ 신규 RPC는 generated `types.ts` 미반영 → 격리 캐스트(`rpc.bind` as unknown)로 기존 타입 안전 유지. ④ Edit 도구는 리터럴 제어문자 매칭 불가 → 정규식은 `\u` escape 텍스트로(Python `chr(92)` 조립으로 주입). ⑤ 익명 DB 로깅은 **프라이버시 정책 갱신 필요**(GA4 이미 익명 수집과 일관).
- **검증**: tsc -b 0 · vitest **1078**(신규 19: track-visit-logic 8·adminQueryConfig 4·usePageTracking.anon 3·useAdminKPI.anon 3·boundary 1)×3 결정론 · build:ssg 21라우트 · eslint 0. **남은(사용자)**: 마이그2(anon_page_views·anon_visit_rpcs) 적용 + `supabase functions deploy track-visit`(+config verify_jwt=false) + types.ts 재생성(또는 캐스트유지) + 프라이버시정책 갱신. 미배포 시 전부 degrade-safe(앱 무영향, 차트는 빈상태/로그인기준 유지).

### [CL-WWW-CERT-20260627] 공유 링크 클릭 시 인증서 오류·중간화면 — www TLS 미발급 근본수정
- **발생원인**: 사용자가 `bit.ly/3MuGMny` 공유링크 클릭 시 ① bit.ly "목적지로 계속(7초)" 미리보기 ② `www.moderninsightspot.com` 의 `NET::ERR_CERT_COMMON_NAME_INVALID` 로 진입 차단. 휴대폰 Chrome 옛 캐시/HSTS 또는 구(舊)링크가 www로 유도.
- **기술내용(실측 — curl/openssl/nslookup)**: apex(`CN=moderninsightspot.com`)·wedsem(`CN=wedsem.…`)은 200·정상, bit.ly→`http://wedsem`→`https://wedsem`→stub `location.replace`→**apex** 로 라이브 경로 자체는 무결. 유일한 결함 = **www 전용 인증서 미발급**: www DNS는 `seunghwanshanekong.github.io`(GitHub 185.199.x)로 정상 이전돼 `Server: GitHub.com`+`301→apex` 까지 되지만, 인증서가 GitHub 기본 **`CN=*.github.io`**(SAN에 www 미포함)라 TLS 핸드셰이크가 301 응답 전에 실패. → **`Server:` 헤더만으론 못 잡음, SAN 검사가 진짜 오라클.** bit.ly 7초 화면은 bit.ly 자체 미리보기(코드 차단 불가).
- **해결책**: ① **공유 정책 = apex `https://moderninsightspot.com/` 직접 공유**(bit.ly·서브도메인·www 전부 우회 → 중간화면·오류 0). ② **근본수정 = 전용 `www-redirect` repo**(`wedsem-redirect`와 동형): www 도메인을 별도 repo가 claim 하면 GitHub이 **www 전용 인증서를 자동발급**(wedsem이 이미 그 패턴으로 유효 인증서 보유=증명) → www→apex 정상. 완성본 `C:\Users\shane\Documents\analytics\www-redirect\`(index.html·CNAME·README). ③ 휴대폰 캐시/쿠키 삭제 또는 시크릿탭 검증. **DNS 변경 불필요**(www CNAME 이미 정상).
- **교훈**: GitHub Pages는 **repo당 커스텀도메인 1개+그 도메인 전용 인증서**만 자동발급 → apex repo는 apex만 커버, **www↔apex 자동 인증서는 불안정**. 서브도메인 인증서가 필요하면 **도메인당 전용 redirect repo**가 정공법(이미 wedsem에서 검증됨). 진단은 `Server:` 가 아니라 **인증서 SAN** 으로. apex 코드 저장소는 **무수정**(이미 정상) — 정직하게 인프라 문제로 분리.

### [CL-VULN-AUDIT-R7-20260626] 사전배포 적대 감사(개선5종 publish 직전) — 5건 수정 + 2건 수용
- 14후보→8확정, 전부 저점수(≤4, 치명 0 — R5/R6에서 굵직한 표면 이미 차단). 마이그(트리거/RPC)는 사용자가 step3로 라이브 적용 완료.
- **R7-1/R7-2(score4) 수정**: BudgetFlow baseline(lastSeen) 전진이 `maxUpdatedAt(items)` 로 **내 편집 updated_at 까지 포함**해, 내 편집보다 시각은 이르지만 이후 도착할 파트너 변경을 마스킹/영구 미강조. 근본수정 = `maxUpdatedAt(items, myUserId)`(내 편집·null 편집자 제외) → 파트너 변경 max 로만 전진. CS.15/16 회귀가드.
- **R7-4(score2) 수정**: usePartnerEditNotifier 가 예산 전환 시 sessionRef 미초기화 → A의 누적 편집시간이 B로 새어 잘못된 예산 2분알림 오발사. 근본수정 = `[budgetId, active]` 변경 시 sessionRef=initial + lastSignalRef=editSignal 동기화. 회귀가드 R7-4.
- **R7-6(score2) 수정**: ACK 의 last_edited_by 보정이 setItems 만 하고 setAllBudgetsItems(예산별 캐시) 누락 → 캐시 정합 위반. 낙관/롤백/onUpsert 와 동일 '이중 갱신'으로 통일. EDIT5-D1 테스트 확장.
- **R7-7(score1) 수정**: 파트너 해지(partnerPresent true→false) 시 활성 강조가 3분 잔존 → partnerPresent false cleanup effect 로 즉시 소거+가드 리셋.
- **R7-5(score1) 수정**: 초대 합류 차트 X축 raw 날짜(YYYY-MM-DD) 겹침 → tickFormatter(M/d)+interval='preserveStartEnd'.
- **수용(2건)**: R7-3 칭찬 토스트 개인모드 적립 = '적극 편집자' 일반 보상 설계의도(무해). R7-8 last_edited_by 마이그 무백필 → 트리거 적용 전 파트너 변경(NULL)은 1회성 미강조 — 추정 백필=오귀속 위험이라 **보수적 제외가 안전**(transitional, 문서화).
- **검증**: tsc 0 · vitest **935**(+CS.15/16·R7-4)×3 · build 19 · 독립 verifier.

### [CL-IMPROVE5-20260625] 개선 5종 — 도메인 진단 · 방문 히스토그램 · 초대유입 · 변경 토스트 · 강조 근본수정
- **#1 도메인 통일(진단)**: apex=최신(GitHub). **www=구 Lovable 빌드(Cloudflare, DNS 미이전)**, **wedsem=구 리다이렉트 스텁(별도 repo `wedsem-redirect` 미재배포·단 apex로 리다이렉트는 동작)**, `/budget`=SPA 404 폴백(정상). 교훈: apex 승격 시 **www CNAME 이전 누락**이 사고 — 코드로 못 고침, Gabia DNS(www→github.io)+별도 repo 재배포 = 사용자. deployment.md에 www 컷오버 항목 추가.
- **#2 방문 히스토그램**: RPC `admin_visit_histogram`(per-user COUNT → LEAST(v,10) 버킷) + useAdminKPI(빈 버킷 0채움) + Admin BarChart. page_views는 **로그인 유저만 기록** → 익명 제외(정직 라벨).
- **#3 초대유입**: RPC `admin_referral_joins`(budget_collaborators created_at 일자별) — 익명 /invite 방문은 미기록이라 **'합류(수락)'만 확정 카운트**. 일반 외부 referrer는 기존 유입경로 차트가 커버.
- **#4 변경 요약 토스트**: 재접속 시 changedItemIds 0→N 최초 전이 1회 `toast`(예산별 ref 가드).
- **#5 강조 근본수정(핵심)**: 근본원인 = **`budget_items.last_edited_by` 부재**(편집자 구분 불가 → 내 편집 오표시) + 스냅샷 effect '예산당 1회' 가드(실시간 늦은 도착 누락). 해결: ①컬럼+트리거(`auth.uid()` 권위 기록, 마이그) ②`computeChangedSince(items,lastSeen,myUserId)` — `updated_at>lastSeen AND last_edited_by≠me AND ≠null`(myUserId 옵셔널=하위호환, null=보수적 제외) ③`mergeRemoteFields`가 last_edited_by를 remote 채택(실시간 머지 후 정확) ④BudgetFlow를 **items 변경마다 union 재계산**(예산당 1회 가드 제거 → 늦은 도착도 강조)+lastSeen 진입시 동결+서버시각 단조 baseline. R6-D '내 편집 lastSeen 전진' 휴리스트 **제거**(last_edited_by가 자기제외 보장 → 단순화). last_edited_by 미배포(null) → 강조 0(오탐 없음, degrade-safe).
- **교훈**: 협업 '누가 바꿨나'는 타이밍 휴리스트로 추정 불가 — **편집자 컬럼이 정공법**(처음부터 넣었어야). myUserId 옵셔널 인자로 기존 테스트 0 회귀.
- **검증**: tsc 0 · vitest **930+**(편집자 구분 CS.10-14·mergeRemoteFields CR.14)×3 · build 19. 마이그 3종(visit_histogram·referral_joins·last_edited_by)+트리거=사용자 적용. 라이브(RPC권한·트리거·DNS)=사용자 확인.

### [CL-VULN-AUDIT-R6-20260625] 사전-배포 적대 감사 — 6건 근본수정(데이터유실 차단 포함) + 배포 게이트
- **맥락**: R5 이후 신규 변경(저장됨 인디케이터)+전체 미커밋 페이로드를 '커밋/푸시/배포 직전' 적대 감사. 14후보→8확정→6 distinct.
- **A [impact5·최우선] 게이미피케이션 캐시 미로드 클로버**: `increment/append/update` 가 base 를 `qc.getQueryData ?? DEFAULT` 로 잡아, 쿼리 로드 前(BudgetFlow 스냅샷 effect 가 mount 직후 increment 호출) 호출되면 gamification_state JSONB '전체'를 DEFAULT+delta 로 덮어써 **스트릭·배지·퀘스트 영구 유실**. 근본수정 = `resolveBase()`(캐시→없으면 DB 최신 fetch→행없을때만 DEFAULT) 공유 + 배지 합집합을 mutationFn 안에서 fresh base 기준으로 수행 + 모든 write 동일 scope 직렬화. red→green(cold-cache repro: pending-first maybeSingle).
- **B Resend 샌드박스 발신자**: `from: onboarding@resend.dev` 하드코딩 → 라이브에서 임의 수신자 403 → reserve-before-send 가 슬롯만 태우고 0% 발송. 근본수정 = `NOTIFY_FROM` env 외부화 + `isUnverifiedSharedSender` 가드로 미인증/샌드박스면 **예약 전에** `no_sender_domain` degrade(슬롯 미소진) + 403/422(설정성)면 예약행 회수(같은날 재발송 가능), 5xx 만 fail-closed.
- **C 색상 단독 강조(WCAG 1.4.1)**: 파트너 변경행이 amber 틴트만 → 색맹/SR 비가시 + reduced-motion 시 시머 그라디언트 정적 잔존. 근본수정 = "파트너 변경" 텍스트 단서(아이콘+텍스트) 양 테이블 추가 + reduced-motion 에 `.partner-changed-row{background-image:none}`.
- **D last-seen 클라 now 무가드**: 내 편집 effect 가 `now` 로 무가드 갱신 → 클라 시계 스큐로 lastSeen 후퇴 → 파트너 변경 재강조/중복보상. 근본수정 = 스냅샷 effect 와 동일 '역행 금지(단조)' 가드.
- **E notify_day 스키마 미준비**: 마이그 130000 미적용 상태 배포 시 42703 → 500 폭주. 근본수정 = `mapReserveError`(42703/42P01→`schema_not_ready` 200 degrade) + 배포 순서 게이트 문서화(deployment.md).
- **F 글로벌 캡 TOCTOU [수용]**: 100통/일 글로벌 캡은 check-then-act(비원자) — 서로 다른 페어 동시 invoke 시 미미 초과. impact/likelihood=1, per-pair 는 hard(유니크). **수용된 잔여 리스크**로 문서화(엄격 강제는 일별 카운터 RPC 필요, 사용자 적용).
- **Edge/DB 테스트 전략**: Edge 결정/살균 로직을 순수 모듈 `_shared/notify-logic.ts` 로 추출(isUnverifiedSharedSender·isConfigErrorStatus·mapReserveError 추가)해 vitest red→green. 실 동시성·실발송은 사용자 라이브(마이그+NOTIFY_FROM+키+배포).
- **신규 마이그**: `20260624130000_partner_notifications_hardening.sql`(notify_day+부분유니크). **교훈**: 워크플로 서브에이전트가 '읽기 전용' 지시를 어기고 working tree 에 probe 테스트 파일을 쓸 수 있음 → 커밋/스위트 전 stray 파일 전수 sweep 필수(git status `??` + find).
- **검증**: tsc `-b` 0 · vitest **925**(R6 신규 8)×3 결정론 · build 19라우트 · secret 0 · 독립 verifier.

### [CL-VULN-AUDIT-R5-20260624] 적대적 취약점 감사 — 치명 10건 근본수정(red→green) + 회귀 0
- **방법**: 멀티에이전트 발견 워크플로(5차원×파인더 → 적대 검증관 dedup·재판정) 로 36후보→27확정→**10 distinct 근본원인**(임팩트×발생가능성 정렬). 각 건 '재현 테스트(red)→근본수정→green', 마지막 전수 스위트(917×3)+독립 verifier(생성≠검증) GO.
- **10건 요지(근본수정)**: ①알림 미발송(no_provider/rate_limited)에도 보상 지급 → 클라가 서버 `sent===true` 단일 신뢰원천으로 게이트(usePartnerEditNotifier). ②레이트리밋 TOCTOU → **reserve-before-send**(partner_notifications 부분 유니크 `uq_partner_notif_pair_day` + 23505→rate_limited). ③게이미피케이션 lost-update(절대값 머지) → **increment(delta) read-modify-write + mutation scope 직렬화**(useGamificationState); BudgetFlow·**useBadgeUnlock** 보상까지 전부 increment 로 통일(절대값 클로버 잔존 0). ④budgetId 미검증 → `coerceBudgetId`(UUID)+소유/협업 확인 null 강등. ⑤발송실패 재시도 폭주 → reserve-before-send + **fail-closed**(예약 유지). ⑥재접속 last-seen 을 now 가 아닌 `maxUpdatedAt(스냅샷)`로 전진(늦게 온 파트너 변경 보존). ⑦onEdit 시계 역행 → 세션 재시작(영구 고착 방지). ⑧updateItem ACK 가 단조 게이트 우회 → `isNewer`로 게이트(에코 ack 기록은 게이트 밖 유지). ⑨마일스톤 정확일치 → `crossedMilestone` 범위통과(배치 리렌더 누락 0). ⑩이메일 제목/본문 미살균 → `escapeHtml`(5종)+`sanitizeHeaderText`(제어문자/개행).
- **Edge/DB 테스트 전략(중요)**: Deno Edge·실 Postgres 는 vitest 불가 → 결정/살균/예약 로직을 **Deno-비종속 순수 모듈 `_shared/notify-logic.ts`** 로 추출(단일 진실원, Edge·vitest 공유)해 red→green. 동시성 TOCTOU 는 `DailyReservationLedger`(인메모리 유니크 모델)+`checkThenActAllowsSend`(버그 모델) 대조로 입증. **실 동시성/실발송은 마이그 적용+Edge 배포 후 사용자 라이브 검증**(정직 보고). 생성열 `GENERATED AS ((created_at AT TIME ZONE 'UTC')::date)` 는 immutable 아님 → 거부됨 → notify_day 는 일반 컬럼 + Edge 가 UTC 일자 명시 기록.
- **RQ v5 동시 mutate 패턴**: 절대값 mutate 는 stale 클로저로 lost-update. 정답 = mutationFn 내 `qc.getQueryData` 최신 base 에 delta 누적 + `scope:{id}` 직렬화 + onMutate 이중적용 함정 회피(여기선 onMutate 생략·mutationFn 내 setQueryData 로 다음 직렬 base 갱신).
- **검증**: tsc `-b` 0 · vitest **917**(신규 26)×3 결정론 · build:ssg 19라우트 · Resend 키 리터럴 0건 · 독립 verifier GO. **잔여(사용자)**: 마이그 130000 적용 + notify-partner 재배포 + RESEND 키.

### [CL-COEDIT-NUDGE-20260624] 공동편집 리텐션 4종 — 방문유입·2분알림·오프라인시머·회전칭찬
- **발생원인/목표**: 공동편집 리텐션·재방문 유도 + 운영 인사이트. ① 관리자 대시보드가 page_views 의 `referrer`/`utm_source`를 매 방문 저장하면서도 **first-touch 만 집계**(R4) → per-visit 유입 미가시 ② 부재 파트너 재유입 수단 전무(메일 0) ③ 재접속 시 파트너 변경분 비가시 ④ 적극 편집자 보상 부재.
- **설계 핵심(순수로직 분리 → CI 검증 가능)**: 트리거·판정을 모두 **순수 함수**로 떼어내 단위테스트로 못박음 — `edit-session.onEdit(prev,now)`(2분 세션, idle 10분 리셋, 세션당 1회), `changed-since.computeChangedSince(items,lastSeen)`(`updated_at>lastSeen`=부재 중 파트너변경 추론, DB 컬럼 0추가), `praise-messages.makePraiseBag`(셔플백 무반복+사이클경계 비반복)·`isMilestone`(점증 간격 3,7,15,…). hook(`usePartnerEditNotifier`)은 `now` 주입 reducer 를 구독만 → fake-timer 로 완전 결정론 테스트.
- **단일 신호원**: `useMultipleBudgets.updateItem` 성공부(`if(error)throw` **이후**)에서만 `editSignal++` → 개선2(알림)·개선4(칭찬)가 **하나의 신호**를 공유(중복 인프라 0). 실패 편집은 미카운트.
- **degrade-safe 전면**: 신규 RPC/마이그/Resend 키 **미배포여도 앱 무영향** — visit RPC 부재→`[]`, `RESEND_API_KEY` 부재→`skipped:'no_provider'` 무발송. 마이그는 `IF NOT EXISTS`/`CREATE OR REPLACE`/`ON CONFLICT DO NOTHING` 멱등.
- **개선3 시머 자가강조 함정(P2 수정)**: `updated_at>lastSeen`만으로는 **내 편집 → 다른 탭 → 복귀** 시 내 변경분이 '파트너 변경'으로 오강조됨. 해결 = **내 편집(editSignal++)마다 내 `lastSeen` 전진**(부재=내가 편집 안 함 → lastSeen 정지 → 그 사이 파트너 변경만 다음 open 강조). effect dep=`[editSignal]`만 둬서 예산전환 스냅샷 effect 와 무경합(전환은 editSignal 불변 → 미발화). 3분 유지 후 setTimeout 으로 class 제거 → CSS `transition` fade-out, 타이머는 전환/언마운트 시 clear.
- **알려진 한계(P2, 비차단·후속)**: 게이미피케이션 점수는 `useGamificationState` 의 낙관적 절대값 머지라 **동일 틱 다중 부여 시 lost-update** 가능(장식적). 근본수정=서버 RPC 증분 또는 함수형 업데이트(단, 낙관적 onMutate 와 mutationFn 이중적용 주의 — delta 를 양쪽에 적용하면 2배). 본 변경의 신규 회귀 아님(기존 `addPoints` 패턴 상속).
- **검증**: tsc `-b` 0 · vitest **891**(신규 PEN/ES/CS/PM 19) ×3 결정론 · build:ssg 19라우트 · 독립 skeptical-verifier GO(키 유출 0·JWT·레이트리밋 per-pair1/글로벌100·RLS admin-only·exhaustive switch·optional prop 무파손 확인). **실발송·마이그 실거동·라이브 다중클라 동시성은 사용자 환경(키+마이그+2계정) 필요 → 정직 보고.**

### [CL-DOMAIN-PROMOTE-20260621] apex 도메인 승격 — 이원화/좀비 완전 해결
- **발생원인**: GitHub Pages로 호스팅 이전 시 `wedsem.` 서브도메인만 연결하고 apex(`moderninsightspot.com`)는 옛 Lovable/Cloudflare 배포를 가리킨 채 방치 → apex가 **구 Supabase(tnbo+qllsuou)에 붙는 좀비 CSR**를 서빙(AdSense 등록지인데 빈약). 라이브 `curl`/번들 grep(pnfjw=0·lovable=3)으로 확정.
- **해결**: **apex 승격** — 런타임이 전부 `window.location.origin`(호스트 무관)이라 ① Gabia에서 apex A레코드를 GitHub Pages(185.199.108~111.153)로 재지정(→좀비 DNS 단절) ② 리포 `public/CNAME`=apex ③ SEO/canonical 단일소스 `src/config/site.ts`(`SITE_ORIGIN`) 도입 후 7곳 전환(useSEO·Breadcrumb·articles·prerender·index.html·robots·sitemap) ④ Supabase Redirect URLs에 apex 추가. wedsem→apex는 GitHub Pages가 자동 301(CNAME=apex)이라 기존 링크 보존.
- **핵심 원칙**: **AdSense 등록지=콘텐츠 서빙지 일치**가 안전. 등록지(apex)를 다른 도메인(wedsem)으로 301로 빼면 광고가 등록 밖에서 서빙돼 불리 → "리다이렉트로 도망"이 아니라 "등록지에서 직접 서빙". **[CL-ADSENSE-20260619]의 'apex→wedsem 301' 권고를 본 교훈이 대체(supersede).**
- **컷오버 순서(무중단)**: DNS 먼저 → push 나중(반대면 wedsem이 아직 Lovable인 apex로 301돼 좀비로 튕김). GitHub Pages apex 인증서 발급은 수분~수시간(전파 대기). 롤백=CNAME만 wedsem 재push(apex A는 GitHub 유지 → 좀비 부활 없이 복구).
- **드리프트 가드**: BASE_DOMAIN 단일소스(`src/config/site.ts`) + `tests/golden/`의 canonical 회귀 테스트 + prerender의 canonical≠BASE_DOMAIN 빌드 실패(이중).

---

## 아카이브 (이관 — 2026-06-21)

- **[CL-COEDIT-E2E-20260620]** 신랑·신부 공동편집 = **"워크스페이스 = 예산별 공유의 뷰 필터"**(새 사일로 금지): 협업자 0=개인, 있으면=우리. 충돌해결은 **field-level LWW**(셀=item.id×column) + 3중 에코억제(pending ack·단조게이트·값동일). `updateItem`은 낙관적+`.select().single()` ACK+롤백. 입력 안 뺏김=BudgetTable 로컬 temp 버퍼(blur 커밋). 클라 `budgets.update({updated_at})` 유지(bubble 트리거 없음). 초대 멱등 필수(409 시 기존 토큰 재노출). dev서버: 의존성 제거 후 `.vite` 캐시 삭제+재기동. E2E `e2e/`는 앱 tsc/vitest와 격리. **PM=pnpm**(npm은 `link:` 실패). 라이브 검증=preview 도구.
- **[CL-ADSENSE-20260619]** ⚠️**부분 대체됨([CL-DOMAIN-PROMOTE-20260621])**. AdSense 거절 원인=등록지(apex)가 빈약한 옛 CSR 서빙·풍부한 wedsem은 비등록지. 진단=`curl apex` 본문크기·`Server` 헤더. 필수 보강(순수 추가): `public/ads.txt`(`pub-9490211917581890`), 정책 4종(개인정보처리방침에 **Google AdSense/DART 쿠키 고지**)·푸터·프리렌더 ROUTES. **(옛 권고 'apex→wedsem 301'은 폐기 — 대신 apex 승격으로 등록지에서 직접 서빙.)**
- **[CL-OAUTH-LOVABLE-BROKER-20260613]** Lovable Cloud Auth는 비-iframe서 `/~oauth/initiate`(서버 브로커)로 이동 → 정적 호스팅엔 백엔드 없어 404. 진단=라이브 `curl /~oauth/initiate` vs `<proj>.supabase.co/auth/v1/authorize`. 해결: **Supabase 네이티브 `signInWithOAuth({redirectTo})` + `detectSessionInUrl:true`·`flowType:'pkce'`**(호스트 비종속). 대시보드 Redirect URLs에 신규 도메인 `…/**` 등록 필수. 정적 호스트엔 백엔드 의존 인증 금지.
- **[CL-CF-AUTODEPLOY-20260531]** `Server: cloudflare` 헤더만으로 단정 금지 → **NS 레코드**로 실제 DNS 운영처 확인(이 프로젝트=가비아). 커스텀 도메인 정답: **Gabia CNAME→`<user>.github.io`** + Pages cname 등록 → 인증서 자동발급. `build`에 프리렌더 통합으로 어느 호스트가 `npm run build`해도 SSG 보장.
- **[CL-QA100-BTN-20260531]** 멀티fork×대용량heap=Windows IPC/OOM → `singleFork`. 컴포넌트 테스트는 Supabase env `define`+전역 client mock 필수. 페이지마다 Footer 동명 링크 → `within()` 스코핑. (tsc 오라클: bare `tsc --noEmit`는 가짜그린 — 반드시 `tsc -b --noEmit`.)
- **[CL-SSG-PRERENDER-20260531]** CSR SPA→GitHub Pages는 빌드-후 Puppeteer 프리렌더가 최저 리스크. 디렉터리형+trailing-slash canonical, `404.html` SPA 폴백, sitemap 단일소스. CSR 판별은 본문 마커로(noscript는 잔존).
- **[CL-GAMIFY-INT-20260418]** 공용 Foundation 1회 구축. Supabase types.ts 수동확장으로 타입-safe. Rule-engine은 discriminated union + `_exhaustive:never`. streak 미래날짜 필터 누락 버그 테스트로 발견.
- **[CL-SEC-HARDEN-20260418]** `window.location.href=userInput`은 origin allowlist+HTTPS-only+URL파싱 3중 검증. service_role Edge Function은 ENVIRONMENT 가드+공유시크릿+IP rate limit+이메일 regex+감사로그 5층 방어.
- **[CL-AI-EXTNAV-OVERLAY-20260418]** 외부 도메인 전환 시 400ms 지연 navigation + 풀스크린 portal 오버레이 + 단계 메시지 + preconnect + 8초 safety timeout. z-index toast 하위 z-[90].
- **[CL-CHECKLIST-9PERIOD-20260412]** 유니온 타입 확장은 타입정의→상수맵→템플릿→분기→테스트→DB 동시 일치. grep 전수조사 후 일괄 치환. 기존 DB는 `CASE WHEN title ILIKE` 무손실 매핑.
- **[CL-FK-BUDGET-DELETE-20260412]** FK 다중참조 삭제는 DB `ON DELETE SET NULL` + 클라 사전 cleanup 이중 방어.
- **[CL-AI-CHAT-LIMIT5-20260408]** 폴백 체인(rag-query→ai-chat) 모든 단계에 동일 rate limit 복제 + `feature` scope. 클라는 RAG 429 시 폴백 차단.
- **[CL-HONEYMOON-BACK-STATE-20260408]** "항상 초기화" vs "뒤로가기 보존" 충돌은 출발측 `sessionStorage` 플래그 → 도착측 consume.
- **[CL-QA-50-SWEEP-20260408]** Radix Sheet/Dialog는 `<SheetDescription className="sr-only">` 누락 시 `aria-describedby` 콘솔 경고.
- **[CL-SKIP-SCHEDULE-20260405]** 숙박일 변경 시 `nightsRatio` 비례 스케일링(flight 고정). 온보딩 스텝 제거는 타입→순서→프로그레스→뒤로가기→셸→라우팅 전수 변경.
- **[CL-PLAN-ADD-DEST-NOMAP-20260405]** 동적 목록은 props 배열이 아닌 글로벌 소스(`getDestinationById`)로 해상도. 제거는 import만 끊고 파일 보존.
- **[CL-WORLDCUP-IMG-ALGO-20260405]** 외부 CDN 이미지는 빌드 검증 + 런타임 `onError` 폴백. 사용자 선택은 AI 점수보다 강한 시그널.
- **[CL-WORLDCUP-CONNECT-20260330]** Unsplash photo ID는 WebFetch 개별 검증(AI 생성 URL 불신). 소스 간 중복 방지.
- **[CL-MAP-WORLDCUP-FIX-20260330]** react-map-gl은 `viewState`(인터랙션)와 `flyToTarget`(프로그래밍) 분리, 호출 후 즉시 null. (이후 maplibre 제거.)
- **[CL-TIMELINE-FALLBACK-20260403]** 외부 AI API는 로컬 폴백 + `isFallback` state, catch에서 에러+폴백 동시 설정.
- **[CL-SEC-R1/R2-20260621]** 보안 감사 2라운드(멀티에이전트): IDOR 소유권 탈취(budgets/budget_items user_id·budget_id 불변 트리거), embed-text 관리자 게이트, deploy.yml pnpm frozen-lockfile, AI feature allowlist·형제함수 레이트리밋, kakao intent:// 살균, realtime DELETE REPLICA IDENTITY DEFAULT, 공유링크 만료. 상세는 git log `cfc10c1`·`79b4f68` + 메모리.
- **[CL-VULN-R8-AIQUOTA/ERRLEAK-20260626]** 적대적 감사 R8(미감사 Edge 표면 전수). 진짜 취약점 4종(패딩 0): ①AI 일일한도 변조 가능(카운트원천=소유자 DELETE 가능 ai_conversations)→service_role 전용 ai_usage 원장+reserve_ai_quota RPC(ON CONFLICT n=n+1 RETURNING n) ②count-then-act TOCTOU(OpenAI 호출 '후' insert)→reserve-before-call(원자 증가 후 카운트). 둘 다 5개 AI Edge(ai-chat·rag-query·negotiate·honeymoon·timeline)에 reserveDailyLimit(degrade-safe: RPC 부재 시 구 count 강등). ③feature_requests.category 무제한 text→CHECK≤40(NOT VALID). ④에러 detail/error.message 클라 누출(systemic 13함수)→공용 errorResponse(generic+requestId, raw는 서버로그만); dev-create-user는 prod→404로 제외. 순수 로직(_shared/quota-logic.ts)만 vitest 입증(6), 라이브는 마이그2(20260626100000/110000)+Edge 13함수 재배포=사용자. 검증=tsc-b 0·vitest 941(×4)·build 19·독립 verifier GO·시크릿 클린. 교훈: '신규 코드 없음'이면 감사 범위를 미감사 표면으로 넓혀라(좁은 표면 재감사는 가짜 발견 양산). 동일 취약점 클래스는 5/13 부분수정=증상무마 → 공용 헬퍼로 systemic 완결.
- **[CL-SEO-EDITLABEL-20260626]** 개선 2종. ①SEO Tier1+2+3: 진짜 갭은 '구조화데이터가 정적 HTML에 박히는지 기계 보장 없음'이었음 → prerender `verify()`에 `requireTypes`(전 @type AND) 추가가 핵심(useSEO는 jsonLd 배열을 #dynamic-jsonld에 일괄 JSON.stringify 주입 → 동반 type도 캡처됨). index.html Organization+WebSite+WebApplication @graph(@id 상호참조), Article wordCount/articleSection, og 치수. T3 콘텐츠는 병렬 워크플로우(아티클별 전담 에디터)로 48 FAQ+신규2편 생성하되 '새 가격 날조 금지·업체마다 다름 디스클레이머' 사실성 안전장치 강제 → 따옴표 이스케이프 회피 위해 별도 articles-t3.ts(백틱) + articles.ts가 import해 push/faqs부착(import type로 순환 무해). 골든 3종(jsonld-routes=dist정적존재, articles=순수메타, sitemap-robots). ②편집자 배지: 기존 last_edited_by 재사용, getEditorLabel 순수유틸 + 단일슬롯 상호배타(transient amber↔정적 '최근:')로 중복0. 검증=tsc0·vitest 1050(941→+109)×3·build 21·독립verifier GO. 교훈: Explore의 '갭'을 Plan단계에서 코드로 재확인하면 과대평가 정정됨(이미 닫힌 갭 다수). 워크플로우 args는 전달 불안정 → 데이터는 스크립트에 인라인이 안전. 라이브 SEO(Rich Results·PageSpeed·AdSense재심사)·가격 사실성은 사용자 검증.
- **[CL-AUDIT-SEO-EDITLABEL-20260626]** 적대적 감사(SEO+편집자 신규 표면, 5차원 병렬 finder + content-integrity 프로브). 정직 결과: 신규 표면 저위험 → **입증 가능한 발견 2건만**(억지 10건 금지). ①[med] prerender ROUTES↔articles 동기화 무가드(아티클 추가 시 ROUTE 누락=프리렌더/사이트맵 silent 손실) → dist-비의존 단위 가드(getAllArticleSlugs ⊆ ROUTES 정규식 파싱)로 근본수정(silent→loud, 합성 desync RED 입증). ②[low] transient amber 배지 폴백 trim 미적용(정적 getEditorLabel과 계약 불일치, 라이브 caller가 이미 trim-or-null이라 노출0) → 양 컴포넌트 trim 통일(RED '    변경'→GREEN '파트너 변경'). 추가 예방가드 4종(슬러그 유일·related 해석·고아 FAQ키·빈 FAQ). 검증 tsc0·vitest 1056×3·build 21·독립 verifier GO·시크릿 클린. 교훈: 저위험 표면에 10건 강제는 manufacturing(헌장 위반) — finder에 '입증 가능/없으면 []' 강제가 정직성 확보. 가드 테스트가 곧 근본수정(실패 모드를 loud화).
- **[CL-AUDIT-CHECKLIST-GAMIFY-20260626]** 적대적 감사(신규 코드 없음 → 미감사 표면으로 확장: 체크리스트·배지·스트릭·게이미피케이션·praise). 5차원 병렬 finder → **입증 가능 6건 → 근본수정 5건**(저위험 표면이지만 D1은 진짜 high). ①[high·D1] useBadgeUnlock 이 user_earned_badges insert 가 duplicate(이미 획득)여도 fall-through 해 total_points 재지급(영구 인플레이션) + 배치 insert 원자롤백 시 미기록 배지 보상 → upsert(onConflict:'user_id,badge_id',ignoreDuplicates).select() 로 '실제 삽입행'만 회수 + 순수 selectAwardableBadges(rule-engine)로 그 집합에만 점수/슬러그/모달(멱등). ②[med·D2] useChecklist toggleItem 롤백이 completed_at 을 new Date()로 재계산해 실패한 '완료해제' 시 원본 완료시각 파괴 → 진입 시점 item 스냅샷 그대로 복원. ③[low·D3] makePraiseBag([]) 가 undefined 를 PraiseMessage 로 거짓 캐스트 → 생성 시 throw(fail-fast). ④[low·D4] calculateDueDate 로컬 getDate/setMonth + UTC toISOString 혼용 → 음수오프셋 TZ 하루/한달 오프셋 → 전구간 UTC 메서드(4 TZ 실측 불변). ⑤[low·D5] 마일스톤 비교가 effect 가 덮어쓰는 previousCompletedRef 에 의존 → 클로저 pre-toggle 완료수로. 검증 tsc0·vitest 1060(1056→+4)×3·build21·독립 verifier GO(D1·D3 stash 로 RED 재현 실증). 교훈: '신규 코드 없음'이면 미감사 대형 표면(useChecklist 532줄·전용테스트 부재)이 진짜 버그의 보고 — broadening 이 정답. DB 보상은 '클라 캐시 평가→무조건 지급'이 아니라 '실제 DB 결과(삽입행)→보상'이어야 멱등. 라이브: upsert onConflict 가 기존 UNIQUE(user_id,badge_id)에 의존(사용자 1회 검증 권장).

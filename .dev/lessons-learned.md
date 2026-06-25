# Lessons Learned 아카이브 (AI 작업 교훈 — 재발 방지)

> [Harness 6-4] AI 작업 로그·교훈은 `.dev/`에 적재한다. CLAUDE.md 에는 **최상위 5건 + 이 파일 포인터**만 둔다.
> 형식: `[CL-<NAME>-YYYYMMDD]` — [발생원인 → 기술내용 → 해결책].

---

## 최신

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

# Lessons Learned 아카이브 (AI 작업 교훈 — 재발 방지)

> [Harness 6-4] AI 작업 로그·교훈은 `.dev/`에 적재한다. CLAUDE.md 에는 **최상위 5건 + 이 파일 포인터**만 둔다.
> 형식: `[CL-<NAME>-YYYYMMDD]` — [발생원인 → 기술내용 → 해결책].

---

## 최신

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

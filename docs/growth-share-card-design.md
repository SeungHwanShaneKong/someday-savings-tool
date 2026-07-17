# 예산 리포트 공유 카드 강화 — 그로스 설계서

<!-- [TS:2026-07-17T00:00:00+09:00 | ID:g1shrcd1 | by:G-1-growth-analytics] -->
<!-- 설계 문서 전용 — 코드 변경 없음. 승인 후 P1부터 구현. -->

- **작성**: G-1 Growth & Analytics Engineer
- **상태**: 설계 초안(사용자 승인 대기) — 로그인 필수화 정책 유지 전제(무로그인 체험판 아이디어는 기각 확정)
- **한 줄 요약**: 이미 존재하는 `/shared/:token` 공개 공유를 "표 덤프"에서 **"자랑하고 싶은 등급 카드 + 계측된 바이럴 루프"**로 격상해 유입(K-factor)을 끌어올린다.

---

## 1. 목표 · 가설 · 핵심 지표

### 1.1 문제 정의 (현재 자산의 공백 3개)

| # | 공백 | 근거(파일:라인) |
|---|---|---|
| G1 | 공유 뷰에 재미/자랑 요소 0 — 수신자에게 단순 예산 표만 노출 | `src/pages/SharedBudget.tsx` (RPC `get_shared_budget_items_by_token` :54 → 표 렌더, 전환 배너 "무료로 시작하기" :202) |
| G2 | 공유별 OG 이미지 없음 — 카톡 미리보기가 항상 일반 og-image | 프리렌더는 정적 라우트만(`scripts/prerender.mjs`), `/shared/:token`은 SPA 폴백 → per-token 메타 불가 |
| G3 | 계측 공백 — share_* 이벤트 부재 + `/shared`·`/invite` 유입이 'direct'로 오분류 | `src/lib/analytics/funnel-events.ts:9-35`(닫힌 유니언에 share 없음), `src/lib/analytics/acquisition.ts:49-83`(UTM/referrer만 검사, 자기도메인 referrer는 :71에서 direct 처리 — 랜딩 path 미검사) |

### 1.2 가설

> **H1(콘텐츠)**: 공유 카드에 "등급 + 전국 평균 대비 %"라는 사회적 화폐(social currency)를 넣으면, 예비부부(20–30대 여성 주도)가 커뮤니티·단톡방에 자발 공유하는 빈도가 유의미하게 오른다.
> **H2(수신자)**: 수신자가 "나도 내 등급이 궁금하다"는 호기심 CTA를 받으면, 현재의 정보성 배너 대비 가입 전환율이 오른다.
> **H3(계측)**: share 퍼널을 계측해야 위 두 가설을 검증·반복 개선할 수 있다(현재는 K-factor 자체가 측정 불능).

### 1.3 K-factor 정의식 · 목표 · 가드레일

```
K = i × c   ← 전 구간 '이벤트 수' 단위로 통일(대수 일관: K = share_convert / MAU)
  i = 사용자당 평균 공유 이벤트 수 = count(share_create) / MAU
  c = 공유(이벤트)당 신규가입 전환율 = share_convert / count(share_create)
      (보조 분해: c = open_rate × landing_cvr
        open_rate  = share_open / count(share_create)   ← 근사치(1 create 다회 open 가능, 분모·분자 정의 고정)
        landing_cvr = share_convert / share_open)
share_convert = first-touch source ∈ {share_card} 인 signup_complete
※ i 를 '고유 사용자 기준'으로 정의하면 c 분모(이벤트 수)와 단위가 어긋나 K ≠ share_convert/MAU — 이벤트 수 기준으로 고정(§4.3 산식과 동기).
```

| 지표 | 현재 | P1 목표(+8주) | P3 목표(+6개월) |
|---|---|---|---|
| K-factor | 측정 불능 | **측정 가능화 + K ≥ 0.10** | K ≥ 0.30 |
| i (사용자당 평균 공유 이벤트) | 미상 | ≥ 0.25 | ≥ 0.5 |
| landing_cvr (공유 랜딩→가입) | 미상 | ≥ 3% | ≥ 8% |

**가드레일 지표(악화 금지)**:
1. 기존 오가닉 가입 전환율(`signup_complete`/`auth_view`) 하락 없음(공유 카드가 본 퍼널 UX를 침해하지 않을 것).
2. `/shared/*` 이탈률 ≤ 90%(카드가 오히려 "볼 것 다 봤다" 이탈을 유발하지 않는지 감시).
3. 프라이버시 민원/공유 비활성화 요청 0건 — 금액 노출 통제(§2.2)가 전제.
4. `/shared/*` 색인 0건 유지(SEO 중복 콘텐츠 가드, §6).

---

## 2. 기능 설계

### 2.1 공유 카드 콘텐츠 — "자랑하고 싶은" 3요소

기존 표 위에 **히어로 카드 1장**을 얹는다(공유 뷰 최상단 + 이미지 저장 시 카드 우선 렌더). 데이터는 전부 기존 단일소스 재활용:

- 평균 비교: `src/lib/average-costs.ts`(`AVERAGE_COSTS`, 2026 상반기 공표 기준 갱신 **완료** — [CL-COST-2026Q2-20260713-231500]) + `src/lib/budget-optimizer.ts`의 기존 "평균 대비 N%" 로직(:43, :137, :228-231) 재사용 — **신규 산식 발명 금지, 순수 함수로 추출**.
- 완성도: 입력(금액>0) 카테고리 수 / 전체 카테고리 수.

**(a) 예산 등급 — 축은 "금액 크기"가 아니라 "계획력·알뜰함"** (금액 과시는 위화감·프라이버시 리스크 → 자랑 포인트를 '똑똑함'으로 치환):

| 등급 | 네이밍 제안(20–30대 여성 톤) | 판정 기준(완성도 × 평균 대비 알뜰도) |
|---|---|---|
| 1 | 예비 새싹 🌱 | 완성도 < 30% |
| 2 | 야무진 플래너 ✍️ | 완성도 ≥ 30% |
| 3 | 알뜰 요정 🧚 | 완성도 ≥ 50% & 총액이 평균 총액 이하 |
| 4 | 갓성비 마스터 ⚡ | 완성도 ≥ 70% & 평균 대비 −10% 이상 절약 |
| 5 | 웨딩 재테크 만렙 👑 | 완성도 ≥ 85% & 평균 대비 −20% 이상 절약 |

- 등급 계산은 신규 순수 함수 `src/lib/share-grade.ts`(입력: 항목 배열, 출력: `{grade, label, emoji, savingPercent, completeness}`) — CI 단위테스트 가능, UI 비의존.
- 평균보다 지출이 큰 사용자도 소외 금지: 절약도 미달 시 완성도 축으로만 등급 부여(2번 등급 상한) + 카피는 "평균 대비 N% 프리미엄 준비 중 ✨"처럼 비난 없는 톤(I-1 협의 항목).

**(b) 전국 평균 대비 %**: "전국 평균보다 **12% 알뜰하게** 준비 중이에요" 한 줄 + `SOURCE_TEXT`(출처 표기, AdSense E-E-A-T 정책과 일관).

**(c) 카테고리 하이라이트**: 절약 상위 1개 + 투자 상위 1개 카테고리 배지(예: "스드메는 야무지게 아끼고, 허니문에 진심 🌴"). 게이미피케이션 연동: 공유 생성 시 `useGamificationState.appendUnlockedBadgeSlugs`(slug 합집합 경로, `useGamificationState.ts:200-208`)로 '공유 배지' 지급 — `increment`는 숫자 증분(포인트 등) 전용이라 배지 지급 API가 아님. slug 합집합 자체가 멱등이며 기존 배지 인프라(D1 upsert 멱등 패턴) 재사용.

### 2.2 금액 노출 3단계 프라이버시 옵션

**원칙: RLS/RPC가 유일 보안 경계 — 마스킹은 반드시 서버(RPC) 단에서.** 클라이언트 조건부 렌더만으로는 네트워크 응답에 전액이 실려 무의미.

| 레벨 | 노출 범위 | 기본값 |
|---|---|---|
| `full` | 항목·금액 전액(현재 동작과 동일) | |
| `percent` | 등급·평균 대비 %·카테고리 **비중(%)**만, 절대 금액 0건 | ✅ **신규 공유 기본값** |
| `hidden` | 등급·완성도만(비교 %도 숨김) | |

- 스키마: `shared_budgets.privacy_level text NOT NULL DEFAULT 'percent'` 컬럼 추가(마이그레이션, 기존 행은 하위호환 위해 backfill `'full'`).
- RPC `get_shared_budget_items_by_token`을 level 반영 버전으로 교체: `percent`/`hidden`이면 `amount`를 null로 두고 사전 계산된 비중·등급 필드만 반환(SECURITY DEFINER 내부에서 계산 — 원금액은 절대 와이어에 싣지 않음).

**RPC 응답 계약(레벨별) — P2 네트워크 레벨 검증(DoD #4)의 기준**:

```
level='full'    → { item_name, category, amount: 3200000, ratio: 0.18, grade_meta }
level='percent' → { item_name, category, amount: null,    ratio: 0.18, grade_meta }
level='hidden'  → { item_name: null, category, amount: null, ratio: null, grade_meta: { grade, completeness } }
  ※ grade_meta(full/percent) = { grade, saving_percent, completeness } — 서버 사전 계산치.
  ※ hidden 의 grade_meta 는 { grade, completeness } 만 — saving_percent 는 **서버측에서 제외**(§2.2 표의
    '비교 %도 숨김'과 와이어 계약 일치. 클라 숨김 불인정 — DoD #4 네트워크 검증에 hidden 케이스 포함).
  ※ hidden 에서는 카테고리 하이라이트(§2.1(c))를 **생략**한다 — 절약/투자 상위 판정에 필요한 수치가
    와이어에 없으므로(의도) 클라가 산출 불가. category 축은 표의 행 구조 유지용으로만 반환하며
    항목명·금액·비중 3필드 전부 null. (P2 에서 서버 사전계산 highlight 필드를 추가하면 재개 가능 — 선택)
```
- Summary 공유 다이얼로그(`Summary.tsx` :334 `handleGenerateShareLink` 성공 후)에서 3단계 라디오 선택 + 변경 가능. 기존 공유 링크의 level 수정은 UPDATE 정책 필요(소유자 한정 RLS).
- 이미지 저장(`handleDownloadImage` :251, html2canvas)도 동일 level을 존중 — 카드 전용 렌더 노드에 level 프롭 전달. 기존 워터마크(:271-275 "네이버나 구글에서 '웨딩셈' 검색")는 유지하되 P2에서 URL 직접 표기(`moderninsightspot.com`)로 강화(검색 1홉 제거).

### 2.3 수신자 랜딩 UX (SharedBudget.tsx 전환 CTA 강화)

현재: 표 + 하단 배너 "무료로 시작하기"(:202). 개선:

1. **최상단 등급 히어로 카드**(§2.1) — 수신자가 3초 안에 "친구가 이만큼 준비했구나"를 파악.
2. **호기심 CTA로 교체**: "무료로 시작하기" → **"내 예산 등급 확인하기 ✨"** (가입 후 첫 예산 위저드로 자연 연결 — 기존 `wizard_enter` 퍼널에 합류). A/B는 P3.
3. **미니 비교 티저**: "이 커플은 전국 평균보다 12% 알뜰 · 당신의 등급은?" — 수신자 개인화 없이도 호기심 유발(무로그인 계산은 기각된 정책이므로 티저까지만).
4. CTA 목적지는 **`navigate('/auth', { state: { returnTo: '/budget' } })`** — Auth.tsx 는 URL 쿼리파람을 읽지 않고 라우터 state(returnTo)만으로 `auth_view` 의 `from` 을 채운다(:46-48 → :66 `trackFunnelOnce('auth_view', { from: stateReturnTo ?? 'direct' })`). 따라서 `?from=shared` 쿼리는 실계약상 무효. **공유 랜딩 귀속은 auth_view 의 from 이 아니라 first-touch 소스 분류(§4.2 랜딩 pathname `/shared/` → `share_card`)로 식별**하며, returnTo='/budget' 은 가입 후 첫 예산 위저드 자연 연결(2번 항목)까지 함께 충족한다.

---

## 3. 공유별 OG 전략 (정적 호스팅 제약 하 대안 비교)

**제약**: GitHub Pages는 서버 로직 0 — 카카오/페북 스크래퍼는 JS 미실행이므로 SPA의 런타임 메타 주입은 무효. `/shared/:token`은 프리렌더 대상도 아님(무한 토큰).

**카카오톡 미리보기 스펙**(설계 기준): 스크래퍼는 표준 OG 태그 파싱. `og:image` **최소 200×200px, 권장 800×400(2:1)**, 5MB 이하, JPG/PNG. `og:title` ~40자·`og:description` ~80자 내 말줄임. 스크랩 결과는 카카오 측 캐시(변경 시 개발자도구 캐시 초기화 필요).

| 대안 | 방식 | 장점 | 단점 | 판정 |
|---|---|---|---|---|
| A. Edge Function OG 렌더 | 공유 URL을 `…/functions/v1/og-share/:token`으로 발급 → Deno가 OG 태그 포함 HTML 반환 + 사람은 meta-refresh/JS로 apex `/shared/:token` 이동 | per-token 완전 동적(등급·%를 title/description에), 전 채널 커버 | 링크 도메인이 `*.supabase.co`로 노출(신뢰 하락·브랜드 훼손), Edge 콜드스타트, 함수 장애 = 공유 전면 장애, 스크래퍼/사람 분기 로직 유지비 | P2 보류(하이브리드 시 채택) |
| B. 빌드타임 프리셋 N종 | 기존 `brand/og-template.html` + `scripts/generate-og-images.mjs`(Puppeteer) 파이프라인에 **등급 카드 5종** 추가 생성 → 정적 `/og/share-grade-{1..5}.png` | 서버 0·장애면 0·기존 파이프라인 재사용, 링크는 apex 유지 | 정적 라우트에는 태그를 못 심음 → **단독으로는 스크래퍼에 무효**(D와 결합해야 유효) | D의 재료로 채택 |
| C. 쿼리파람 + 클라 렌더 | `?grade=4`로 클라에서 메타 갱신 | 구현 최소 | 스크래퍼 JS 미실행 → **미리보기에 효과 0** | 기각 |
| D. **Kakao Share SDK(JS) + 프리셋 카드** | Summary 공유 다이얼로그에 "카카오톡 공유" 버튼 → `Kakao.Share.sendDefault(feed)`로 **스크래핑 없이** 제목·설명·이미지(등급별 프리셋 URL)·버튼을 직접 지정 | 서버 0, per-share 동적 미리보기(templateArgs), 한국 공유 지배 채널 직격, 링크는 apex 유지 | 카카오 앱키 등록 필요(도메인 등록), 카카오 외 채널(문자·인스타 DM 등)은 일반 og 그대로 | ✅ **P1.5 권장안** |

**권장 로드맵**: **P1.5 = D(Kakao SDK + B 프리셋 5종)** — 국내 공유의 절대다수인 카카오톡에서 서버 없이 등급별 동적 미리보기 달성. **P2 = A(Edge Function)를 비카카오 채널 보완재로 재평가**(P1 계측으로 비카카오 share_open 비중이 20%를 넘을 때만 착수 — 데이터 기반 게이트). 일반 링크의 기본 og는 현행 대표 이미지 유지.

**대안 D 페이로드 스케치**(카카오 feed 템플릿, per-share 동적):

```js
Kakao.Share.sendDefault({
  objectType: 'feed',
  content: {
    title: '갓성비 마스터 ⚡ 등급 달성!',                       // share-grade.ts label
    description: '전국 평균보다 12% 알뜰하게 준비 중 — 우리 결혼 예산 리포트',
    imageUrl: 'https://moderninsightspot.com/og/share-grade-4.png', // 프리셋 5종 중 매핑(800×400)
    link: { mobileWebUrl: shareUrl, webUrl: shareUrl },        // apex /shared/:token 유지
  },
  buttons: [{ title: '예산 리포트 보기', link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
});
```

- 제목·설명은 등급/절약률 치환 문자열(절대 금액 미포함 — §4 계측 원칙과 동일한 노출 규율).
- SDK 로드는 버튼 클릭 시 지연 import + 실패 시 "링크 복사" 폴백(공유 자체는 절대 차단되지 않음).

---

## 4. 계측 설계

### 4.1 신규 GA4 이벤트 (funnel-events.ts 닫힌 유니언에 추가 — 오타 하드코딩 금지 계약 :8 준수, PII·토큰·절대금액 전송 0)

| 이벤트 | 파라미터 | 트리거 시점 |
|---|---|---|
| `share_create` | `channel: 'link'\|'image'\|'kakao'`, `privacy_level`, `grade: 1–5`, `completeness_band: '0-30'\|'30-50'\|'50-70'\|'70-85'\|'85-100'` | Summary에서 링크 발급 성공(:334 성공 분기)/이미지 저장 성공(:302 이후)/카카오 공유 성공 콜백 |
| `share_open` | `grade`, `privacy_level`, `has_session: boolean`(기존 로그인 여부) | `SharedBudget.tsx` RPC 성공 직후 `trackFunnelOnce`(세션 1회 — 새로고침 중복 차단, 봇은 JS 미실행이라 자연 배제) |
| `share_cta_click` | `cta: 'hero'\|'banner'`, `grade` | 수신자 랜딩 CTA 클릭 |
| `signup_complete`(기존 :21) | **파라미터 확장**: `acq_source`(first-touch source), `acq_medium` | 기존 발화점 유지(wizard_enter 병행 근사 :22-27) — `readFirstTouch()`로 파라미터만 추가 |

- **금지**: share token(원문·해시 모두), 절대 금액, 이름/이메일. 금액은 항상 밴드/퍼센트로.
- `share_convert`는 별도 이벤트가 아니라 **`signup_complete` where `acq_source='share_card'`** 로 정의(이벤트 수 최소·기존 종점 재사용, 닫힌 유니언 오염 최소화).

**페이로드 계약 예시**(구현 시 이 스키마를 테스트 스냅샷으로 고정 — 파라미터 드리프트 방지):

```ts
// 발신자(Summary) — 링크 발급 성공 직후
trackFunnel('share_create', {
  channel: 'link',            // 'link' | 'image' | 'kakao'
  privacy_level: 'percent',   // P1 시점엔 'full' 고정(레거시), P2부터 실값
  grade: 4,                   // share-grade.ts 산출 1–5
  completeness_band: '70-85', // 절대 금액 대신 밴드 — PII/금액 0 원칙
});

// 수신자(SharedBudget) — RPC 성공 직후 세션 1회
trackFunnelOnce('share_open', { grade: 4, privacy_level: 'percent', has_session: false });

// 수신자 CTA
trackFunnel('share_cta_click', { cta: 'hero', grade: 4 });

// 종점(기존 signup_complete 확장) — readFirstTouch() 파라미터 귀속
trackFunnelOnce('signup_complete', { acq_source: 'share_card', acq_medium: 'viral' });
```

**퍼널 전경(발신 → 수신 → 전환)**:

```
[발신자]  Summary 열람 ─→ share_create(link/image/kakao)
                              │  (카톡·단톡방·커뮤니티 전파)
[수신자]  /shared/:token ─→ share_open ─→ share_cta_click ─→ auth_view(from=returnTo('/budget'))
                              │                                    │
                              └ 이탈(가드레일: ≤90%)                └ signup_complete(acq_source=share_card ← first-touch 귀속)
[루프]    신규 가입자가 예산 입력 → 자신의 등급 카드 획득 → 다시 share_create  (K-factor 자기증식)
```

※ **공유 유입 식별은 auth_view(from) 이 아니라 first-touch 기반(§4.2)** — Auth.tsx 의 from 은 라우터 state(returnTo) 경로라 공유 여부를 담지 않는다. auth_view 는 단순 통과 지표로만 사용하고, 퍼널 중간·종점 귀속은 `/shared/` 랜딩 시 기록된 first-touch `share_card` 로 판정한다.

### 4.2 acquisition.ts 확장 — 랜딩 path 기반 바이럴 분류

`classifySource`(:49)는 현재 UTM → referrer 도메인 → direct. 여기에 **자기도메인 랜딩 pathname 검사**를 추가(순수성 유지 위해 `pathname` 인자 주입, 기본값 `window.location.pathname`):

```
우선순위: UTM > 랜딩 pathname(/shared/→ {source:'share_card', medium:'viral'},
          /invite/→ {source:'partner_invite', medium:'viral'}) > referrer 도메인 > direct
```

- 근거: 카톡 인앱/문자 유입은 referrer가 비거나 자기도메인 처리(:71)로 전부 'direct' 오분류 — path가 유일하게 신뢰 가능한 신호.
- `SOURCE_LABELS`(:110)에 `share_card: '공유 카드'`, `partner_invite: '파트너 초대'` 추가 → Admin 유입 차트에 자동 편입.
- first-touch localStorage 계약(최초 1회 기록 :86-97)은 불변 — 기존 사용자 first-touch를 덮어쓰지 않음.
- 주의: `partner_invite`(1:1 협업 초대, `budget_invitations`/`/invite/:token`)와 `share_card`(불특정 다수 공유)는 **의도가 다른 별도 소스**로 분리 집계(혼합 시 K-factor 오염).

### 4.3 K-factor 대시보드 산식 (Admin)

- 데이터원: GA4(share_* 이벤트) + 자체(`profiles.first_source`(+ `first_referrer`, `acquisition_at`) — 기존 first-touch 귀속 파이프라인 `usePageTracking.tsx:50` 재사용. `acquisition_source` 라는 컬럼은 실존하지 않음).
- Admin KPI 위젯(P3): `i = count(share_create)/MAU`(사용자당 평균 공유 이벤트 수), `c = count(profiles where first_source='share_card', 기간)/count(share_create, 기간)`, `K = i×c = share_convert/MAU` — §1.3 정의식과 대수 동일(전 구간 이벤트 수 단위). 기간은 기존 KST 절대ms 프레임(`kst-time.ts`) 준수, 코호트 지연(공유→가입 시차) 감안해 7일 롤링.
- GA4 단독으로도 탐색 보고서에서 `share_open → share_cta_click → signup_complete(acq_source=share_card)` 퍼널 즉시 조회 가능(P1 시점의 임시 대시보드). auth_view 는 from 이 returnTo 경로라 공유 식별자로 쓰지 않는다(§2.3-4).

---

## 5. 구현 로드맵 P1–P3

### P1 — 계측 + 등급 카드 (서버·마이그레이션 불요, 즉시 배포 가능) — 예상 규모 ~6파일 / +450 LOC / 의존성 없음

| 작업 | 파일 |
|---|---|
| share_* 3종 이벤트 추가(닫힌 유니언) | `src/lib/analytics/funnel-events.ts` |
| pathname 바이럴 분류 + 라벨 | `src/lib/analytics/acquisition.ts` (+ 기존 acquisition 테스트 확장) |
| 등급 순수 함수 신규 | `src/lib/share-grade.ts` (+ 단위테스트: 경계 5등급·빈 입력·평균 초과) |
| 수신자 히어로 카드 + CTA 교체(returnTo state) + share_open/cta 계측 + `noindex` 메타(useSEO) | `src/pages/SharedBudget.tsx`, 신규 `src/components/budget/ShareGradeCard.tsx` |
| 발신자 계측(share_create) | `src/pages/Summary.tsx` (:302, :364 성공 분기에 훅) |
| `signup_complete` 파라미터 확장 | 기존 발화점(BudgetFlow 위저드 게이트) |

- P1 오라클: `tsc -b --noEmit` · `vitest run`(신규 등급/분류 테스트 포함) · `pnpm run build:ssg` · GA4 DebugView에서 3종 이벤트 실발화 확인.

### P1.5 — 카카오 공유 (서버 불요, P1 카드에 의존) — ~3파일 / +200 LOC + 카카오 콘솔 등록(사용자)

Kakao JS SDK 로드(지연 import)·앱키 도메인 등록(사용자 실행) → Summary 다이얼로그에 카카오 버튼(`sendDefault` feed + 등급 프리셋 이미지) → `scripts/generate-og-images.mjs`에 등급 카드 5종 추가(`brand/og-template.html` 변형, 800×400).

### P2 — 프라이버시 3단계 + OG 보완 (마이그레이션·Edge 필요 = 사용자 적용 게이트) — ~7파일 / +500 LOC / P1 의존

마이그레이션(`privacy_level` 컬럼+RLS UPDATE 정책) → RPC 서버측 마스킹 교체 → Summary 다이얼로그 level 선택 UI → 이미지 저장 level 존중 + 워터마크에 도메인 직접 표기. Edge Function `og-share`는 **P1 계측 데이터로 비카카오 open 비중 ≥20% 확인 시에만** 착수(조건부). 미적용 시 degrade-safe(레거시 RPC 동작 유지) 설계 필수 — 본 프로젝트 관례 준수.

### P3 — 최적화 루프 — 규모 데이터 기반 산정 / P1·P2 의존

CTA/등급 카피 A/B(GA4 파라미터 variant), Admin K-factor 위젯(`useAdminKPI` 확장), 공유 배지 게이미피케이션(`useGamificationState.appendUnlockedBadgeSlugs` 연동 — §2.1(c)), 등급 기준 상수의 `average-costs.ts` **차기** 공표치 갱신 추종 점검(2026 상반기 기준 갱신은 완료 — [CL-COST-2026Q2-20260713-231500]).

---

## 6. DoD · 리스크 · 기각 대안

### DoD (측정 가능 5)

1. `share_create/share_open/share_cta_click`이 GA4 DebugView에서 정의된 파라미터로 발화하고, 어떤 이벤트에도 토큰·절대금액·PII가 0건(파라미터 스냅샷 테스트).
2. `/shared/:token` 및 `/invite/:token` 랜딩의 first-touch가 각각 `share_card`/`partner_invite`로 분류(acquisition 단위테스트 green, 기존 UTM/referrer 케이스 회귀 0).
3. `share-grade.ts` 5등급 경계·빈 입력·평균 초과 케이스 단위테스트 green + 수신자 페이지에 등급 카드 렌더(RTL).
4. (P2) 네트워크 레벨 검증(클라 마스킹 불인정): `privacy_level='percent'` 공유의 RPC 응답 와이어에 절대 금액 필드 0건 **+ `privacy_level='hidden'` 응답 와이어에 `saving_percent`·`item_name`·`ratio` 0건(grade_meta 는 `{grade, completeness}` 만 — §2.2 계약)**.
5. 전체 스위트 green(`tsc -b --noEmit`·`vitest run`·`pnpm run build:ssg`) + 배포 2주 후 K-factor가 대시보드/GA4에서 수치로 산출됨(측정 가능화 자체가 P1의 1차 성공 조건).

### 리스크와 대응

| 리스크 | 대응 |
|---|---|
| 프라이버시 — 공유 링크로 실금액 유포(현행이 이미 전액 노출) | P2 서버측 마스킹 + **신규 기본값 `percent`**. RLS/RPC 단일 경계 원칙(클라 마스킹 금지). 기존 링크는 `full` backfill로 하위호환 |
| 어뷰징 — share_open 부풀림/토큰 무차별 대입 | open은 `trackFunnelOnce` 세션 1회 + 스크래퍼 JS 미실행으로 자연 필터. 토큰은 기존 랜덤 토큰 유지, K-factor 분모는 create 기준이라 open 조작의 지표 영향 제한 |
| SEO 중복 콘텐츠 — `/shared/*` 대량 색인 | `robots.txt Disallow: /shared/` 는 **기존 완료 확인**(`public/robots.txt:16` 에 이미 존재 — 신규 P1 작업 아님). 잔여 작업은 `SharedBudget`에 `noindex` 메타(useSEO) 추가뿐 — P1 포함. 프리렌더 대상 아님 재확인 |
| 등급 카피의 위화감(과소비/알뜰 프레임이 상처) | 등급 축을 계획력 중심으로 설계(§2.1), 평균 초과자 비난 없는 카피 — I-1 한국어 감수 게이트 |
| Kakao SDK 외부 스크립트 성능/차단 | 클릭 시 지연 import(html2canvas 패턴 :288-289 동일), 실패 시 링크 복사 폴백(분석·공유는 UX 비차단 원칙 :3) |
| Edge Function 단일 장애점(대안 A) | 기본 채택 안 함 — 데이터 게이트(비카카오 ≥20%) 통과 시에만, 그때도 apex 링크 병행 발급 |

### 기각 대안 기록

| 대안 | 기각 사유 |
|---|---|
| 무로그인 예산 테스트(수신자 즉석 계산) | **사용자 기각 확정** — 로그인 필수화 정책([CL-LOGIN-GATE]) 유지. 티저 카피까지만 허용 |
| 쿼리파람+클라 메타 주입(대안 C) | 스크래퍼 JS 미실행 → 미리보기 효과 0 |
| Edge Function을 공유 URL 기본으로(대안 A 단독) | `*.supabase.co` 도메인 노출로 클릭 신뢰 하락 + 단일 장애점. 조건부 보완재로만 |
| share_convert 전용 GA4 이벤트 | `signup_complete` + `acq_source` 파라미터로 동일 정보 획득 — 닫힌 유니언·이벤트 수 최소화 원칙 |
| 금액 노출 즉시 전면 차단(2단계: full 제거) | 부모님·플래너와 실금액 공유라는 정당한 기존 사용 사례 존재 — 3단계 선택 + 기본값 하향이 균형점 |

### 협의 필요(오픈 이슈)

- 등급 네이밍 최종안: S-1 PM + I-1 한국어 감수(§2.1 표는 제안).
- 카카오 개발자 앱키 발급·도메인 등록: 사용자 실행 항목(P1.5 게이트).
- KPI 우선순위(K vs landing_cvr 선행): S-1과 협의 — 본 설계는 P1에서 둘 다 측정 가능화하므로 착수 차단 없음.

---

**변경 로그**: 2026-07-17 검증관 적발 7건 정정(①auth `?from=shared`→returnTo state+first-touch 귀속 ②`profiles.first_source` 실컬럼 반영 ③hidden grade_meta 서버측 saving_percent 제외+DoD#4 hidden 케이스 ④K=i×c 이벤트 수 단위 통일 ⑤average-costs 2026 갱신 완료 반영 ⑥robots.txt Disallow 기존 완료 표기 ⑦배지 지급 `appendUnlockedBadgeSlugs` 경로).

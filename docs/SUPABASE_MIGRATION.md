# Supabase 완전 이전 런북 — `tnboeqtdimyxpjzsraro`(Lovable 관리) → 내 소유 새 프로젝트

> 목표: 앱의 메인 DB를 **당신 소유 새 Supabase**로 이전. 기존 구글 로그인 사용자 **무중단**(UUID·OAuth 신원 보존). 추적 `[CL-COEDIT-DBMOVE-20260620]`.

## 진행 상태 (실시간)
- **소스(이전 원본)**: `tnboeqtdimyxpjzsraro` (Lovable 관리) — 검증 끝까지 **삭제 금지**.
- **타깃(새 소유)**: `pnfjwsugsdyzyahrants` → `https://pnfjwsugsdyzyahrants.supabase.co`
  - anon(공개): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuZmp3c3Vnc2R5enlhaHJhbnRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MzA2NTAsImV4cCI6MjA5NzUwNjY1MH0.Lk6BGwhOEee251lyBYloa6FScU_Xu-pjkJFrU4CkItU`
  - 현재: email 인증 ON, **Google OAuth OFF**(Phase 4에서 추가).
- ✅ P1 새 프로젝트 생성 + 도구 준비 완료.
- ⚠️ **소스는 Lovable Cloud** → 표준 대시보드/연결문자열 **없음** → `pg_dump` 불가(`scripts/db-dump.ps1` 미사용). → **아래 "방법 V2(SQL Editor 전용)"** 로 진행.
- 데이터 규모: auth.users **258** · budgets 253 · budget_items **7,346** · checklist 4,622 · profiles 258 · ai_conv 8 · snapshots 4.

---
# 방법 V2 — Lovable Cloud(SQL Editor only) 대응

> 핵심: **스키마는 리포 마이그레이션으로 재생성**(소스 추출 불요), **데이터·인증은 SQL Editor JSON 브리지**(소스→타깃 직접, 나를 안 거침). 연결문자열·service_role 불요.

## A. 타깃 스키마 — `supabase db push` (당신 새 프로젝트, ~3분)
새 프로젝트는 당신 소유 = 풀 액세스. 프로젝트 폴더 터미널:
```powershell
npx supabase login                                  # 브라우저 인증
npx supabase link --project-ref pnfjwsugsdyzyahrants  # 새 프로젝트 DB 비번 입력
npx supabase db push                                # 리포 34개 마이그레이션 전체 적용 → 완전 스키마
```
- 에러 나면 그 텍스트 공유 → 내가 그 마이그레이션만 수정. (vector 확장 필요 시 새 프로젝트 Dashboard→Database→Extensions에서 `vector` 활성)
- 완료 후: 새 프로젝트에 모든 테이블+RLS+함수(신 accept RPC·can_edit_budget 포함)가 생김.

## B. 인증 먼저 (소스 SQL Editor → 타깃 SQL Editor) — UUID 보존
순서 중요: auth 먼저(public.profiles 가 FK 참조). 타깃은 트리거/FK 우회.
1. **소스** SQL Editor: `select json_agg(t)::text from auth.users t;` → 결과(JSON) 복사
2. **타깃** SQL Editor:
   ```sql
   set session_replication_role='replica';
   insert into auth.users select * from json_populate_recordset(null::auth.users, '〈붙여넣기〉');
   ```
3. identities 동일: 소스 `select json_agg(t)::text from auth.identities t;` → 타깃 `insert into auth.identities select * from json_populate_recordset(null::auth.identities,'…');`
   - ⚠️ auth.users 에 생성열(confirmed_at 등) 있으면 INSERT 에러 → 그때 컬럼 명시 버전으로 교체(내가 제공).

## C. public 데이터 (소스→타깃, FK 순서)
순서: profiles → budgets → budget_items → budget_snapshots → user_checklist_items → budget_collaborators → budget_invitations → ai_conversations → (기타). 각 테이블:
- 소스: `select json_agg(t)::text from public.<tbl> t;` (큰 테이블은 청크: `... from (select * from <tbl> order by id limit 2000 offset 0) t;`)
- 타깃: `insert into public.<tbl> select * from json_populate_recordset(null::public.<tbl>, '〈JSON〉') on conflict do nothing;`
- budget_items(7,346): 2000씩 4청크 / checklist(4,622): 3청크.
- 끝나면 타깃에서 `set session_replication_role='origin';`

## D. Google OAuth (타깃) — 무중단 핵심
1. 소스 Auth→Providers→Google 의 Client ID/Secret 확인(Lovable Cloud 패널) → 타깃 Auth→Providers→Google 에 **같은 값**.
2. Google Cloud Console → 그 OAuth 클라이언트 → redirect URIs 에 `https://pnfjwsugsdyzyahrants.supabase.co/auth/v1/callback` 추가.
3. 타깃 Auth→URL Config: `https://moderninsightspot.com/**` (+ 전환기 `https://wedsem.moderninsightspot.com/**`) + `http://localhost:8082/**`. ([CL-DOMAIN-PROMOTE-20260621] apex 승격)

## E. 앱·Edge 전환 (내가 코드 / 당신 시크릿)
- 앱: `vite.config.ts` URL/PUBLISHABLE_KEY → 새 프로젝트(내가 수정).
- Edge(qllsuouxeojhwgonwpqb): 함수 Secrets `SUPABASE_URL`·`SUPABASE_SERVICE_ROLE_KEY` → 새 프로젝트.
- 재빌드·검증·(push 명시 시)배포.

## F. 검증 (내가)
REST 신형식 + 행수 대조(소스 vs 타깃) + 2-유저 E2E + 기존 구글계정 로그인→데이터 그대로.

## 현 상태 / 왜
- 앱은 `VITE_SUPABASE_URL = tnboeqtdimyxpjzsraro`(Lovable Cloud 관리) 사용 — 당신 Supabase 대시보드 목록엔 없음.
- 당신 소유: `qllsuouxeojhwgonwpqb`(웨딩셈 — Edge Functions) · `baaacjbasntbcqacvfqq`(giftflow, 무관).
- 공동편집 마이그레이션이 실수로 `qllsuouxeojhwgonwpqb`에 적용됨(앱이 안 씀). → 새 소유 프로젝트로 이전 후 거기에 적용하면 깔끔히 독립.

## 무중단의 핵심
1. **UUID 보존** — `auth.users.id` 그대로 → 모든 FK(budgets.user_id 등) 유지.
2. **OAuth 신원 보존** — `auth.identities`(provider=google) 그대로 → 같은 구글 계정이 같은 유저로 매핑.
3. **같은 Google OAuth 클라이언트** 재사용 + 새 프로젝트 콜백을 Google Console에 추가.

## 사전 준비 (당신)
- **소스 접근**: Lovable → 웨딩셈 → Cloud/Database → `tnboeqtdimyxpjzsraro` Supabase 대시보드 진입 → **Settings→Database→Connection string(URI)** 와 **Settings→API→service_role** 확보.
- **Google 클라이언트**: 소스 Auth→Providers→Google 의 **Client ID/Secret** 확인(같은 값 재사용).
- **로컬 도구**: PostgreSQL 클라이언트(`psql`,`pg_dump` — Postgres 설치 또는 `scoop install postgresql`) + Supabase CLI(선택).
- ⚠️ 연결 문자열/비번/service_role 은 **당신만** 다룹니다(제가 입력 안 함). 저는 anon 키(공개)로 검증.

---

## Phase 1 — 새 프로젝트 생성 (당신, ~3분)
1. supabase.com → 당신 조직 → **New project** → 이름(예: `wedsem-prod`)·리전 **ap-northeast-2**(기존과 동일 권장)·DB 비번 설정.
2. 확보: `<NEW_REF>`, URL `https://<NEW_REF>.supabase.co`, **anon key**(공개), service_role, DB 비번.
3. 👉 **저에게 알려줄 것(비밀 아님)**: `<NEW_REF>` 와 **anon key**. (service_role·DB비번은 당신만 보관)

## Phase 2 — 소스 덤프 (당신 로컬, 비번 포함)
```bash
# 소스/타깃 연결 문자열 (대시보드 Connection string에서 복사, [PW] 치환)
SRC="postgresql://postgres:[SOURCE_PW]@db.tnboeqtdimyxpjzsraro.supabase.co:5432/postgres"

# 1) public 스키마(테이블·함수·트리거·RLS·enum)
pg_dump "$SRC" --schema-only --no-owner --no-privileges -n public -f 01_schema.sql
# 2) public 데이터 (트리거 비활성 → handle_new_user 중복생성 방지)
pg_dump "$SRC" --data-only --no-owner --disable-triggers -n public -f 02_data.sql
# 3) 인증(무중단 핵심): auth.users + identities
pg_dump "$SRC" --data-only --no-owner --disable-triggers -t auth.users -t auth.identities -f 03_auth.sql
# 4) (선택) storage 메타 — 파일이 있으면
pg_dump "$SRC" --data-only --no-owner --disable-triggers -t storage.buckets -t storage.objects -f 04_storage.sql
```

## Phase 3 — 타깃 복원 (당신 로컬)
```bash
DST="postgresql://postgres:[NEW_PW]@db.<NEW_REF>.supabase.co:5432/postgres"

psql "$DST" -v ON_ERROR_STOP=1 -f 01_schema.sql
# 데이터 복원은 트리거/FK 우회 세션으로
psql "$DST" -c "SET session_replication_role='replica';" -f 03_auth.sql   # auth 먼저(public이 FK 참조)
psql "$DST" -c "SET session_replication_role='replica';" -f 02_data.sql
# (선택) psql "$DST" -c "SET session_replication_role='replica';" -f 04_storage.sql
```
- UUID는 덤프의 명시 INSERT로 보존됨.
- storage 실제 파일은 메타만으론 부족 → 소스 Storage에서 다운로드 후 타깃에 업로드(파일 적으면 대시보드 수동, 많으면 rclone/스크립트).
- 충돌(중복 PK 등) 나면 그 테이블만 `TRUNCATE` 후 재적용하거나 에러 라인 공유 → 제가 해결.

## Phase 3.5 — 공동편집 마이그레이션 적용 (새 프로젝트, 당신 SQL Editor)
새 프로젝트는 당신이 완전 제어 → 대시보드 SQL Editor에서
`supabase/migrations/20260620120000_coedit_collaboration.sql` 전체 실행(이미 충돌-불가). "성공" 확인.

## Phase 4 — Auth/OAuth (새 프로젝트, 당신)
1. Auth → Providers → **Google 활성화** + 소스와 **같은 Client ID/Secret** 입력.
2. **Google Cloud Console** → 해당 OAuth 클라이언트 → Authorized redirect URIs에 **추가**: `https://<NEW_REF>.supabase.co/auth/v1/callback`.
3. Auth → URL Configuration → Site URL=`https://moderninsightspot.com` + Redirect URLs: `https://moderninsightspot.com/**` (+ 전환기 `https://wedsem.moderninsightspot.com/**`, dev `http://localhost:8082/**`). ([CL-DOMAIN-PROMOTE-20260621] apex 승격)

## Phase 5 — 앱 + Edge Functions 전환
- ✅ **앱(완료, [CL-DBSWITCH-20260620])**: `vite.config.ts`·`vitest.config.ts`·`index.html`(preconnect)·`e2e/helpers/auth.ts` → 새 프로젝트. 빌드 오라클로 dist 번들에 새 URL 1회·옛 URL 0 확인. tsc 0 · vitest 403 그대로.
- ✅ **누락 테이블 복구(완료)**: `supabase/migrations/20260620130000_function_call_log.sql` 추가. (옛 Lovable에만 out-of-band 존재 → 리포에 없어 db push 누락. Edge 텔레메트리용·비치명적.) → 새 프로젝트 SQL Editor에 1회 실행 or `db push`.
- ✅ **Edge Functions 통합(완료, [CL-DBSWITCH-20260620-140000])**: `src/lib/edge-function-config.ts`·`supabase/config.toml` → 새 프로젝트. **이유(중요)**: Edge 함수는 예약 `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`(이름이 `SUPABASE_`라 커스텀 덮어쓰기 **불가**)로 "배포된 그 프로젝트"에 씀. 옛 방식(qllsuouxeojhwgonwpqb에 4시크릿)은 ⓐ SUPABASE_* 덮어쓰기 불가 ⓑ verify_jwt=true 게이트가 새 토큰 거부 ⓒ AI 쓰기가 엉뚱한 DB로 감 → 폐기. **메인 DB가 자가 소유가 됐으니 Edge를 메인 프로젝트로 통합**이 정답(MAIN_* 불요).
- ⚠️ **당신(CLI+대시보드, 앱 배포보다 먼저)**:
  1. 함수 배포: `npx supabase functions deploy --project-ref pnfjwsugsdyzyahrants` (전 함수 새 프로젝트로).
  2. 새 프로젝트 → Edge Functions → Secrets에 **커스텀만** 추가(예약 `SUPABASE_*`·`MAIN_*` 불필요):
     `OPENAI_API_KEY`(필수) · `CRON_SECRET` · `ENVIRONMENT`(예: production) · `DEV_CREATE_USER_TOKEN` · (선택)`ADMIN_USER_IDS`.
- ⚠️ **CI(crawl) GitHub Secrets**: `.github/workflows/crawl-pipeline.yml` 의 `SUPABASE_URL`·`SUPABASE_SERVICE_ROLE_KEY` → 새 프로젝트(크롤 쓸 때만).
- 재빌드(`npm run build:csr` 검증 완료) · push/배포는 당신 명시 시.

## Phase 5.5 — 새 프로젝트 스키마 적용 검증 (당신 SQL Editor, 컷오버 전 필수)
적대검증 결론: 코드는 충분하나 **공동편집/실시간이 마이그레이션 미적용 시 조용히 죽음**(오너 세션은 멀쩡해 보임). 새 프로젝트에서:
```sql
-- ① 실시간 publication (2행 기대)
select tablename from pg_publication_tables where pubname='supabase_realtime' and tablename in ('budget_items','budgets');
-- ② REPLICA IDENTITY FULL ('f' 기대)
select relname, relreplident from pg_class where relname in ('budget_items','budgets');
-- ③ 핵심 RPC (2행 기대)
select proname from pg_proc where proname in ('accept_budget_invitation','can_edit_budget','has_role','match_knowledge');
-- ④ 누락 테이블 복구 확인
select to_regclass('public.function_call_log'), to_regclass('public.knowledge_embeddings'), to_regclass('public.crawl_sources');
```
하나라도 누락 시 해당 마이그레이션을 SQL Editor에서 실행(전부 멱등): `20260620120000_coedit_collaboration.sql`(실시간·accept·can_edit), `20260228100000_add_vector_search.sql`(RAG·vector), `20260620130000_function_call_log.sql`.

## Phase 6 — 검증 (제가)
- REST: accept RPC 신형식 `{ok:..}` + can_edit_budget 존재(새 프로젝트 anon으로).
- dev 서버를 새 프로젝트로 향하게 → **2-유저 E2E(C1~C4)** 실행 → 실시간·충돌0·권한.
- 기존 구글 계정 로그인 → 데이터 그대로 → 무중단 확인.
- 앱 오라클: tsc 0 · vitest 403 · build green.

## 컷오버 / 무손실
- 이전~전환 사이 들어온 쓰기 유실 방지: 트래픽 적은 시간에 덤프→복원→전환을 짧게. (출시 전 개인앱이라 영향 미미.)
- 안전망: 소스(tnboeqtdimyxpjzsraro)는 전환 검증 끝까지 **삭제 금지**(롤백 가능하게 유지).

## 리스크
- 🔴 **auth 복원 충돌**(GoTrue 스키마 버전차·트리거) → `session_replication_role=replica` 로 우회. 에러 시 라인 공유.
- 🔴 **OAuth 콜백 누락** → 구글 로그인 깨짐. Phase 4-2 필수.
- Edge Functions 시크릿 미갱신 → AI/dev로그인 등 기능 일부 실패.
- storage 파일 누락 → 이미지 깨짐(쓰면).

---
### 진행 체크리스트
- [ ] P1 새 프로젝트 + ref/anon 공유
- [ ] P2 덤프 4파일
- [ ] P3 복원
- [ ] P3.5 공동편집 마이그레이션
- [ ] P4 Google OAuth
- [ ] P5 앱/Edge 전환
- [ ] P6 검증(2-유저 E2E)

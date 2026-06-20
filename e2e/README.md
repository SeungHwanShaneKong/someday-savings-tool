# E2E (Playwright) — 웨딩셈 공동편집 검증

`[CL-COEDIT-E2E-20260620-130000]` 실제 Supabase + dev 서버 기준 end-to-end 스위트.
앱 `tsc`/`vitest` 와 **격리**(루트 tsconfig·vitest 가 `src/` 만 포함). 설치 전까지 앱 빌드/테스트에 영향 없음.

## 설치 (1회)
```bash
npm i -D @playwright/test
npx playwright install chromium
```
> 설치하면 `playwright.config.ts`·`e2e/**` 의 `@playwright/test` 타입이 해소됩니다(현재 미설치 경고는 정상).

## 실행
```bash
npm run test:e2e          # 헤드리스 (스크린샷 자동 — config screenshot:'on')
npm run test:e2e:ui       # Playwright UI 모드(디버깅)
npm run test:e2e:report   # 마지막 HTML 리포트 열기
```
산출물: `e2e/.report`(HTML), `e2e/.artifacts`(스크린샷·trace·video).

## 두 갈래

### 1) `personal.spec.ts` — 마이그레이션 **불요**, 지금 바로 통과
개인편집·모드분리·초대링크 생성·updateItem(2b)·요약·AcceptInvite 에러 분기.
오너 로그인은 `Auth.tsx` 의 **Dev 테스트 로그인**(`import.meta.env.DEV`) 사용 → dev 서버(`npm run dev`)에서만 노출.
전제: 원격 Supabase 에 `dev-create-user` Edge Function 배포 또는 `dev-test@wedsem-local.dev` 계정 존재(라이브 검증서 확인됨).

### 2) `collaboration.spec.ts` — ★마이그레이션 **필수**, 환경변수로 활성화
2-유저 실시간·충돌 0·권한 경계. 게이트:
```bash
# 선행: SQL Editor 에서 20260620120000_coedit_collaboration.sql 적용
E2E_MIGRATION_APPLIED=1 \
E2E_SUPABASE_ANON_KEY=<publishable_anon_key> \
E2E_PARTNER_EMAIL=dev-partner@wedsem-local.dev \
E2E_PARTNER_PASSWORD=devpartner123456 \
npm run test:e2e -- collaboration.spec.ts
```
- `E2E_MIGRATION_APPLIED` 미설정 시 전체 **skip**(오라클 green 유지).
- 파트너 컨텍스트는 REST password grant 로 세션을 만들어 `localStorage['sb-<ref>-auth-token']` 주입(`helpers/auth.ts`). `dev-create-user` 가 파트너 계정을 멱등 생성.
- 세션 주입 형식이 supabase-js 버전과 다르면 `page.evaluate(supabase.auth.setSession)` 폴백 권장(주석 참조).

## 환경변수 (기본값 = 라이브 검증 상수)
| 변수 | 기본 | 용도 |
|---|---|---|
| `E2E_SUPABASE_URL` | `https://tnboeqtdimyxpjzsraro.supabase.co` | REST/Edge 호출 |
| `E2E_SUPABASE_REF` | `tnboeqtdimyxpjzsraro` | 세션 storage 키 |
| `E2E_SUPABASE_ANON_KEY` | (없음) | 파트너 REST 로그인 — 미설정 시 2-유저 스킵 |
| `E2E_OWNER_EMAIL/PASSWORD` | `dev-test@wedsem-local.dev` / `devtest123456` | 오너 |
| `E2E_PARTNER_EMAIL/PASSWORD` | `dev-partner@wedsem-local.dev` / `devpartner123456` | 파트너 |
| `E2E_MIGRATION_APPLIED` | (없음) | `1` 이면 2-유저 스위트 활성 |

## 라이브 사전검증 완료(2026-06-20, preview 도구)
P1~P10 흐름은 실제 브라우저로 1차 확인됨: dev 로그인→/budget, union 로딩(`budget_collaborators 200`), 모드 분리(누수 0),
초대 생성(`budget_invitations 201`), updateItem(`PATCH …&select=* 200`·영속), 요약 렌더, 콘솔/Supabase 에러 0.
2-유저 실시간·accept RPC 정확분기는 마이그레이션 적용 후 `collaboration.spec.ts` 로 검증.

# 파트너 이메일 발송 완전 구현 — 원샷 마법사·멱등 SQL·가이드 + 템플릿 브랜드 정렬

- **일자**: 2026-07-11 / **추적 ID**: `CL-EMAIL-SETUP-20260711-211500`
- **요청**: "실제로 이메일 발송하는 것까지 완벽하게 구현" — 코드는 완성 상태였고 서버 구성(Resend·시크릿·마이그·배포)만 미완. 계정·API 키·DNS 는 정책상 사용자 전용 → 그 외 전부 자동화.

## 실측 진단(착수 시점)
- Resend DNS(DKIM/SPF/MX) **전무** = 도메인 인증 시작 전 → 발송 0 의 근본 원인.
- Supabase CLI: 미설치(사용자 터미널) + **이 머신은 다른 계정으로 로그인돼 프로젝트 접근 불가**(마법사가 적발하도록 설계).
- 마이그 2개 로컬 존재(원격 적용 여부 불명 → 멱등 SQL 로 안전 처리).

## 산출물
1. `scripts/setup-partner-email.ps1` — 6단계 마법사(-Check 진단 모드). 시크릿은 SecureString 숨김 입력→임시 env 파일(--env-file)→즉시 삭제(키 화면/명령행 노출 0). 배포는 --use-api 폴백.
2. `scripts/partner-email-setup.sql` — 마이그 110000+130000 원문 합본(완전 멱등, SQL Editor 1회 붙여넣기).
3. `docs/partner-email-setup.md` — 비전문가 STEP 1~3 + 증상→원인 표(Edge skip 분기 1:1).
4. `notify-logic.ts` 이메일 2종 브랜드 v5 정렬(#FDF2F4 블러시·CTA #DB2E66, 흰 글자 명암비 4.57:1 — 구 #3b82f6 은 3.68 로 WCAG 미달이었음 = 접근성 개선 겸).

## 검증
- tsc -b 0 · notify-logic 24/24 · **전체 1867×3 green** · -Check 실측 exit 0(3회) · PSParser 파스 에러 0.
- research-scout 공식 문서 교차검증: Resend DKIM 은 계정별 TXT 1개 또는 CNAME 3개(사전 단정 금지 — 대시보드 표시값이 정답), `--use-api`·`secrets set --env-file` 공식 유효, `SUPABASE_ACCESS_TOKEN` env 지원.
- 4렌즈 적대 워크플로(PS5.1·SQL 등가/멱등·Edge 계약 정합·템플릿 회귀) **GO** — minor 3건 적발·전부 근본수정:
  ① CNAME 분기가 MX 속성(NameExchange)으로 필터해 죽은 분기 → 타입별 속성(NameHost) 분기 + 실존 CNAME 으로 실증.
  ② 로그인 감지 토큰파일 휴리스틱 false-negative → `projects list` 실측 + **프로젝트 접근권한까지** 확인(다른 계정 로그인 적발 — 이 머신에서 실제 재현).
  ③ 트러블슈팅 오배선: '보낼 수 없어요'=시크릿/SQL 미반영, '실패했어요'=Resend 미Verified(403) — 교차 수정.

## 교훈
- **CLI 도구 상태는 토큰 파일 추측이 아니라 CLI 자체 실행이 권위**(로그인≠프로젝트 접근 — 둘 다 확인).
- **Resolve-DnsName 값 속성은 타입별**(TXT=Strings, MX=NameExchange, CNAME=NameHost) — else 로 뭉개면 죽은 분기.
- 외부 서비스(Resend) 절차는 문서 간 상충 가능(DKIM TXT vs CNAME×3) → **대시보드 실시간 표시값을 정답으로 안내**하고 스크립트는 참고 표시로 강등.
- PS 5.1 + 한글 = **UTF-8 BOM 필수**(무 BOM 이면 ANSI 로 읽어 모지바케).

## 잔여(사용자 — docs/partner-email-setup.md)
STEP 1: Resend 가입→도메인 추가→가비아 DNS→Verified→API 키. STEP 2: 마법사 실행(재로그인은 프로젝트 소유 계정으로). 이후 콕찌르기 클릭 → 파트너 메일 실착.

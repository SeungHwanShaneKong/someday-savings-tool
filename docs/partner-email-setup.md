# 파트너 이메일 알림(콕찌르기) 켜기 — 비전문가용 가이드

> **왜 필요한가요?** 앱의 "콕 찌르기"·"파트너 편집 알림"은 이메일로 전달됩니다.
> 이메일 발송 서버(Resend)와 우리 도메인을 연결하는 **1회성 설정**을 해야 실제 메일이 나갑니다.
> 코드는 전부 준비돼 있고, 아래 STEP 1(계정·도메인)만 사람 손이 필요합니다. 총 20~30분(+DNS 대기).

---

## STEP 1. Resend 가입 + 도메인 인증 (사람만 할 수 있는 유일한 부분)

1. **https://resend.com** 접속 → 무료 가입(구글 로그인 가능)
2. 왼쪽 메뉴 **Domains → Add Domain** → `moderninsightspot.com` 입력
   - Region은 기본값 그대로 두면 됩니다.
3. 화면에 **추가하라는 DNS 레코드들**이 표(Type / Name / Value)로 나옵니다. 대표적인 예:
   | Type | Name(호스트) | Value(값) |
   |---|---|---|
   | MX  | `send` | `feedback-smtp.….amazonses.com` (우선순위 10) |
   | TXT | `send` | `v=spf1 include:amazonses.com ~all` |
   | TXT 또는 CNAME | `…._domainkey` | DKIM 값(계정에 따라 TXT 1개 또는 CNAME 3개) |
   - ⚠️ **개수·타입·값 전부 Resend 화면에 표시된 것을 그대로 복사**하는 것이 유일한 정답입니다
     (리전·계정 생성 시점에 따라 DKIM 형태가 다릅니다 — 위 표는 예시일 뿐).
4. **가비아(gabia.com)** 로그인 → My가비아 → 도메인 관리 → `moderninsightspot.com` → **DNS 관리(레코드 설정)** → 위 레코드들을 그대로 추가
   - 가비아의 "호스트" 칸에는 Resend 의 Name 그대로: `send`, `resend._domainkey`
   - TXT 값은 따옴표 없이 붙여넣기, MX는 우선순위 `10`
5. Resend 화면으로 돌아와 **Verify** 클릭 → 상태가 **Verified**(초록)가 될 때까지 대기
   - 보통 수분~1시간, 최대 하루. Verified 전에는 발송이 거부되므로 꼭 기다리세요.
6. Verified 확인 후: 왼쪽 **API Keys → Create API key** → 이름 아무거나 → **키 복사**(`re_` 로 시작, 한 번만 보임)

## STEP 2. 나머지는 마법사가 자동으로

프로젝트 폴더에서 PowerShell 을 열고:

```powershell
cd C:\Users\shane\Documents\analytics\wedding-budget-buddy_new
powershell -ExecutionPolicy Bypass -File scripts\setup-partner-email.ps1
```

마법사가 순서대로 진행합니다(각 단계에서 안내가 나옵니다):
1. **진단** — DNS·도구 상태 확인
2. **Supabase 로그인** — 브라우저가 열리면 Authorize 클릭
3. **DB 준비** — SQL이 클립보드에 자동 복사됨 → 열리는 SQL Editor에 붙여넣고 **Run** (이미 적용돼 있어도 안전한 멱등 SQL)
4. **시크릿 등록** — STEP 1-6에서 복사한 키를 붙여넣기(화면에 표시되지 않음)
5. **함수 배포** — 자동
6. **최종 검증** — 자동 확인 후 테스트 방법 안내

> 설정 전 상태만 보고 싶으면: `powershell -ExecutionPolicy Bypass -File scripts\setup-partner-email.ps1 -Check`

## STEP 3. 진짜 나가는지 확인

1. 앱(https://moderninsightspot.com/budget) **새로고침** → "콕 찌르기" 버튼이 활성화됨
2. 클릭 → **"콕! 찔렀어요 💌"** 토스트 → 파트너 메일함(스팸함 포함) 확인
3. 발송 기록: **https://resend.com/emails** / 서버 로그: Supabase 대시보드 → Edge Functions → notify-partner → Logs

## 문제가 생기면 (증상 → 원인)

| 앱 토스트 / 로그 | 원인 | 해결 |
|---|---|---|
| "지금은 알림을 보낼 수 없어요" + 로그 `no_provider` | API 키 미등록 | 마법사 [4/6] 다시 |
| 〃 + 로그 `no_sender_domain` | NOTIFY_FROM 미등록 | 마법사 [4/6] 다시 |
| 〃 + 로그 `schema_not_ready` | DB SQL 미실행 | 마법사 [3/6] 다시 |
| 토스트는 실패 + 로그 `resend error 403` | Resend 도메인 **미Verified** | STEP 1-5 대기 후 재시도(슬롯 자동 회수됨) |
| "오늘은 이미 콕 찔렀어요" | 정상(하루 1회 제한) | 내일 다시 |

## 참고(설계 메모)

- 시크릿 2개: `RESEND_API_KEY`, `NOTIFY_FROM=웨딩셈 <noreply@moderninsightspot.com>` — 코드/저장소에는 절대 커밋하지 않음
- 발송 상한: 페어당 하루 1회(콕찌르기·자동알림 각각) + 전체 하루 100통 캡
- 자세한 활성화 순서·주의는 `.claude/rules/deployment.md`(notify-partner 섹션), DB SQL 은 `scripts/partner-email-setup.sql`
- (선택·권장) 스팸함 유입을 줄이려면 가비아에 DMARC TXT 추가: 호스트 `_dmarc`, 값 `v=DMARC1; p=none;`

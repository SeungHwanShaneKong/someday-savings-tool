# 콕찌르기 '발송 불가(서버 미구성)' 반복 실패 방지 — 세션 비활성 개선

- **일자**: 2026-07-11
- **트리거**: 사용자 첨부 화면 2장 — (1) 모바일에서 '콕 찌르기' 클릭 시 `지금은 알림을 보낼 수 없어요 / 준비가 끝나면 다시 열릴 거예요` 반복, (2) 터미널 `supabase functions deploy notify-partner` → `supabase 용어가 인식되지 않습니다`(CLI 미설치).
- **추적 ID**: `CL-POKE-UNAVAIL-20260711-204500`

## [발생 원인 — 기술적 내용 — 해결책]

### 발생 원인
파트너 이메일 알림 백엔드가 **서버에 미구성**. notify-partner Edge 가 `no_provider`(RESEND_API_KEY 없음) / `no_sender_domain`(발신 도메인 미인증=샌드박스) / `schema_not_ready`(partner_notifications 마이그 미적용) 중 하나로 skip 응답 → `mapPokeOutcome` 이 `type:'unavailable'` 로 매핑해 '보낼 수 없어요' 토스트. **앱·버튼·코드는 정상**(설계된 degrade). 다만 버튼이 계속 활성이라 매 클릭 같은 실패 반복.

### 기술적 내용 (개선)
`usePoke` 에 서버 전역 '발송 불가' 상태 추가:
- 모듈 레벨 pub-sub `unavailableListeners` + `broadcastUnavailable()`(쿨다운 브로드캐스트 패턴 복제, 단 **페어 무관 전역** — 미구성은 모든 페어 공통).
- `poke()` 에서 `outcome.type==='unavailable'` 시 broadcast → 세션 내 마운트된 모든 인스턴스 즉시 비활성.
- 쿨다운(localStorage 24h 지속·페어 스코프)과 달리 **세션 휘발** → 백엔드 구성 후 새로고침 시 초기화·재확인.
- PokeButton: `disabled = onCooldown || unavailable`, unavailable 시 `이메일 알림 준비 중이에요 🛠️`(쿨다운 `내일 다시 ⏰` 와 별개·우선). PokeNudgeCard CTA 도 unavailable 시 disabled.
- 쿨다운 미기록·보상 없음(발송 불가 ≠ 슬롯 소진).

### 검증 (prove-first + 독립)
- 소스 3파일 stash(테스트 유지) → UP.9/UP.10/PK.7 **RED**(기존 26 green) → 복원 → 29 GREEN.
- `tsc -b --noEmit` 0(`--force` 포함) · vitest 1867 × 3회 결정론 · build:ssg 36라우트.
- 독립 skeptical-verifier **GO**(오염·false-green·회귀·엣지·타입 5축, 확정 결함 0). 오염 원천봉쇄 근거: vitest `isolate` 기본 true(파일별 모듈 레지스트리 리셋 → Set 파일마다 신규) + 신규 테스트가 poke **전** `unavailable===false` 선단언.

## 교훈 (lessons)
- **degrade 는 '무음'이 최선이 아니다** — 서버 미구성 같은 **지속적 실패 상태**는 UX 상 반복 클릭→반복 실패를 낳는다. 세션 전역 비활성 + '준비 중' 안내로 정직 전환하는 것이 낫다.
- **상태의 스코프·수명을 구분하라**: 쿨다운(페어 스코프·24h 지속) vs 미구성(전역·세션 휘발). 같은 pub-sub 패턴이라도 스코프·초기화 경로가 다르다.
- **일시 실패는 락하지 않는다**: 네트워크 오류(`type:'error'`)·`global_capped` 는 unavailable 로 분류하지 않아 세션 잠금 대상 아님 — 재시도 허용 유지.

## 잔여 (사용자 몫 — 실제 '발송' 활성화)
이 개선은 발송을 활성화하지 **않는다**. 실제 메일 발송은 서버 구성 필요(순서=`.claude/rules/deployment.md` notify-partner 활성화 순서):
1. partner_notifications 마이그 적용(20260624110000 → 130000)
2. Resend 도메인(`moderninsightspot.com`) SPF/DKIM 인증 → `NOTIFY_FROM` 시크릿
3. `RESEND_API_KEY` 시크릿 + `supabase functions deploy notify-partner`
- CLI 미설치 → `npx supabase ...` 로 무설치 실행 가능.
- 정확한 skip 사유는 Supabase 대시보드 Edge Functions → notify-partner → Logs 에서 `skipped:'...'` 확인.

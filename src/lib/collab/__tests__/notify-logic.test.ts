// [CL-VULN-EDGE-20260624] notify-partner Edge 핵심 로직(순수) 검증 — V2/V4/V5/V10.
//  Deno/실DB 는 이 환경서 실행 불가 → Edge 의 결정·살균 로직을 Deno-비종속 순수 모듈로 추출해 vitest 로 입증.
//  (실 동시성/유니크 제약·실발송은 마이그레이션 적용 + 배포 후 사용자 라이브 검증.)
import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  sanitizeHeaderText,
  sanitizeSenderName,
  buildSubject,
  buildEmailHtml,
  coerceBudgetId,
  decideSend,
  DailyReservationLedger,
  checkThenActAllowsSend,
  keepReservationOnSendFailure,
  isUnverifiedSharedSender,
  isConfigErrorStatus,
  mapReserveError,
} from '../../../../supabase/functions/_shared/notify-logic';

describe('notify-logic V2 — 레이트리밋 원자성(TOCTOU)', () => {
  it('V2.bug 구(count-then-act): 동시 두 호출이 같은 count=0 을 보면 둘 다 발송 허용(중복)', () => {
    // 두 동시 요청이 insert 이전에 각각 pairCount=0 을 관측 → 둘 다 send (이게 버그)
    expect(checkThenActAllowsSend(0)).toBe(true);
    expect(checkThenActAllowsSend(0)).toBe(true); // 같은 스냅샷 → 둘 다 true = 이중 발송
  });

  it('V2.fix atomic claim: (sender,recipient,day) 예약은 첫 1회만 성공, 동시/연속 재시도는 거부', () => {
    const ledger = new DailyReservationLedger();
    expect(ledger.tryReserve('s1', 'r1', '2026-06-24')).toBe(true);  // 예약 성공 → 발송 진행
    expect(ledger.tryReserve('s1', 'r1', '2026-06-24')).toBe(false); // 같은 날 재시도 → rate_limited
    expect(ledger.tryReserve('s1', 'r1', '2026-06-24')).toBe(false); // N회 더 시도해도 거부(다탭/봇/재시도 무력화)
    // 다른 페어·다른 날은 독립적으로 허용
    expect(ledger.tryReserve('s1', 'r2', '2026-06-24')).toBe(true);
    expect(ledger.tryReserve('s1', 'r1', '2026-06-25')).toBe(true);
  });

  it('V2 decideSend: 글로벌 캡 도달 시 global_capped(예약보다 우선), 신규 예약+캡 미만이면 send', () => {
    expect(decideSend({ reservedNew: true, globalCountToday: 100, globalCap: 100 })).toBe('global_capped');
    expect(decideSend({ reservedNew: false, globalCountToday: 0, globalCap: 100 })).toBe('rate_limited');
    expect(decideSend({ reservedNew: true, globalCountToday: 5, globalCap: 100 })).toBe('send');
  });
});

describe('notify-logic R6-B — 발신자 도메인 인증 가드(샌드박스 발송 차단)', () => {
  it('미설정/샌드박스(@resend.dev) 발신자는 미인증 → true(발송 금지)', () => {
    expect(isUnverifiedSharedSender('웨딩셈 <onboarding@resend.dev>')).toBe(true);
    expect(isUnverifiedSharedSender('x@mail.resend.dev')).toBe(true);
    expect(isUnverifiedSharedSender(undefined)).toBe(true);
    expect(isUnverifiedSharedSender('')).toBe(true);
    expect(isUnverifiedSharedSender('   ')).toBe(true);
  });
  it('검증된 커스텀 도메인은 false(발송 허용)', () => {
    expect(isUnverifiedSharedSender('웨딩셈 <noreply@moderninsightspot.com>')).toBe(false);
    expect(isUnverifiedSharedSender('noreply@moderninsightspot.com')).toBe(false);
  });
  it('isConfigErrorStatus: 403/422 만 설정성(슬롯 회수), 5xx/429 는 일시적(보존)', () => {
    expect(isConfigErrorStatus(403)).toBe(true);
    expect(isConfigErrorStatus(422)).toBe(true);
    expect(isConfigErrorStatus(500)).toBe(false);
    expect(isConfigErrorStatus(429)).toBe(false);
  });
});

describe('notify-logic R6-E — reserve 에러 매핑(스키마 미준비 degrade)', () => {
  it('23505→rate_limited, 42703/42P01→schema_not_ready, 그 외→reserve_failed', () => {
    expect(mapReserveError('23505')).toBe('rate_limited');
    expect(mapReserveError('42703')).toBe('schema_not_ready');
    expect(mapReserveError('42P01')).toBe('schema_not_ready');
    expect(mapReserveError('XX000')).toBe('reserve_failed');
    expect(mapReserveError(undefined)).toBe('reserve_failed');
    expect(mapReserveError(null)).toBe('reserve_failed');
  });
});

describe('notify-logic V5 — 발송 실패 시 재시도 폭주 방지(fail-closed)', () => {
  it('V5 발송 실패해도 예약 행을 유지(레이트리밋 소진) → 같은 날 재발송 루프 차단', () => {
    expect(keepReservationOnSendFailure()).toBe(true);
    // 예약 후(발송 성공/실패 무관) 같은 날 재시도는 거부됨 = 무한 재시도 불가
    const ledger = new DailyReservationLedger();
    expect(ledger.tryReserve('s1', 'r1', '2026-06-24')).toBe(true);  // 1차: 예약 → 발송 시도(실패 가정)
    expect(ledger.tryReserve('s1', 'r1', '2026-06-24')).toBe(false); // 2차: 실패해도 예약 잔존 → 거부
  });
});

describe('notify-logic V4 — budgetId 검증(임의 UUID 기록 차단)', () => {
  it('V4 UUID 형식만 통과, 그 외(비-UUID/숫자/객체/빈값)는 null 로 강등', () => {
    expect(coerceBudgetId('3f2504e0-4f89-41d3-9a0c-0305e82c3301')).toBe('3f2504e0-4f89-41d3-9a0c-0305e82c3301');
    expect(coerceBudgetId('not-a-uuid')).toBeNull();
    expect(coerceBudgetId("1; DROP TABLE budgets;--")).toBeNull();
    expect(coerceBudgetId(12345 as unknown)).toBeNull();
    expect(coerceBudgetId(null)).toBeNull();
    expect(coerceBudgetId(undefined)).toBeNull();
    expect(coerceBudgetId('')).toBeNull();
  });
});

describe('notify-logic V10 — 이메일 제목/본문 살균(피싱/인젝션 차단)', () => {
  it('V10 escapeHtml: & < > " \' 5종 모두 엔티티화(raw 특수문자 0건)', () => {
    const out = escapeHtml(`<script>alert("x")&'y'</script>`);
    expect(out).not.toMatch(/[<>]/);          // 꺾쇠 0건
    expect(out).not.toContain('"');           // 쌍따옴표 0건
    expect(out).not.toContain("'");           // 홑따옴표 0건
    expect(out).toContain('&lt;');
    expect(out).toContain('&gt;');
    expect(out).toContain('&quot;');
    expect(out).toContain('&#39;');
    expect(out).toContain('&amp;');
  });

  it('V10 sanitizeHeaderText: 제어문자/개행 제거 + 길이 상한', () => {
    expect(sanitizeHeaderText('a\r\nb\tc')).toBe('abc');     // CRLF/탭 제거
    expect(sanitizeHeaderText('  trimmed  ')).toBe('trimmed');
    expect(sanitizeHeaderText('x'.repeat(200), 60).length).toBe(60);
    expect(sanitizeHeaderText(null)).toBe('');
  });

  it('V10 sanitizeSenderName: 빈/제어값 → 폴백, 40자 상한', () => {
    expect(sanitizeSenderName('  ')).toBe('파트너');
    expect(sanitizeSenderName(null)).toBe('파트너');
    expect(sanitizeSenderName('홍길동')).toBe('홍길동');
    expect(sanitizeSenderName('가'.repeat(100)).length).toBe(40);
  });

  it('V10 buildSubject: 제어문자 없는 단일 라인 + 발신자 살균', () => {
    const subj = buildSubject('[긴급]결제실패\r\nhttps://evil');
    expect(subj).not.toMatch(/[\r\n]/);       // 개행 주입 차단(헤더 안전)
    expect(subj).toContain('결혼 예산');
  });

  it('V10 buildEmailHtml: 발신자 이름의 태그/따옴표가 본문에 raw 로 들어가지 않음', () => {
    const html = buildEmailHtml('"><img src=x onerror=alert(1)>', 'https://moderninsightspot.com/budget');
    expect(html).not.toContain('<img');        // 주입 태그 raw 0건(실행 불가)
    expect(html).not.toContain('"><img');      // 속성 컨텍스트 탈출 시퀀스 raw 0건(따옴표 엔티티화)
    expect(html).toContain('&lt;img');         // 꺾쇠 엔티티화 → 텍스트로만 표시(무해)
    expect(html).toContain('&quot;&gt;&lt;img'); // 주입 페이로드 전체가 엔티티화됨
  });
});

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
  // [CL-POKE-20260709-231909] 콕 찌르기 — kind 허용목록 + kind별 제목/본문
  NOTIFY_KINDS,
  coerceKind,
  subjectForKind,
  htmlForKind,
  buildPokeEmailHtml,
  // [CL-EMAIL-SPAM-20260718-100000] 스팸 저감 — text/plain 대체본 + List-Unsubscribe mailto
  buildEmailText,
  buildPokeEmailText,
  textForKind,
  unsubscribeMailto,
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

  // [CL-AUDIT6-DEF-20260710] 방어 심화(감사 A 지목) — 익스플로잇 경로는 없으나 cosmetic 결함 근본차단.
  it('V10-A U+2028/U+2029(줄·문단 구분자) 제거 — 제목이 여러 줄로 렌더되지 않음', () => {
    expect(sanitizeHeaderText('a b c')).toBe('abc');
    // 실렌더 검증: 결과 문자열에 줄/문단 구분자 코드포인트 0
    for (const ch of sanitizeHeaderText('앞 뒤 끝')) {
      expect(ch.codePointAt(0)).not.toBe(0x2028);
      expect(ch.codePointAt(0)).not.toBe(0x2029);
    }
  });

  it('V10-B 서로게이트 페어(이모지) 경계 절단 없음 — 깨진 문자(단독 서로게이트) 미발생', () => {
    // 💍(U+1F48D)은 UTF-16 2코드유닛. maxLen=3 경계에 이모지가 걸쳐도 온전 문자만 남아야 함.
    const out = sanitizeHeaderText('ab💍cd', 3); // 코드포인트 기준 3자: a,b,💍
    expect([...out]).toEqual(['a', 'b', '💍']);
    // 깨진 단독 서로게이트(0xD800–0xDFFF) 잔존 0
    for (let i = 0; i < out.length; i++) {
      const code = out.charCodeAt(i);
      const isLoneSurrogate =
        (code >= 0xd800 && code <= 0xdbff && !(out.charCodeAt(i + 1) >= 0xdc00 && out.charCodeAt(i + 1) <= 0xdfff)) ||
        (code >= 0xdc00 && code <= 0xdfff && !(out.charCodeAt(i - 1) >= 0xd800 && out.charCodeAt(i - 1) <= 0xdbff));
      expect(isLoneSurrogate).toBe(false);
    }
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

// [CL-POKE-20260709-231909] 콕 찌르기 — kind 허용목록·전용 템플릿·독립 일일 슬롯
describe('notify-logic POKE — kind 허용목록(coerceKind)', () => {
  it('허용목록: partner_edit_2min·poke 정확히 2종', () => {
    expect([...NOTIFY_KINDS]).toEqual(['partner_edit_2min', 'poke']);
  });

  it('coerceKind: 허용값은 그대로 통과', () => {
    expect(coerceKind('poke')).toBe('poke');
    expect(coerceKind('partner_edit_2min')).toBe('partner_edit_2min');
  });

  it('coerceKind: 목록 외/비문자열(undefined·null·숫자·객체·garbage)은 기본값으로 강등', () => {
    expect(coerceKind(undefined)).toBe('partner_edit_2min');
    expect(coerceKind(null)).toBe('partner_edit_2min');
    expect(coerceKind('POKE')).toBe('partner_edit_2min');            // 대소문자 완전 일치만
    expect(coerceKind('poke; DROP TABLE x;--')).toBe('partner_edit_2min');
    expect(coerceKind(123 as unknown)).toBe('partner_edit_2min');
    expect(coerceKind({} as unknown)).toBe('partner_edit_2min');
  });
});

describe('notify-logic POKE — 제목/본문 살균(기존 살균 계약 재사용)', () => {
  it('poke 제목: 개행/제어문자 주입이 제거된 단일 라인(헤더 안전) + 전용 카피', () => {
    const subj = subjectForKind('poke', '[긴급]결제실패\r\nhttps://evil');
    expect(subj).not.toMatch(/[\r\n]/);                 // 헤더 개행 주입 차단
    expect(subj).toContain('콕!');                      // poke 전용 카피
    expect(subj).toContain('예산 보러 오라고');
  });

  it('poke 제목: 빈/제어 발신자명은 폴백(파트너)', () => {
    expect(subjectForKind('poke', '  ')).toContain('파트너님이 콕!');
    expect(subjectForKind('poke', null)).toContain('파트너님이 콕!');
  });

  it('poke 본문: <script>/속성탈출 페이로드가 raw 로 들어가지 않음(escapeHtml 재사용)', () => {
    const html = buildPokeEmailHtml('"><script>alert(1)</script>', 'https://moderninsightspot.com/budget');
    expect(html).not.toContain('<script');              // 주입 태그 raw 0건
    expect(html).not.toContain('"><script');            // 속성 탈출 raw 0건
    expect(html).toContain('&lt;script');               // 엔티티화 → 텍스트로만 표시
    expect(html).toContain('우리 예산 보러 가기');       // 기존 CTA 버튼 보존
    expect(html).toContain('하루 한 번만 보내드려요');    // 기존 푸터 보존
    expect(html).toContain('https://moderninsightspot.com/budget'); // CTA href
  });

  it('htmlForKind/subjectForKind: 기존 kind 는 buildEmailHtml/buildSubject 와 바이트 동일(회귀 0)', () => {
    const name = '홍길동';
    const url = 'https://moderninsightspot.com/budget';
    expect(htmlForKind('partner_edit_2min', name, url)).toBe(buildEmailHtml(name, url));
    expect(subjectForKind('partner_edit_2min', name)).toBe(buildSubject(name));
    // poke 는 전용 템플릿(기존과 다른 카피)
    expect(htmlForKind('poke', name, url)).toBe(buildPokeEmailHtml(name, url));
    expect(htmlForKind('poke', name, url)).not.toBe(buildEmailHtml(name, url));
  });
});

describe('notify-logic POKE — kind 독립 일일 슬롯(유니크 키에 kind 포함)', () => {
  it('같은 페어·같은 날: partner_edit_2min 과 poke 는 각자 1회씩 허용, 2번째 poke 는 거부', () => {
    const ledger = new DailyReservationLedger();
    expect(ledger.tryReserve('s1', 'r1', '2026-07-09', 'partner_edit_2min')).toBe(true); // 자동 넛지 슬롯
    expect(ledger.tryReserve('s1', 'r1', '2026-07-09', 'poke')).toBe(true);              // 콕 찌르기 독립 슬롯
    expect(ledger.tryReserve('s1', 'r1', '2026-07-09', 'poke')).toBe(false);             // 같은 날 2번째 poke 거부
    expect(ledger.tryReserve('s1', 'r1', '2026-07-10', 'poke')).toBe(true);              // 다음 날은 다시 허용
  });
});

// [CL-EMAIL-SPAM-20260718-100000] 스팸 저감 — text/plain 멀티파트 대체본 + List-Unsubscribe mailto.
//  근거: HTML-only 메일·List-Unsubscribe 부재는 대표적 스팸 가점 요인. 순수 빌더는 vitest 로 계약 고정.
describe('notify-logic SPAM — text/plain 대체본', () => {
  const URL = 'https://moderninsightspot.com/budget';

  it('buildEmailText: 제목·안내·CTA URL·푸터 포함, HTML 태그 0(순수 평문)', () => {
    const text = buildEmailText('홍길동', URL);
    expect(text).toContain('홍길동님이 우리 예산을 다듬고 있어요');
    expect(text).toContain(URL);
    expect(text).toContain('하루 한 번만 보내드려요');
    expect(text).toContain('\n');            // 멀티라인(가독성)
    expect(text).not.toMatch(/<[a-z!/]/i);   // '<' 로 시작하는 태그 0
    expect(text).not.toContain('&lt;');      // 엔티티 잔재 0(평문이라 이스케이프 불필요)
  });

  it('buildPokeEmailText: poke 전용 카피 + 동일 CTA URL·푸터', () => {
    const text = buildPokeEmailText('민지', URL);
    expect(text).toContain('민지님이 콕 찔렀어요');
    expect(text).toContain('같이 보고 싶어해요');
    expect(text).toContain(URL);
    expect(text).not.toMatch(/<[a-z!/]/i);
  });

  it('buildEmailText: 빈/제어 발신자명은 폴백(파트너)', () => {
    expect(buildEmailText('  ', URL)).toContain('파트너님이');
    expect(buildPokeEmailText(null, URL)).toContain('파트너님이 콕 찔렀어요');
  });

  it('textForKind: htmlForKind 와 동일 분기(poke 전용/기본, 서로 다름)', () => {
    expect(textForKind('poke', '홍길동', URL)).toBe(buildPokeEmailText('홍길동', URL));
    expect(textForKind('partner_edit_2min', '홍길동', URL)).toBe(buildEmailText('홍길동', URL));
    expect(textForKind('poke', '홍길동', URL)).not.toBe(textForKind('partner_edit_2min', '홍길동', URL));
  });

  it('발신자명 유래 개행/제어문자는 제거(구조 개행만 남음) — sanitizeSenderName 재사용', () => {
    // 평문 컨텍스트라 HTML 인젝션은 무관하나, 발신자명이 개행을 심어 가짜 라인을 만드는 것은 차단해야 한다.
    const text = buildPokeEmailText('민지\r\n악성라인', URL);
    // \r 은 완전 제거(구조 개행은 join('\n') 의 \n 뿐 — \r 은 어디에도 없다)
    expect(text).not.toContain('\r');
    // 이름의 제어문자 제거 후 텍스트는 이어붙음(개행 없이) → '민지악성라인'
    expect(text).toContain('민지악성라인님이 콕 찔렀어요');
    // 첫 줄(제목)에 추가 개행이 끼어들지 않음
    expect(text.split('\n')[0]).toBe('민지악성라인님이 콕 찔렀어요');
  });
});

describe('notify-logic SPAM — unsubscribeMailto(List-Unsubscribe 파생)', () => {
  it('표시명 있는 from 에서 꺾쇠 안 주소만 추출', () => {
    expect(unsubscribeMailto('웨딩셈 <noreply@moderninsightspot.com>')).toBe(
      '<mailto:noreply@moderninsightspot.com?subject=unsubscribe>',
    );
  });

  it('주소만 있는 from 도 처리', () => {
    expect(unsubscribeMailto('noreply@moderninsightspot.com')).toBe(
      '<mailto:noreply@moderninsightspot.com?subject=unsubscribe>',
    );
  });

  it('빈값·표시명만·비이메일은 null(잘못된 헤더로 인한 스팸 가점 방지)', () => {
    expect(unsubscribeMailto('')).toBeNull();
    expect(unsubscribeMailto(null)).toBeNull();
    expect(unsubscribeMailto(undefined)).toBeNull();
    expect(unsubscribeMailto('웨딩셈')).toBeNull();               // 표시명만(주소 없음)
    expect(unsubscribeMailto('웨딩셈 <not-an-email>')).toBeNull(); // 꺾쇠 안이 이메일 아님
    expect(unsubscribeMailto('onboarding@resend.dev')).toBe(
      '<mailto:onboarding@resend.dev?subject=unsubscribe>',        // 샌드박스도 형식은 유효(발송 가드는 별도)
    );
  });
});

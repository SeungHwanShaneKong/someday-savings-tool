// [CL-VULN-EDGE-20260624-000000] notify-partner 핵심 로직(순수·Deno/원격 import 비종속).
//
// Edge(index.ts)와 vitest 가 동일 모듈을 공유한다(단일 진실원). 여기엔 부수효과·런타임 의존이 없어야 한다.
//   - V10: 이메일 제목/본문 살균(피싱·인젝션 차단)
//   - V4 : budgetId 형식 검증(임의 UUID 기록 차단; 소유권 검증은 Edge 가 DB 쿼리로 추가 수행)
//   - V2 : 레이트리밋 결정(글로벌 캡) + 원자 예약 모델(reserve-before-send)
//   - V5 : 발송 실패 시 예약 유지(fail-closed) — 재발송 폭주 차단

/** V10: HTML 특수문자 5종 엔티티 인코딩(텍스트/속성 컨텍스트 모두 안전). */
export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 제어문자 여부 — C0(0x00-0x1F)·DEL(0x7F)·C1(0x80-0x9F) + U+2028/U+2029(줄·문단 구분자).
 *  [CL-AUDIT6-DEF-20260710] U+2028/U+2029 추가: isControlChar 범위 밖이라 제목에서 줄바꿈처럼 렌더될 수
 *  있던 cosmetic 결함 차단(JSON transport 라 헤더 인젝션은 불가했으나 표시 무결성 근본강화). */
function isControlChar(code: number): boolean {
  return (
    code <= 0x1f ||
    code === 0x7f ||
    (code >= 0x80 && code <= 0x9f) ||
    code === 0x2028 ||
    code === 0x2029
  );
}

/** V10: 헤더(제목)용 — 제어문자/개행/줄구분자 제거 + trim + 길이 상한(헤더 주입·과장 차단).
 *  [CL-AUDIT6-DEF-20260710] 길이 절단을 코드유닛(slice) → 코드포인트 단위로 교정: 이모지(서로게이트 페어)가
 *  경계에 걸쳐 상위 서로게이트만 남아 깨진 문자(U+FFFD)로 렌더되던 cosmetic 결함을 구조적으로 차단. */
export function sanitizeHeaderText(raw: string | null | undefined, maxLen = 60): string {
  if (raw == null) return '';
  const chars: string[] = [];
  for (const ch of String(raw)) {
    const code = ch.codePointAt(0) ?? 0;
    if (isControlChar(code)) continue; // 개행/제어문자/줄구분자 → 헤더 인젝션·다중행 차단
    chars.push(ch);
  }
  const trimmed = chars.join('').trim();
  const cps = [...trimmed]; // 코드포인트 배열(서로게이트 페어 = 1 요소) → 페어 중간 절단 방지
  return cps.length > maxLen ? cps.slice(0, maxLen).join('') : trimmed;
}

/** V10: 발신자 표시명 정규화 — 제어문자 제거 + 40자 상한(DB CHECK 와 정합) + 빈값 폴백. */
export function sanitizeSenderName(raw: string | null | undefined, fallback = '파트너', maxLen = 40): string {
  const cleaned = sanitizeHeaderText(raw, maxLen);
  return cleaned.length > 0 ? cleaned : fallback;
}

/** V10: 이메일 제목(플레인 텍스트) — 살균된 발신자명 사용. */
export function buildSubject(senderName: string | null | undefined): string {
  return `${sanitizeSenderName(senderName)}님이 우리 결혼 예산을 함께 다듬고 있어요 💍`;
}

/** V10: 이메일 본문 — 발신자명·URL 모두 escapeHtml(태그/속성 인젝션 불가).
 *  [CL-EMAIL-BRAND-20260711-211500] 브랜드 v5 정렬: 배경 웜 블러시·CTA 브랜드 딥핑크 #DB2E66
 *  (하트 그라디언트 #FF8FB3→#F2547F 계열, 흰 글자 명암비 ≥4.5:1). 살균 계약 무변경. */
export function buildEmailHtml(senderName: string | null | undefined, appUrl: string): string {
  const safe = escapeHtml(sanitizeSenderName(senderName));
  const href = escapeHtml(appUrl);
  return `<!doctype html><html lang="ko"><body style="margin:0;background:#FDF2F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:480px;margin:0 auto;padding:32px 20px;">
      <div style="background:#fff;border-radius:16px;padding:28px;box-shadow:0 1px 4px rgba(0,0,0,.06);">
        <div style="font-size:40px;text-align:center;">💍</div>
        <h1 style="font-size:18px;color:#111;text-align:center;margin:12px 0 6px;">${safe}님이 우리 예산을 다듬고 있어요</h1>
        <p style="font-size:14px;color:#555;line-height:1.6;text-align:center;margin:0 0 20px;">
          지금 함께 보면 더 즐거워요. 잠깐 들어와 오늘의 변화를 확인해 보세요 😊
        </p>
        <a href="${href}" style="display:block;text-align:center;background:#DB2E66;color:#fff;text-decoration:none;font-weight:600;padding:13px 0;border-radius:10px;font-size:15px;">우리 예산 보러 가기</a>
        <p style="font-size:11px;color:#aaa;text-align:center;margin:18px 0 0;">웨딩셈 · 하루 한 번만 보내드려요</p>
      </div>
    </div></body></html>`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** V4: UUID 형식이면 그대로, 아니면 null(임의 문자열·SQL 조각·숫자·객체 차단). */
export function coerceBudgetId(raw: unknown): string | null {
  return typeof raw === 'string' && UUID_RE.test(raw) ? raw : null;
}

/** V2(버그 모델): 구 check-then-act — insert 이전에 관측한 pairCount 만으로 발송 허용(동시 호출 시 둘 다 통과). */
export function checkThenActAllowsSend(pairCountObservedBeforeInsert: number): boolean {
  return pairCountObservedBeforeInsert < 1;
}

export type SendDecision = 'send' | 'rate_limited' | 'global_capped';

/** V2(픽스): 예약 결과 + 글로벌 캡으로 발송 여부 결정. 글로벌 캡이 우선(비용 보호). */
export function decideSend(input: { reservedNew: boolean; globalCountToday: number; globalCap: number }): SendDecision {
  if (input.globalCountToday >= input.globalCap) return 'global_capped';
  if (!input.reservedNew) return 'rate_limited';
  return 'send';
}

/** V5: 발송 실패 시에도 예약 행을 유지한다(fail-closed) — 같은 날 재발송 루프/외부 API 폭주 차단. */
export function keepReservationOnSendFailure(): boolean {
  return true;
}

// [CL-VULN-R6B-SENDER-20260625] Resend 공유 샌드박스 발신자(@resend.dev)는 '계정 소유자 본인' 외 수신자에게
//  403 으로 거부 → 라이브에서 파트너 알림 0% 발송. 미설정/샌드박스 발신자는 '미인증'으로 보고 발송 자체를 차단
//  (예약 슬롯도 소진하지 않음). 도메인 인증 후 NOTIFY_FROM=noreply@moderninsightspot.com 설정 시에만 발송.
/** from 이 미설정이거나 *.resend.dev 공유 샌드박스면 true(미인증 → 발송 금지). */
export function isUnverifiedSharedSender(from: string | null | undefined): boolean {
  if (!from || from.trim() === '') return true;
  return /@(?:[a-z0-9-]+\.)*resend\.dev\b/i.test(from);
}

/** 설정성(영구) 발송 실패 상태(403/422) — 같은 설정으론 항상 실패하므로 예약 슬롯을 회수해야 한다(같은 날 재시도 허용).
 *  5xx/네트워크 등 일시 실패는 fail-closed 유지(예약 보존 → 스팸/비용 폭주 차단). */
export function isConfigErrorStatus(status: number): boolean {
  return status === 403 || status === 422;
}

// [CL-VULN-R6E-SCHEMA-20260625] reserve insert 에러코드 → 동작 매핑. 마이그 130000(notify_day+유니크) 미적용 상태로
//  Edge 가 배포되면 42703(undefined_column)/42P01(undefined_table)이 나는데, 이를 500 스팸이 아니라
//  'schema_not_ready'(no_provider 처럼 의도된 미발송 degrade)로 강등해 거짓적립·콘솔 폭주를 막는다.
export type ReserveOutcome = 'rate_limited' | 'schema_not_ready' | 'reserve_failed';
export function mapReserveError(code: string | undefined | null): ReserveOutcome {
  if (code === '23505') return 'rate_limited';
  if (code === '42703' || code === '42P01') return 'schema_not_ready';
  return 'reserve_failed';
}

/**
 * V2(픽스 모델): (sender_id, recipient_id, notify_day, kind) 일별 원자 예약 원장.
 * DB 의 부분 유니크 인덱스(uq_partner_notif_pair_day) + insert-실패-시-거부 패턴을 인메모리로 모사.
 * tryReserve 는 'ON CONFLICT DO NOTHING' 처럼 신규면 true(발송 진행), 중복이면 false(rate_limited).
 */
export class DailyReservationLedger {
  private taken = new Set<string>();
  private key(sender: string, recipient: string, day: string, kind: string): string {
    return `${sender}|${recipient}|${day}|${kind}`;
  }
  tryReserve(sender: string, recipient: string, day: string, kind = 'partner_edit_2min'): boolean {
    const k = this.key(sender, recipient, day, kind);
    if (this.taken.has(k)) return false;
    this.taken.add(k);
    return true;
  }
}

/** UTC 기준 오늘 날짜(YYYY-MM-DD) — Edge 가 notify_day 컬럼에 명시 기록(생성열 immutable 이슈 회피). */
export function utcDayString(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// [CL-POKE-20260709-231909] 파트너 '콕 찌르기'(수동 이메일 넛지) — kind 허용목록 + kind별 제목/본문.
//  - 유니크 인덱스 uq_partner_notif_pair_day 가 (sender,recipient,notify_day,kind)를 포함하므로
//    kind='poke' 는 partner_edit_2min 과 독립된 일일 슬롯(마이그레이션 불필요).
//  - 기존 함수(buildSubject/buildEmailHtml 등)는 바이트 수준 보존 — 기존 kind 동작 회귀 0.
//  - 살균은 기존 sanitizeSenderName/escapeHtml 재사용(헤더 개행·HTML 주입 차단 계약 동일).
// ─────────────────────────────────────────────────────────────────────────────

/** 허용된 알림 종류(허용목록). 목록 외 입력은 coerceKind 가 기본값으로 강등. */
export const NOTIFY_KINDS = ['partner_edit_2min', 'poke'] as const;
export type NotifyKind = (typeof NOTIFY_KINDS)[number];

/** kind 허용목록 검증 — 비문자열/목록 외 값은 'partner_edit_2min'(기존 동작)으로 강등. */
export function coerceKind(raw: unknown): NotifyKind {
  return typeof raw === 'string' && (NOTIFY_KINDS as readonly string[]).includes(raw)
    ? (raw as NotifyKind)
    : 'partner_edit_2min';
}

/** kind별 이메일 제목 — poke 는 전용 카피, 그 외는 기존 buildSubject 위임(바이트 동일). */
export function subjectForKind(kind: NotifyKind, senderName: string | null | undefined): string {
  if (kind === 'poke') {
    return `${sanitizeSenderName(senderName)}님이 콕! 예산 보러 오라고 살짝 불렀어요 💍`;
  }
  return buildSubject(senderName);
}

/** poke 전용 본문 — 한 줄 개인화 넛지 + 기존 CTA 버튼 + 기존 '하루 한 번' 푸터(따뜻·비스팸).
 *  [CL-EMAIL-BRAND-20260711-211500] 브랜드 v5 정렬(buildEmailHtml 과 동일 팔레트). 살균 계약 무변경. */
export function buildPokeEmailHtml(senderName: string | null | undefined, appUrl: string): string {
  const safe = escapeHtml(sanitizeSenderName(senderName));
  const href = escapeHtml(appUrl);
  return `<!doctype html><html lang="ko"><body style="margin:0;background:#FDF2F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:480px;margin:0 auto;padding:32px 20px;">
      <div style="background:#fff;border-radius:16px;padding:28px;box-shadow:0 1px 4px rgba(0,0,0,.06);">
        <div style="font-size:40px;text-align:center;">👉💍</div>
        <h1 style="font-size:18px;color:#111;text-align:center;margin:12px 0 6px;">${safe}님이 콕 찔렀어요</h1>
        <p style="font-size:14px;color:#555;line-height:1.6;text-align:center;margin:0 0 20px;">
          ${safe}님이 우리 결혼 예산을 같이 보고 싶어해요. 잠깐 들러 함께 다듬어 주실래요? 😊
        </p>
        <a href="${href}" style="display:block;text-align:center;background:#DB2E66;color:#fff;text-decoration:none;font-weight:600;padding:13px 0;border-radius:10px;font-size:15px;">우리 예산 보러 가기</a>
        <p style="font-size:11px;color:#aaa;text-align:center;margin:18px 0 0;">웨딩셈 · 하루 한 번만 보내드려요</p>
      </div>
    </div></body></html>`;
}

/** kind별 이메일 본문 — poke 는 전용 템플릿, 그 외는 기존 buildEmailHtml 위임(바이트 동일). */
export function htmlForKind(kind: NotifyKind, senderName: string | null | undefined, appUrl: string): string {
  if (kind === 'poke') return buildPokeEmailHtml(senderName, appUrl);
  return buildEmailHtml(senderName, appUrl);
}

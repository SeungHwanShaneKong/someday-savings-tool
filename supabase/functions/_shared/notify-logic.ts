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

/** 제어문자(C0 0x00-0x1F · DEL 0x7F · C1 0x80-0x9F) 여부 — regex 대신 코드포인트 판정(순수 ASCII 소스). */
function isControlChar(code: number): boolean {
  return code <= 0x1f || code === 0x7f || (code >= 0x80 && code <= 0x9f);
}

/** V10: 헤더(제목)용 — 제어문자/개행 제거 + trim + 길이 상한(헤더 주입·과장 차단). */
export function sanitizeHeaderText(raw: string | null | undefined, maxLen = 60): string {
  if (raw == null) return '';
  let out = '';
  for (const ch of String(raw)) {
    const code = ch.codePointAt(0) ?? 0;
    if (isControlChar(code)) continue; // 개행/제어문자 → 헤더 인젝션 차단
    out += ch;
  }
  out = out.trim();
  return out.length > maxLen ? out.slice(0, maxLen) : out;
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

/** V10: 이메일 본문 — 발신자명·URL 모두 escapeHtml(태그/속성 인젝션 불가). */
export function buildEmailHtml(senderName: string | null | undefined, appUrl: string): string {
  const safe = escapeHtml(sanitizeSenderName(senderName));
  const href = escapeHtml(appUrl);
  return `<!doctype html><html lang="ko"><body style="margin:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:480px;margin:0 auto;padding:32px 20px;">
      <div style="background:#fff;border-radius:16px;padding:28px;box-shadow:0 1px 4px rgba(0,0,0,.06);">
        <div style="font-size:40px;text-align:center;">💍</div>
        <h1 style="font-size:18px;color:#111;text-align:center;margin:12px 0 6px;">${safe}님이 우리 예산을 다듬고 있어요</h1>
        <p style="font-size:14px;color:#555;line-height:1.6;text-align:center;margin:0 0 20px;">
          지금 함께 보면 더 즐거워요. 잠깐 들어와 오늘의 변화를 확인해 보세요 😊
        </p>
        <a href="${href}" style="display:block;text-align:center;background:#3b82f6;color:#fff;text-decoration:none;font-weight:600;padding:13px 0;border-radius:10px;font-size:15px;">우리 예산 보러 가기</a>
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

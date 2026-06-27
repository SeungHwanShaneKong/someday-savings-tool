// [CL-ANONVISIT-LOGIC-20260627-234656] track-visit 순수 검증/살균 로직(부작용 0 → vitest 결정론).
//
// 목적: 익명 방문 페이로드를 안전하게 클램프/정규화하고, 클라이언트가 지정해서는 안 되는 필드
//   (user_id·is_synthetic 등)를 '구조적으로' 제거(스푸핑 차단). Edge index.ts 는 이 결과만 service_role 로 insert.
// 보안 기조: 길이 캡(저장 bloat/XSS 표면 축소) · 제어문자 제거 · referrer 는 origin 만(PII/bloat 방지) ·
//   session_id 는 UUID 만 허용(아니면 null → 호출부가 서버 생성).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// 제어문자(개행/탭/DEL 포함) 전부 제거 — 로그 인젝션/표시 깨짐 방지.
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u001F\u007F]/g;

export interface CleanVisit {
  page_path: string;
  /** UUID 검증 통과분만. null 이면 호출부가 crypto.randomUUID() 로 채움. */
  session_id: string | null;
  referrer: string | null;
  utm_source: string | null;
}

function clampStr(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.replace(CONTROL_RE, '').trim();
  if (!s) return null;
  return s.slice(0, max);
}

/** referrer → origin(scheme://host)만. http/https 외·파싱불가 → null. PII/bloat 방지. */
export function toOrigin(v: unknown): string | null {
  const s = clampStr(v, 2048);
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.origin.slice(0, 255);
  } catch {
    return null;
  }
}

/**
 * 익명 방문 페이로드 살균. 항상 안전한 CleanVisit 반환(여분 필드 무시 = 화이트리스트).
 * - page_path: '/' 시작 강제, 제어문자 제거, ≤255. 기본 '/'.
 * - session_id: UUID 만 허용(소문자화), 아니면 null.
 * - referrer: origin 만.
 * - utm_source: lowercase + [a-z0-9._-] 만 + ≤40.
 */
export function sanitizeVisitPayload(input: unknown): CleanVisit {
  const o = (input && typeof input === 'object') ? (input as Record<string, unknown>) : {};

  let path = clampStr(o.page_path, 255) ?? '/';
  if (!path.startsWith('/')) path = '/' + path.replace(/^\/+/, '');
  path = path.slice(0, 255);

  const sidRaw = typeof o.session_id === 'string' ? o.session_id.trim() : '';
  const session_id = UUID_RE.test(sidRaw) ? sidRaw.toLowerCase() : null;

  const referrer = toOrigin(o.referrer);

  const utmRaw = clampStr(o.utm_source, 40);
  const utmClean = utmRaw ? utmRaw.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40) : '';
  const utm_source = utmClean || null;

  return { page_path: path, session_id, referrer, utm_source };
}

// [CL-AUDIT2-R1-HARDEN-20260628] 익명 무인증 엔드포인트 추가 방어(F1/F12/F13).

/** Content-Length 기반 본문 크기 가드(req.json 파싱 '전'). 익명 페이로드는 수백 B면 충분 → 작은 캡. */
export function isBodyTooLarge(contentLength: string | null, max: number): boolean {
  if (!contentLength) return false; // 없으면 플랫폼 게이트웨이 캡에 위임
  const n = parseInt(contentLength, 10);
  return Number.isFinite(n) && n > max;
}

/** 일일 글로벌 하드캡 초과 판정. reserved=null(예약 RPC 미가용/미배포) → fail-open(가용성 우선·무중단). */
export function isOverDailyCap(reserved: number | null, max: number): boolean {
  return reserved !== null && reserved > max;
}

/**
 * 익명 방문 best-effort 1차 레이트리밋. 핵심 abuse 게이트는 DB 글로벌 하드캡(reserve_anon_visit)이며 이건 보조 레이어.
 * - TTL 만료 스윕 + 엔트리 수 캡 → Map 무한증가(F12) 차단(키공간이 클라 제어 X-Forwarded-For 라).
 * - now 를 주입받아 결정론 테스트 가능.
 */
export class RateLimiter {
  private state = new Map<string, { count: number; resetAt: number }>();
  constructor(private windowMs: number, private max: number, private capEntries: number) {}

  hit(key: string, now: number): boolean {
    if (this.state.size >= this.capEntries) {
      // 1) 만료 엔트리 스윕
      for (const [k, v] of this.state) {
        if (now >= v.resetAt) this.state.delete(k);
      }
      // 2) 여전히 초과면 FIFO 축출(삽입 순서상 가장 오래된 것부터)
      while (this.state.size >= this.capEntries) {
        const first = this.state.keys().next().value;
        if (first === undefined) break;
        this.state.delete(first);
      }
    }
    const e = this.state.get(key);
    if (!e || now >= e.resetAt) {
      this.state.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (e.count >= this.max) return false;
    e.count += 1;
    return true;
  }

  get size(): number {
    return this.state.size;
  }
}

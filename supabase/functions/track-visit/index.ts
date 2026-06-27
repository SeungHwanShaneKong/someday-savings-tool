// [CL-ANONVISIT-EDGE-20260627-234656] 익명 방문 집계 릴레이.
//
// 왜 릴레이인가: 직접 anon INSERT RLS(개방 write 표면)는 마이그 20260214152805 가 page_views 에서 제거한 표면 →
//   재도입 금지(보안 기조). 이 함수가 '단일' 검증/캡/레이트리밋 지점이 되어 service_role 로만 anon_page_views 에 기록.
//
// [CL-AUDIT2-R1-HARDEN-20260628] 적대 감사 R1/R12/R13 근본수정:
//   - 본문 크기 가드(req.json 파싱 前) — 무인증 엔드포인트 파싱 DoS 차단(F13).
//   - RateLimiter(TTL 스윕+엔트리 캡) — per-isolate Map 무한증가 차단(F12).
//   - DB 글로벌 일일 하드캡(reserve_anon_visit RPC, 원자) — IP 레이트리밋이 X-Forwarded-For 스푸핑+isolate 희석으로
//     무력하던 '무제한 쓰기 증폭/지표 오염'을 DB 레벨에서 하드 차단(F1). per-IP 캡은 보조 1차 레이어로만 유지.
// 분석은 비차단(fire-and-forget): 모든 차단/실패는 200 ok:false 무음 degrade(앱 영향 0).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { errorResponse } from '../_shared/error-response.ts';
import {
  sanitizeVisitPayload,
  isBodyTooLarge,
  isOverDailyCap,
  RateLimiter,
} from '../_shared/track-visit-logic.ts';

// best-effort 1차 레이어(보조). 핵심 abuse 게이트는 아래 DB 글로벌 하드캡.
const limiter = new RateLimiter(60_000 /*1분*/, 60 /*분당*/, 5000 /*엔트리 캡*/);
const MAX_BODY_BYTES = 8192; // 익명 페이로드(path/session/referrer/utm)는 수백 B면 충분
const DAILY_GLOBAL_CAP = 200_000; // 익명 행 일일 글로벌 하드캡(실트래픽 충분·abuse 상한)

const ok = (okFlag: boolean) =>
  new Response(JSON.stringify({ ok: okFlag }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  const pre = handleCors(req);
  if (pre) return pre;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // [F13] 본문 크기 가드 — 파싱 전에 거부(무음). 거대 페이로드 파싱 비용 자체를 회피.
  if (isBodyTooLarge(req.headers.get('content-length'), MAX_BODY_BYTES)) return ok(false);

  // IP 는 레이트리밋 키로만 사용 — 절대 저장하지 않음. (스푸핑 가능 → 보조 레이어, 하드캡은 DB)
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';
  if (!limiter.hit(ip, Date.now())) return ok(false); // 무음 — 분석 비차단

  try {
    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const clean = sanitizeVisitPayload(body);
    const session_id = clean.session_id ?? crypto.randomUUID();

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // [F1] DB 글로벌 일일 하드캡(원자 reserve-before-insert). RPC 미배포/오류 → fail-open(가용성 우선).
    let reserved: number | null = null;
    try {
      const { data, error } = await admin.rpc('reserve_anon_visit', { p_max: DAILY_GLOBAL_CAP });
      if (!error && typeof data === 'number') reserved = data;
    } catch (_e) {
      reserved = null; // 미배포/일시오류 → 하드캡 미적용(무중단), 보조 레이어는 유지
    }
    if (isOverDailyCap(reserved, DAILY_GLOBAL_CAP)) return ok(false); // 캡 초과 → 미기록(무음)

    // 화이트리스트 컬럼만 — user_id/is_synthetic 등은 미포함(클라 스푸핑 불가). is_synthetic 은 DB default(false).
    const { error } = await admin.from('anon_page_views').insert({
      page_path: clean.page_path,
      session_id,
      referrer: clean.referrer,
      utm_source: clean.utm_source,
    });
    if (error) {
      // 테이블 미배포(42P01) 등 → 무음 degrade(앱 영향 0).
      console.warn(`[track-visit] insert skipped: ${error.code ?? ''} ${error.message ?? ''}`.trim());
      return ok(false);
    }
    return ok(true);
  } catch (err) {
    return errorResponse('track-visit', err);
  }
});

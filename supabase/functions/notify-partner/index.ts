// [CL-COEDIT-NOTIFY-20260623-230113] 파트너 편집 알림 (개선2)
// [CL-VULN-EDGE-20260624-000000] 적대 감사 하드닝: reserve-before-send(V2 TOCTOU)·budgetId 검증(V4)·
//   발송실패 fail-closed(V5)·제목/본문 살균(V10). 핵심 로직은 _shared/notify-logic.ts(순수, vitest 검증).
//
// 흐름: (1)JWT 발신자 확인 (2)budgetId 형식+소유 검증 (3)get_my_partner 로 부재 파트너 조회
//   (4)RESEND 키 없으면 no_provider(슬롯 미소진) (5)글로벌 캡(best-effort) (6)원자 예약(per-pair-day 유니크)
//   (7)예약 성공시에만 Resend 발송(실패해도 예약 유지=재발송 루프 차단).
//
// ⚠️ 시크릿(사용자 설정): RESEND_API_KEY (없으면 skipped:'no_provider'). 키는 저장소 미커밋.
// ⚠️ 마이그 20260624130000(notify_day + 부분 유니크 인덱스) 적용 후에만 원자 레이트리밋이 강제됨.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { verifyUserToken } from '../_shared/jwt.ts';
import {
  coerceBudgetId, utcDayString,
  isUnverifiedSharedSender, isConfigErrorStatus, mapReserveError,
  // [CL-POKE-20260709-231909] kind 허용목록 + kind별 제목/본문(기존 kind 는 buildSubject/buildEmailHtml 위임 — 동작 불변)
  coerceKind, subjectForKind, htmlForKind,
} from '../_shared/notify-logic.ts';

const DAILY_GLOBAL_CAP = 100; // 글로벌 하루 발송 상한(요청: ≤100, best-effort)
const APP_URL = 'https://moderninsightspot.com/budget';
// [CL-VULN-R6B] 발신자는 env 로 외부화 — 도메인 인증 후 NOTIFY_FROM=웨딩셈 <noreply@moderninsightspot.com> 설정.
//  미설정/샌드박스(@resend.dev)면 isUnverifiedSharedSender 가 발송 자체를 차단(슬롯 미소진).
const NOTIFY_FROM = Deno.env.get('NOTIFY_FROM') ?? '웨딩셈 <onboarding@resend.dev>';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const startTime = Date.now();
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: '인증이 필요합니다' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey); // RLS 우회(기록/집계)

    const token = authHeader.replace('Bearer ', '');
    const senderId = await verifyUserToken(admin, token);
    if (!senderId) return json({ error: '유효하지 않은 인증입니다' }, 401);

    // [V4] budgetId: 형식(UUID) 검증 후 소유/협업 확인 — 미검증이면 null 강등(임의 UUID 기록·FK 프로빙 차단)
    // [CL-POKE-20260709-231909] kind: 허용목록('partner_edit_2min'|'poke') 외/비문자열 → 기본값 강등(임의 kind 기록 차단).
    //  degrade: 구버전 배포 Edge 는 kind 를 무시 → 구템플릿 발송 + partner_edit_2min 슬롯 소모(수용된 잔여 리스크, 재배포로 해소).
    let rawBudgetId: unknown = null;
    let rawKind: unknown = null;
    try {
      const body = await req.json();
      rawBudgetId = (body as { budgetId?: unknown })?.budgetId ?? null;
      rawKind = (body as { kind?: unknown })?.kind ?? null;
    } catch { /* body 없음 허용 */ }
    const kind = coerceKind(rawKind);
    let budgetId = coerceBudgetId(rawBudgetId);
    if (budgetId) {
      const { data: owned } = await admin
        .from('budgets').select('id').eq('id', budgetId).eq('user_id', senderId).maybeSingle();
      if (!owned) {
        const { data: collab } = await admin
          .from('budget_collaborators').select('budget_id').eq('budget_id', budgetId).eq('user_id', senderId).maybeSingle();
        if (!collab) budgetId = null; // 소유/협업 아님 → 강등(알림 자체는 유지)
      }
    }

    // 부재 파트너 조회 — auth.uid()=발신자로 동작하도록 사용자 토큰 클라이언트로 RPC
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: partnerRows, error: partnerErr } = await userClient.rpc('get_my_partner');
    const partner = !partnerErr && Array.isArray(partnerRows) ? partnerRows[0] : null;
    if (!partner?.user_id || !partner?.email) {
      return json({ ok: true, skipped: 'no_partner' });
    }

    // [V1/degrade] Resend 키 미설정 → 무발송(예약 슬롯 미소진 — 키 설정 후 정상 발송 가능)
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.log(JSON.stringify({ function: 'notify-partner', skipped: 'no_provider', duration_ms: Date.now() - startTime }));
      return json({ ok: true, skipped: 'no_provider' });
    }

    // [V(R6-B)] 발신자 도메인 미인증(미설정/샌드박스 @resend.dev) → 발송 차단(예약 슬롯 미소진).
    //  샌드박스 발신자는 임의 수신자에게 403 거부 → 그대로 두면 슬롯만 태우고 0% 발송. 도메인 인증+NOTIFY_FROM 설정 시 해제.
    if (isUnverifiedSharedSender(NOTIFY_FROM)) {
      console.warn(JSON.stringify({ function: 'notify-partner', skipped: 'no_sender_domain', duration_ms: Date.now() - startTime }));
      return json({ ok: true, skipped: 'no_sender_domain' });
    }

    const notifyDay = utcDayString(Date.now());         // UTC YYYY-MM-DD (예약 키)
    const dayStart = `${notifyDay}T00:00:00Z`;

    // 글로벌 하루 ≤100통(best-effort) — 예약 전 점검
    const { count: globalCount } = await admin
      .from('partner_notifications')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', dayStart);
    if ((globalCount ?? 0) >= DAILY_GLOBAL_CAP) return json({ ok: true, skipped: 'global_capped' });

    // [V2] 원자 예약(reserve-before-send) — (sender,recipient,notify_day,kind) 부분 유니크.
    //   23505(중복) → 이미 오늘 발송됨 → rate_limited(무발송). 동시 invoke/다탭/재시도 모두 1건만 통과.
    //   [CL-POKE-20260709-231909] kind 가 유니크 키에 포함 → poke 는 partner_edit_2min 과 독립 일일 슬롯.
    const { error: reserveErr } = await admin.from('partner_notifications').insert({
      sender_id: senderId,
      recipient_id: partner.user_id,
      budget_id: budgetId,
      kind,
      notify_day: notifyDay,
    });
    if (reserveErr) {
      // [V(R6-E)] 에러코드 매핑: 23505=중복→rate_limited, 42703/42P01=마이그 130000 미적용→schema_not_ready(degrade), 그 외=500.
      const outcome = mapReserveError((reserveErr as { code?: string }).code);
      if (outcome === 'rate_limited') return json({ ok: true, skipped: 'rate_limited' });
      if (outcome === 'schema_not_ready') {
        console.warn(JSON.stringify({ function: 'notify-partner', skipped: 'schema_not_ready', detail: 'apply migration 20260624130000 (notify_day)' }));
        return json({ ok: true, skipped: 'schema_not_ready' }); // 200 degrade — 거짓적립·500 폭주 방지
      }
      console.error('[notify-partner] reserve error', reserveErr);
      return json({ ok: false, error: 'reserve_failed' }, 500);
    }

    // 발신자 닉네임(제목/본문 개인화 — buildSubject/buildEmailHtml 내부에서 살균/엔티티화)
    const { data: senderProfile } = await admin
      .from('profiles').select('display_name').eq('user_id', senderId).maybeSingle();
    const senderName = (senderProfile?.display_name as string | undefined) ?? '';

    // [V10] 발송 — 제목은 sanitizeHeaderText, 본문은 escapeHtml 처리된 값 사용
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: NOTIFY_FROM, // [V(R6-B)] env 외부화 — 도메인 인증된 발신자만(위 가드로 샌드박스 차단됨)
        to: [partner.email],
        // [CL-POKE-20260709-231909] kind별 제목/본문 — 기존 kind 는 buildSubject/buildEmailHtml 그대로 위임(불변)
        subject: subjectForKind(kind, senderName),
        html: htmlForKind(kind, senderName, APP_URL),
      }),
    });
    if (!resp.ok) {
      const detail = await resp.text();
      console.error('[notify-partner] resend error', resp.status, detail);
      // [V(R6-B)] 발송 실패 분기:
      //  - 403/422(설정성·영구 실패: 미인증 도메인/잘못된 from) → 이번 예약 행만 회수(scoped DELETE) → 설정 교정 후 같은 날 재발송 가능.
      //  - 그 외(5xx/네트워크 = 일시) → [V5] fail-closed: 예약 보존 → 같은 날 재발송 루프/외부 API 폭주 차단.
      if (isConfigErrorStatus(resp.status)) {
        // [CL-POKE-20260709-231909] 회수도 이번 요청의 kind 로 스코프 — 다른 kind 슬롯 오회수 방지
        await admin.from('partner_notifications')
          .delete()
          .eq('sender_id', senderId)
          .eq('recipient_id', partner.user_id)
          .eq('notify_day', notifyDay)
          .eq('kind', kind);
      }
      return json({ ok: false, error: 'send_failed', status: resp.status }, 502);
    }

    console.log(JSON.stringify({ function: 'notify-partner', sent: true, duration_ms: Date.now() - startTime }));
    return json({ ok: true, sent: true });
  } catch (err) {
    console.error('[notify-partner] error', err);
    return json({ ok: false, error: 'internal' }, 500);
  }
});

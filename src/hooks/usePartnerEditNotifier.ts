// [CL-COEDIT-NUDGE-20260624-000000] 파트너 편집 알림 트리거 (개선2)
//
// useMultipleBudgets 의 editSignal(성공 편집 누계)을 구독하여, '2분 연속 편집 세션'이 감지되면
// notify-partner Edge Function 을 1회 호출한다(부재 파트너에게 이메일). 하루 1회·글로벌 캡은 서버가 최종 강제.
// 활성 조건: 우리(공유) 모드 + 현재 파트너 존재. 세션 판정은 순수 reducer(edit-session.ts).
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { onEdit, initialEditSession, type EditSessionState } from '@/lib/collab/edit-session';

interface Params {
  /** useMultipleBudgets.editSignal — 성공 편집마다 +1 */
  editSignal: number;
  /** mode==='shared' && 파트너 존재 시에만 활성 */
  active: boolean;
  budgetId: string | null;
  /** nudge 발사 시(이메일 트리거) 1회 호출 — 게이미피케이션 보상 등 */
  onNudged?: () => void;
}

export function usePartnerEditNotifier({ editSignal, active, budgetId, onNudged }: Params): void {
  const sessionRef = useRef<EditSessionState>(initialEditSession);
  const lastSignalRef = useRef(0);
  const invokingRef = useRef(false);

  useEffect(() => {
    if (!active || !budgetId) return;
    if (editSignal === lastSignalRef.current || editSignal === 0) return;
    lastSignalRef.current = editSignal;

    const { state, nudge } = onEdit(sessionRef.current, Date.now());
    sessionRef.current = state;
    if (!nudge || invokingRef.current) return;

    invokingRef.current = true;
    void supabase.functions
      .invoke('notify-partner', { body: { budgetId } })
      // [CL-VULN-V1-SENT-GATE-20260624-000000] 보상은 '실제 발송' 일 때만.
      //  서버는 미발송 분기(no_provider/rate_limited/no_partner/global_capped)도 200 {ok:true,skipped:'...'} 로
      //  돌려주므로, sent:true(=partner_notifications 기록과 동일 신뢰원천) + error 없음일 때만 onNudged 호출.
      //  그렇지 않으면 키 미설정/하루 2회차에도 coedit_nudges_sent·포인트·배지가 거짓 적립된다.
      .then((res: { data?: { sent?: boolean } | null; error?: unknown } | null) => {
        if (res && res.error == null && res.data?.sent === true) onNudged?.();
      })
      .catch(() => { /* degrade-safe: 실패해도 앱 영향 0 */ })
      .finally(() => { invokingRef.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editSignal, active, budgetId]);
}

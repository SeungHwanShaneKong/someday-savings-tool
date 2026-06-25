// [CL-COEDIT-NUDGE-20260624-000000] usePartnerEditNotifier 단위 테스트 (개선2 트리거 계약)
//
// editSignal(성공 편집 누계) 구독 → 2분 연속 편집 세션 감지 시 notify-partner Edge Function 1회.
// Date.now() 는 fake timers 로 결정론 제어. supabase.functions.invoke 는 전역 mock.
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePartnerEditNotifier } from '../usePartnerEditNotifier';
import { supabase } from '@/integrations/supabase/client';

const invoke = supabase.functions.invoke as unknown as ReturnType<typeof vi.fn>;
// invoke().then(onNudged).catch().finally() 의 마이크로태스크 플러시(타이머 무관)
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

const T0 = '2026-06-24T00:00:00.000Z';
const T2 = '2026-06-24T00:02:00.000Z'; // +2분 (= NUDGE_MS)
const T3 = '2026-06-24T00:03:00.000Z';

beforeEach(() => {
  invoke.mockReset();
  // 기본: 서버가 실제 발송(sent:true) 했다고 응답 — 개별 테스트가 skipped/error 로 오버라이드.
  invoke.mockResolvedValue({ data: { ok: true, sent: true }, error: null });
  vi.useFakeTimers();
  vi.setSystemTime(new Date(T0));
});

// 2분 세션 충족까지 editSignal 을 진행시켜 nudge(=invoke) 1회를 유발하는 헬퍼.
function driveToNudge(rerender: (p: { editSignal: number }) => void) {
  rerender({ editSignal: 1 });               // 세션 시작
  vi.setSystemTime(new Date(T2));
  rerender({ editSignal: 2 });               // 2분 경과 → nudge → invoke
}
afterEach(() => {
  vi.useRealTimers();
});

describe('usePartnerEditNotifier (개선2: 2분 편집 → 파트너 알림)', () => {
  it('PEN.1 2분 연속 편집 세션 → notify-partner 1회 + onNudged 콜백', async () => {
    const onNudged = vi.fn();
    const { rerender } = renderHook(
      ({ editSignal }) => usePartnerEditNotifier({ editSignal, active: true, budgetId: 'b1', onNudged }),
      { initialProps: { editSignal: 0 } },
    );
    // 첫 편집(세션 시작) — 아직 2분 미만이라 미발사
    rerender({ editSignal: 1 });
    expect(invoke).not.toHaveBeenCalled();
    // 2분 경과 후 편집 → nudge
    vi.setSystemTime(new Date(T2));
    rerender({ editSignal: 2 });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith('notify-partner', { body: { budgetId: 'b1' } });
    await flush();
    expect(onNudged).toHaveBeenCalledTimes(1);
  });

  it('PEN.2 active=false(개인모드/무파트너) → 2분 지나도 미발사', () => {
    const { rerender } = renderHook(
      ({ editSignal }) => usePartnerEditNotifier({ editSignal, active: false, budgetId: 'b1' }),
      { initialProps: { editSignal: 0 } },
    );
    rerender({ editSignal: 1 });
    vi.setSystemTime(new Date(T2));
    rerender({ editSignal: 2 });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('PEN.3 budgetId 없음 → 미발사', () => {
    const { rerender } = renderHook(
      ({ editSignal }) => usePartnerEditNotifier({ editSignal, active: true, budgetId: null }),
      { initialProps: { editSignal: 0 } },
    );
    rerender({ editSignal: 1 });
    vi.setSystemTime(new Date(T2));
    rerender({ editSignal: 2 });
    expect(invoke).not.toHaveBeenCalled();
  });

  // [CL-VULN-V1-SENT-GATE-20260624] 보상은 '실제 발송(sent:true)' 일 때만 — 서버가 미발송 분기를
  //  200 {ok:true, skipped:'...'} 로 반환해도 onNudged 가 불리던 거짓양성을 차단(근본수정 회귀가드).
  it('V1.a no_provider(키 미설정) 응답 → onNudged 미호출(보상 없음)', async () => {
    invoke.mockResolvedValue({ data: { ok: true, skipped: 'no_provider' }, error: null });
    const onNudged = vi.fn();
    const { rerender } = renderHook(
      ({ editSignal }) => usePartnerEditNotifier({ editSignal, active: true, budgetId: 'b1', onNudged }),
      { initialProps: { editSignal: 0 } },
    );
    driveToNudge(rerender);
    expect(invoke).toHaveBeenCalledTimes(1); // 호출은 됨
    await flush();
    expect(onNudged).not.toHaveBeenCalled(); // 그러나 미발송이므로 보상 없음
  });

  it('V1.b rate_limited(하루 2회차) 응답 → onNudged 미호출', async () => {
    invoke.mockResolvedValue({ data: { ok: true, skipped: 'rate_limited' }, error: null });
    const onNudged = vi.fn();
    const { rerender } = renderHook(
      ({ editSignal }) => usePartnerEditNotifier({ editSignal, active: true, budgetId: 'b1', onNudged }),
      { initialProps: { editSignal: 0 } },
    );
    driveToNudge(rerender);
    await flush();
    expect(onNudged).not.toHaveBeenCalled();
  });

  it('V1.c invoke error(502 등) → onNudged 미호출', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'send_failed' } });
    const onNudged = vi.fn();
    const { rerender } = renderHook(
      ({ editSignal }) => usePartnerEditNotifier({ editSignal, active: true, budgetId: 'b1', onNudged }),
      { initialProps: { editSignal: 0 } },
    );
    driveToNudge(rerender);
    await flush();
    expect(onNudged).not.toHaveBeenCalled();
  });

  it('V1.d sent:true(실제 발송) → onNudged 정확히 1회', async () => {
    invoke.mockResolvedValue({ data: { ok: true, sent: true }, error: null });
    const onNudged = vi.fn();
    const { rerender } = renderHook(
      ({ editSignal }) => usePartnerEditNotifier({ editSignal, active: true, budgetId: 'b1', onNudged }),
      { initialProps: { editSignal: 0 } },
    );
    driveToNudge(rerender);
    await flush();
    expect(onNudged).toHaveBeenCalledTimes(1);
  });

  it('PEN.4 한 세션당 1회만 — 2분 이후 추가 편집은 재발사 안 함', async () => {
    const { rerender } = renderHook(
      ({ editSignal }) => usePartnerEditNotifier({ editSignal, active: true, budgetId: 'b1' }),
      { initialProps: { editSignal: 0 } },
    );
    rerender({ editSignal: 1 });             // 세션 시작
    vi.setSystemTime(new Date(T2));
    rerender({ editSignal: 2 });             // nudge 1회
    await flush();
    vi.setSystemTime(new Date(T3));
    rerender({ editSignal: 3 });             // 같은 세션 → 추가 발사 없음
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});

// [CL-TOP20-P0-20260703-002500] 퍼널 계측 단위 테스트 — 무음 no-op·전송 포맷·세션 1회 가드
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { trackFunnel, trackFunnelOnce } from '../funnel-events';

describe('trackFunnel', () => {
  afterEach(() => {
    delete (window as { gtag?: unknown }).gtag;
    sessionStorage.clear();
  });

  it('gtag 존재 시 event 명령과 app_area 를 포함해 전송한다', () => {
    const gtag = vi.fn();
    (window as { gtag?: unknown }).gtag = gtag;
    trackFunnel('feature_card_click', { feature: 'budget' });
    expect(gtag).toHaveBeenCalledWith('event', 'feature_card_click', {
      app_area: 'visitor_funnel',
      feature: 'budget',
    });
  });

  it('gtag 부재(차단기/프리렌더) 시 throw 없이 무음 no-op', () => {
    expect(() => trackFunnel('demo_start')).not.toThrow();
  });

  it('gtag 가 내부에서 throw 해도 호출부로 전파되지 않는다', () => {
    (window as { gtag?: unknown }).gtag = () => {
      throw new Error('boom');
    };
    expect(() => trackFunnel('auth_view', { from: 'demo' })).not.toThrow();
  });

  it('params 미전달 시에도 app_area 기본값으로 전송한다', () => {
    const gtag = vi.fn();
    (window as { gtag?: unknown }).gtag = gtag;
    trackFunnel('landing_hero_cta_click');
    expect(gtag).toHaveBeenCalledWith('event', 'landing_hero_cta_click', {
      app_area: 'visitor_funnel',
    });
  });
});

describe('trackFunnelOnce', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });
  afterEach(() => {
    delete (window as { gtag?: unknown }).gtag;
  });

  it('같은 세션에서 같은 이벤트는 1회만 전송한다', () => {
    const gtag = vi.fn();
    (window as { gtag?: unknown }).gtag = gtag;
    trackFunnelOnce('demo_start');
    trackFunnelOnce('demo_start');
    trackFunnelOnce('demo_start');
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it('서로 다른 이벤트는 각각 전송된다', () => {
    const gtag = vi.fn();
    (window as { gtag?: unknown }).gtag = gtag;
    trackFunnelOnce('demo_start');
    trackFunnelOnce('social_proof_view');
    expect(gtag).toHaveBeenCalledTimes(2);
  });

  it('sessionStorage 접근 실패 시에도 이벤트는 전송된다(폴백)', () => {
    const gtag = vi.fn();
    (window as { gtag?: unknown }).gtag = gtag;
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('private mode');
    });
    trackFunnelOnce('chat_preview_send');
    expect(gtag).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});

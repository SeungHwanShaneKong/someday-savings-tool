/**
 * [CL-TOP20-P1-TRUST-20260703-010000] TrustSection 검증 — 서로 다른 5 시나리오
 * ① 카드 3장 + "활용 예시" 라벨 렌더(후기 오인 방지)
 * ② 신뢰 앵커 링크 href 정확(trailing-slash canonical)
 * ③ IntersectionObserver 미존재 환경에서 no-throw + 계측 미발생
 * ④ IO 노출 시 social_proof_view 정확히 1회(중복 노출에도 1회 유지)
 * ⑤ 비노출(isIntersecting=false)에서는 계측 없음
 *
 * 주의: embla-carousel 은 내부적으로 IO 를 무조건 생성한다(SlidesInView) — 본 파일의 검증 대상은
 *       TrustSection 자체의 IO 가드/계측이므로, embla 훅은 파일 전역에서 얇은 목으로 대체한다
 *       (실제 jsdom 실행에선 src/test/setup.ts 가 IO 스텁을 제공).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen, act } from '@/test/test-utils';
import TrustSection from '../TrustSection';
import { USAGE_STORIES, USAGE_STORY_LABEL } from '@/content/usage-stories';

/* ─── embla mock — api 없이도 shadcn Carousel 은 안전 렌더(effects 조기 반환) ─── */
vi.mock('embla-carousel-react', () => ({
  default: () => [vi.fn(), undefined],
}));

/* ─── IO mock 헬퍼: 콜백을 캡처해 테스트에서 직접 발화 ─── */
type IOEntry = Pick<IntersectionObserverEntry, 'isIntersecting'>;
type IOCallback = (entries: IOEntry[], observer: unknown) => void;

function installIntersectionObserverMock(): { callbacks: IOCallback[] } {
  const callbacks: IOCallback[] = [];
  class MockIntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
    constructor(cb: IOCallback) {
      callbacks.push(cb);
    }
  }
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  return { callbacks };
}

/** social_proof_view 로 전송된 gtag 호출만 추출 */
function socialProofCalls(spy: ReturnType<typeof vi.fn>) {
  return spy.mock.calls.filter((call) => call[1] === 'social_proof_view');
}

beforeEach(() => {
  // trackFunnelOnce 의 세션 1회 가드 키 초기화(테스트 간 누수 방지)
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as { gtag?: unknown }).gtag;
});

describe('TrustSection — 시나리오 카드/라벨', () => {
  it('T1: 카드 3장(제목 h3)과 카드별 "활용 예시" 라벨이 렌더된다', () => {
    renderWithProviders(<TrustSection />);

    expect(USAGE_STORIES).toHaveLength(3);
    for (const story of USAGE_STORIES) {
      expect(screen.getByRole('heading', { level: 3, name: story.title })).toBeInTheDocument();
      expect(screen.getByText(story.persona)).toBeInTheDocument();
    }
    // 후기 오인 방지 라벨 — 카드마다 1개씩 총 3개
    expect(screen.getAllByText(USAGE_STORY_LABEL)).toHaveLength(3);
    // 섹션 heading 구조(h2)
    expect(screen.getByRole('heading', { level: 2, name: '이렇게 활용해요' })).toBeInTheDocument();
  });
});

describe('TrustSection — 신뢰 앵커 링크', () => {
  it('T2: 데이터 출처·편집 원칙 링크가 trailing-slash canonical href 를 가진다', () => {
    renderWithProviders(<TrustSection />);

    expect(screen.getByRole('link', { name: /데이터 출처·산정 기준 보기/ })).toHaveAttribute(
      'href',
      '/guide/wedding-cost-data/',
    );
    expect(screen.getByRole('link', { name: /편집 원칙 보기/ })).toHaveAttribute(
      'href',
      '/editorial/',
    );
  });
});

describe('TrustSection — 노출 계측(social_proof_view)', () => {
  it('T3: IntersectionObserver 미존재 환경에서도 throw 없이 렌더되고 계측은 발생하지 않는다', () => {
    const gtagSpy = vi.fn();
    vi.stubGlobal('gtag', gtagSpy);
    vi.stubGlobal('IntersectionObserver', undefined);

    expect(() => renderWithProviders(<TrustSection />)).not.toThrow();
    // 가드 no-op → 카드 콘텐츠는 정상, 계측 0회
    expect(screen.getAllByText(USAGE_STORY_LABEL)).toHaveLength(3);
    expect(socialProofCalls(gtagSpy)).toHaveLength(0);
  });

  it('T4: 섹션이 뷰포트에 들어오면 social_proof_view 가 정확히 1회 전송된다(재노출에도 1회)', () => {
    const gtagSpy = vi.fn();
    vi.stubGlobal('gtag', gtagSpy);
    const { callbacks } = installIntersectionObserverMock();

    renderWithProviders(<TrustSection />);
    expect(callbacks.length).toBeGreaterThan(0);

    act(() => {
      callbacks.forEach((cb) => cb([{ isIntersecting: true }], {}));
    });

    const calls = socialProofCalls(gtagSpy);
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('event');
    expect(calls[0][2]).toMatchObject({ app_area: 'visitor_funnel' });

    // 재노출(스크롤로 다시 들어옴)에도 중복 전송 없음 — disconnect + trackFunnelOnce 이중 가드
    act(() => {
      callbacks.forEach((cb) => cb([{ isIntersecting: true }], {}));
    });
    expect(socialProofCalls(gtagSpy)).toHaveLength(1);
  });

  it('T5: 뷰포트에 들어오지 않으면(isIntersecting=false) 계측이 발생하지 않는다', () => {
    const gtagSpy = vi.fn();
    vi.stubGlobal('gtag', gtagSpy);
    const { callbacks } = installIntersectionObserverMock();

    renderWithProviders(<TrustSection />);

    act(() => {
      callbacks.forEach((cb) => cb([{ isIntersecting: false }], {}));
    });
    expect(socialProofCalls(gtagSpy)).toHaveLength(0);
  });
});

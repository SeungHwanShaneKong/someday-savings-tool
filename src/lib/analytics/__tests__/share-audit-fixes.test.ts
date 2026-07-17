// [CL-SHARE-AUDIT-20260717-190000] 공유 카드 P1 적대 감사 — 확정 결함 근본수정의 회귀 가드.
//   각 describe = 감사에서 재현 입증된 결함 1건. 수정을 되돌리면 즉시 RED 가 되도록 계약을 고정한다.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { classifySource, getOrSetFirstTouch, landingPathname } from '../acquisition';
import { trackFunnelOnce } from '../funnel-events';
import { savingCopy, computeShareGrade, computeCategoryHighlights, type ShareGradeItem } from '@/lib/share-grade';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

// ── D2: pathname 기본값이 '현재 경로'에 바인딩돼 라스트터치 집계를 오염 ───────────────────────
describe('AUDIT-D2: 바이럴 경로 분류는 랜딩 전용 — 라스트터치 호출부 오염 금지', () => {
  it('D2.1 classifySource 를 0-인자(라스트터치 호출부 패턴)로 부르면 현재 경로가 /shared 여도 바이럴 미적용', () => {
    // usePageTracking 의 page_views/track-visit 은 매 페이지뷰마다 classifySource() 를 0-인자로 부른다.
    // 이때 '현재 경로'가 신호가 되면 소유자 자기열람·내부 네비까지 share_card 로 기록돼 Admin 유입이 오염.
    const spy = vi.spyOn(window, 'location', 'get');
    spy.mockReturnValue({ ...window.location, pathname: '/shared/tok', search: '', hostname: 'x.com' } as Location);

    expect(classifySource().source).not.toBe('share_card');
    expect(classifySource().source).toBe('direct');
  });

  it('D2.2 랜딩 경로를 명시 주입하면 바이럴 분류(설계 §4.2 의도)', () => {
    expect(classifySource('', '', '', '/shared/tok').source).toBe('share_card');
    expect(classifySource('', '', '', '/invite/tok').source).toBe('partner_invite');
  });

  it('D2.3 getOrSetFirstTouch 는 랜딩 경로를 주입해 바이럴을 기록(유일한 바이럴 소비자)', () => {
    const touch = getOrSetFirstTouch('2026-07-17T00:00:00.000Z', '/shared/tok');
    expect(touch?.source).toBe('share_card');
    expect(touch?.medium).toBe('viral');
  });

  it('D2.4 first-touch 는 최초 1회 불변 — 이후 다른 랜딩 경로로 덮어쓰지 않음', () => {
    getOrSetFirstTouch('2026-07-17T00:00:00.000Z', '/shared/tok');
    const second = getOrSetFirstTouch('2026-07-18T00:00:00.000Z', '/invite/other');
    expect(second?.source).toBe('share_card'); // 최초값 유지
  });

  it('D2.5 landingPathname 은 모듈 로드 시점 값 — 이후 SPA 네비게이션으로 경로가 바뀌어도 불변', () => {
    // 항진 방지: '현재 경로'를 다른 값으로 바꾼 뒤에도 landingPathname() 이 따라 변하지 않아야 한다.
    // (호출 시점 재계산 구현이면 이 단언이 RED — 모듈 상수 캡처 계약의 실효 가드)
    const before = landingPathname();
    const spy = vi.spyOn(window, 'location', 'get');
    spy.mockReturnValue({ ...window.location, pathname: '/some/other/route' } as Location);
    expect(landingPathname()).toBe(before);
    expect(landingPathname()).not.toBe('/some/other/route');
    spy.mockRestore();
  });
});

// ── D6: downloadImage 가 사용자 취소를 '성공'으로 뭉갬 → share_create 부풀림·오해 토스트 ──────
describe('AUDIT-D6: 취소는 성공이 아니다 — 시도/확인된 성공 계약 분리', () => {
  const makeCanvas = () => {
    const c = document.createElement('canvas');
    c.toBlob = ((cb: BlobCallback) => cb(new Blob(['x'], { type: 'image/png' }))) as HTMLCanvasElement['toBlob'];
    return c;
  };

  // downloadImage 는 모듈 레벨 isProcessing 을 1.5s setTimeout 으로 리셋한다(기존 디바운스 설계).
  // 기존 download-image.test.ts 와 동일한 fake timer 규율을 적용해야 케이스 간 '진행 중' 오염이 없다.
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1',
      configurable: true,
    });
  });

  afterEach(() => {
    vi.runAllTimers(); // 디바운스 리셋 소진(다음 케이스 오염 방지)
    vi.useRealTimers();
  });

  it('D6.1 공유 시트 취소(AbortError) → cancelled 반환(구 동작은 shared=성공으로 오인)', async () => {
    const { downloadImage } = await import('@/lib/download-image');
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(Object.assign(new Error('user aborted'), { name: 'AbortError' })),
      configurable: true,
    });

    await expect(downloadImage(makeCanvas(), 'x.png')).resolves.toBe('cancelled');
  });

  it('D6.2 정상 공유는 여전히 shared(회귀 0)', async () => {
    const { downloadImage } = await import('@/lib/download-image');
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    Object.defineProperty(navigator, 'share', { value: vi.fn().mockResolvedValue(undefined), configurable: true });

    await expect(downloadImage(makeCanvas(), 'x.png')).resolves.toBe('shared');
  });
});

// ── D8: share_create 가 다이얼로그 재오픈마다 발화 → K 분모(i) 부풀림(D6 와 동일 클래스) ────────
describe('AUDIT-D8: share_create 는 (채널,예산)당 세션 1회 — 분모 부풀림 차단', () => {
  it('D8.1 같은 채널·같은 예산 반복 발급은 1회만 집계', () => {
    const gtag = vi.fn();
    (window as unknown as { gtag: unknown }).gtag = gtag;

    // Summary.trackShareCreate 의 인스턴스 키 계약과 동일한 형태로 호출
    trackFunnelOnce('share_create', { channel: 'link', grade: 4 }, 'link_budget-1');
    trackFunnelOnce('share_create', { channel: 'link', grade: 4 }, 'link_budget-1');

    expect(gtag.mock.calls.filter((c) => c[1] === 'share_create').length).toBe(1);
  });

  it('D8.2 다른 채널·다른 예산은 각각 집계(정당한 신규 공유는 유실 금지)', () => {
    const gtag = vi.fn();
    (window as unknown as { gtag: unknown }).gtag = gtag;

    trackFunnelOnce('share_create', { channel: 'link' }, 'link_budget-1');
    trackFunnelOnce('share_create', { channel: 'image' }, 'image_budget-1'); // 다른 채널
    trackFunnelOnce('share_create', { channel: 'link' }, 'link_budget-2');   // 다른 예산

    expect(gtag.mock.calls.filter((c) => c[1] === 'share_create').length).toBe(3);
  });
});

// ── D3: once 키가 이벤트명 고정 → 다른 공유 링크 open 전량 유실 ─────────────────────────────
describe('AUDIT-D3: trackFunnelOnce 인스턴스 차원 — 링크별 1회(새로고침만 차단)', () => {
  it('D3.1 instanceId 다르면 각각 발화(다른 공유 링크 = 별개 사건)', () => {
    const gtag = vi.fn();
    (window as unknown as { gtag: unknown }).gtag = gtag;

    trackFunnelOnce('share_open', { grade: 3 }, 'token-A');
    trackFunnelOnce('share_open', { grade: 4 }, 'token-B');

    expect(gtag.mock.calls.filter((c) => c[1] === 'share_open').length).toBe(2);
  });

  it('D3.2 같은 instanceId 재호출은 차단(새로고침 중복 방지 — 설계 의도 보존)', () => {
    const gtag = vi.fn();
    (window as unknown as { gtag: unknown }).gtag = gtag;

    trackFunnelOnce('share_open', { grade: 3 }, 'token-A');
    trackFunnelOnce('share_open', { grade: 3 }, 'token-A');

    expect(gtag.mock.calls.filter((c) => c[1] === 'share_open').length).toBe(1);
  });

  it('D3.3 instanceId 미지정 시 구 계약과 동일(기존 호출부 회귀 0)', () => {
    const gtag = vi.fn();
    (window as unknown as { gtag: unknown }).gtag = gtag;

    trackFunnelOnce('wizard_enter');
    trackFunnelOnce('wizard_enter');

    expect(gtag.mock.calls.filter((c) => c[1] === 'wizard_enter').length).toBe(1);
  });

  it('D3.4 instanceId 는 sessionStorage 키에만 쓰이고 GA4 페이로드로 나가지 않음(§4.1 토큰 금지)', () => {
    const gtag = vi.fn();
    (window as unknown as { gtag: unknown }).gtag = gtag;

    trackFunnelOnce('share_open', { grade: 3 }, 'secret-token');
    const payload = JSON.stringify(gtag.mock.calls.find((c) => c[1] === 'share_open')?.[2]);
    expect(payload).not.toContain('secret-token');
  });
});

// ── D5: savingPercent 표시 상한 부재 → 4자리 % 카피 노출 ────────────────────────────────
describe('AUDIT-D5: savingCopy 표시 상한 — 판정 경로는 불변', () => {
  it('D5.1 정상 범위는 숫자 그대로(회귀 0)', () => {
    expect(savingCopy(12)).toBe('전국 평균보다 12% 알뜰하게 준비 중이에요');
    expect(savingCopy(-30)).toBe('전국 평균보다 30% 프리미엄으로 준비 중이에요 ✨');
  });

  it('D5.2 극단값은 자릿수 노출 없이 정성 문구로 전환(비난 없는 톤 유지)', () => {
    expect(savingCopy(-1900)).toBe('평균보다 넉넉하게 준비 중이에요 ✨');
    expect(savingCopy(-1900)).not.toMatch(/[0-9]/);
    expect(savingCopy(500)).toBe('전국 평균보다 아주 알뜰하게 준비 중이에요');
    expect(savingCopy(500)).not.toMatch(/[0-9]/);
  });

  it('D5.3 상한은 표시 전용 — computeShareGrade 의 절약률/등급 산출은 클램프되지 않음', () => {
    // 1개 항목만 평균의 20배 → 절약률 -1900%(발산). 등급 판정은 이 원값을 그대로 써야 계약 일관.
    const items: ShareGradeItem[] = [
      { category: 'main-ceremony', sub_category: 'venue-fee', amount: 3_500_000 * 20 },
    ];
    const g = computeShareGrade(items);
    expect(g.savingPercent).toBe(-1900); // 원값 보존(GA4·등급 임계용)
    expect(g.grade).toBe(1); // 완성도 17% → 1등급
  });
});

// ── D7: computeCategoryHighlights 입력 가드 비대칭 ─────────────────────────────────────
describe('AUDIT-D7: 등급과 하이라이트가 동일 정규화 공유(가드 대칭)', () => {
  const dirty = [
    null,
    { category: 'main-ceremony', sub_category: 'venue-fee', amount: Number.NaN },
    { category: 'main-ceremony', sub_category: 'venue-fee', amount: Number.POSITIVE_INFINITY },
    { category: 'main-ceremony', sub_category: 'venue-fee', amount: 1_750_000 }, // 평균 350만의 50%
  ] as unknown as ShareGradeItem[];

  it('D7.1 null·NaN·Infinity 원소가 섞여도 하이라이트가 throw 하지 않음', () => {
    expect(() => computeCategoryHighlights(dirty)).not.toThrow();
    expect(computeCategoryHighlights(dirty).saved?.categoryId).toBe('main-ceremony');
  });

  it('D7.2 비배열 입력도 등급과 동일하게 안전(둘 다 빈 결과)', () => {
    expect(computeShareGrade(undefined as unknown as ShareGradeItem[]).grade).toBe(1);
    expect(computeCategoryHighlights(undefined as unknown as ShareGradeItem[])).toEqual({
      saved: null,
      invested: null,
    });
  });

  it('D7.3 등급과 하이라이트가 같은 항목 집합을 본다(불일치 구조 제거)', () => {
    // NaN 항목이 한쪽에만 반영되면 등급은 절약으로, 배지는 미산출로 갈릴 수 있었다.
    const g = computeShareGrade(dirty);
    const h = computeCategoryHighlights(dirty);
    expect(g.savingPercent).toBe(50);
    expect(h.saved?.savingPercent).toBe(50); // 동일 정규화 → 동일 수치
  });
});

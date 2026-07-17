// [CL-SHARE-P1-20260717-170000] SharedBudget — 공유 카드 P1(등급 히어로·호기심 CTA·바이럴 계측·noindex).
//   설계 DoD #1·#3(docs/growth-share-card-design.md §6). 계측 페이로드 스냅샷으로 파라미터 드리프트 방지.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, fireEvent } from '@/test/test-utils';
import { AVERAGE_COSTS } from '@/lib/average-costs';
import { BUDGET_CATEGORIES } from '@/lib/budget-categories';

const h = vi.hoisted(() => ({
  auth: { user: null as null | { id: string }, loading: false },
  rpc: vi.fn(),
  navigate: vi.fn(),
  params: { token: 'tok-abc' as string | undefined },
  gtag: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => h.auth }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: h.rpc } }));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => h.navigate, useParams: () => h.params };
});

import SharedBudget from '../SharedBudget';

/** 평균×ratio 로 N개 카테고리를 채운 RPC 행(등급 결정론 제어). */
const rowsFor = (n: number, ratio: number) =>
  BUDGET_CATEGORIES.slice(0, n).map((c) => {
    const [subId, data] = Object.entries(AVERAGE_COSTS[c.id]).find(([, d]) => d.amount > 0)!;
    return {
      budget_id: 'b1',
      category: c.id,
      sub_category: subId,
      amount: Math.round(data.amount * ratio),
      is_paid: false,
      notes: null,
      budget_owner_id: 'owner-1',
    };
  });

/** GA4 이벤트 캡처 헬퍼 — window.gtag 스텁. */
const eventsOf = (name: string) =>
  h.gtag.mock.calls.filter((c) => c[0] === 'event' && c[1] === name).map((c) => c[2]);

beforeEach(() => {
  h.rpc.mockReset();
  h.navigate.mockReset();
  h.gtag.mockReset();
  h.auth.user = null;
  h.auth.loading = false;
  h.params.token = 'tok-abc';
  sessionStorage.clear();
  (window as unknown as { gtag: unknown }).gtag = h.gtag;
});

describe('SB: 등급 히어로 카드 렌더 (DoD #3)', () => {
  it('SB.1 5등급(완성도 100·절약 20%) 공유 → 등급 라벨·완성도·평균 대비 카피 노출', async () => {
    h.rpc.mockResolvedValue({ data: rowsFor(6, 0.8), error: null });
    renderWithProviders(<SharedBudget />);

    const card = await screen.findByRole('region', { name: '예산 등급 카드' });
    expect(card).toBeInTheDocument();
    expect(screen.getByText('웨딩 재테크 만렙')).toBeInTheDocument();
    expect(screen.getByText('Lv.5')).toBeInTheDocument();
    expect(screen.getByText('전국 평균보다 20% 알뜰하게 준비 중이에요')).toBeInTheDocument();
    // 완성도 게이지(a11y)
    expect(screen.getByRole('progressbar', { name: '예산 완성도' })).toHaveAttribute('aria-valuenow', '100');
  });

  it('SB.2 평균 초과(1.5배) → 비난 없는 프리미엄 카피 + 2등급(소외 금지 계약)', async () => {
    h.rpc.mockResolvedValue({ data: rowsFor(6, 1.5), error: null });
    renderWithProviders(<SharedBudget />);

    expect(await screen.findByText('야무진 플래너')).toBeInTheDocument();
    expect(screen.getByText(/프리미엄으로 준비 중이에요/)).toBeInTheDocument();
    expect(screen.queryByText(/과소비|초과했어요/)).toBeNull();
  });

  it('SB.3 카드에 절대 금액 미표시(카드 자체 금액 비노출 규율)', async () => {
    h.rpc.mockResolvedValue({ data: rowsFor(6, 0.8), error: null });
    renderWithProviders(<SharedBudget />);

    const card = await screen.findByRole('region', { name: '예산 등급 카드' });
    // 원 단위 금액 표기(예: '1,160만원'/'11,600,000')가 카드 내부에 없어야 한다
    expect(card.textContent).not.toMatch(/[0-9,]+\s*원/);
    expect(card.textContent).not.toMatch(/만원/);
  });
});

describe('SB: 바이럴 계측 (DoD #1 — 페이로드 스냅샷·PII 0)', () => {
  it('SB.4 share_open — RPC 성공 직후 1회, 등급·레벨·세션여부만(토큰·금액 0)', async () => {
    h.rpc.mockResolvedValue({ data: rowsFor(6, 0.8), error: null });
    renderWithProviders(<SharedBudget />);

    await waitFor(() => expect(eventsOf('share_open').length).toBe(1));
    const p = eventsOf('share_open')[0];
    expect(p).toMatchObject({ grade: 5, privacy_level: 'full', has_session: false });
    // 금지 계약: 토큰·절대금액·PII 0
    const serialized = JSON.stringify(p);
    expect(serialized).not.toContain('tok-abc');
    expect(serialized).not.toContain('11600000');
    expect(Object.keys(p).sort()).toEqual(['app_area', 'grade', 'has_session', 'privacy_level']);
  });

  it('SB.5 share_open 은 세션 1회 — 재마운트(새로고침 상당)에도 중복 발화 없음', async () => {
    h.rpc.mockResolvedValue({ data: rowsFor(6, 0.8), error: null });
    const first = renderWithProviders(<SharedBudget />);
    await waitFor(() => expect(eventsOf('share_open').length).toBe(1));
    first.unmount();

    renderWithProviders(<SharedBudget />);
    await waitFor(() => expect(screen.getByRole('region', { name: '예산 등급 카드' })).toBeInTheDocument());
    expect(eventsOf('share_open').length).toBe(1); // trackFunnelOnce 가드
  });

  it('SB.6 소유자 본인 열람은 share_open 미발화(바이럴 지표 오염 방지)', async () => {
    h.auth.user = { id: 'owner-1' }; // rowsFor 의 budget_owner_id 와 동일
    h.rpc.mockResolvedValue({ data: rowsFor(6, 0.8), error: null });
    renderWithProviders(<SharedBudget />);

    await waitFor(() => expect(screen.getByText('내 대시보드로 가기')).toBeInTheDocument());
    expect(eventsOf('share_open').length).toBe(0);
  });

  it('SB.7 has_session — 로그인 상태(비소유자)면 true', async () => {
    h.auth.user = { id: 'someone-else' };
    h.rpc.mockResolvedValue({ data: rowsFor(6, 0.8), error: null });
    renderWithProviders(<SharedBudget />);

    await waitFor(() => expect(eventsOf('share_open').length).toBe(1));
    expect(eventsOf('share_open')[0]).toMatchObject({ has_session: true });
  });

  // [CL-SHARE-AUDIT-D4-20260717-190000] 인증 미확정(loading=true) 윈도우 가드 — 이 케이스가 없으면
  //  authLoading 게이트를 지워도 테스트가 통과해(무가드) 소유자 오계측 결함이 재발한다.
  it('SB.15 authLoading=true 동안 share_open 보류 → 인증 확정 후 정확히 1회 발화', async () => {
    h.auth.loading = true;
    h.auth.user = null; // 미확정 윈도우: user 는 아직 null 이지만 실제로는 소유자일 수 있다
    h.rpc.mockResolvedValue({ data: rowsFor(6, 0.8), error: null });
    const view = renderWithProviders(<SharedBudget />);

    // 카드는 렌더되지만(데이터 도착) 계측은 보류 — user=null 을 '비로그인'으로 단정하지 않는다
    await screen.findByRole('region', { name: '예산 등급 카드' });
    expect(eventsOf('share_open').length).toBe(0);

    // 인증 확정(비소유자로 판명) → 발화
    h.auth.loading = false;
    h.auth.user = { id: 'someone-else' };
    view.rerender(<SharedBudget />);
    await waitFor(() => expect(eventsOf('share_open').length).toBe(1));
    expect(eventsOf('share_open')[0]).toMatchObject({ has_session: true });
  });

  it('SB.16 미확정 윈도우에서 소유자로 판명되면 끝까지 미발화(오계측 0)', async () => {
    h.auth.loading = true;
    h.auth.user = null;
    h.rpc.mockResolvedValue({ data: rowsFor(6, 0.8), error: null });
    const view = renderWithProviders(<SharedBudget />);
    await screen.findByRole('region', { name: '예산 등급 카드' });

    h.auth.loading = false;
    h.auth.user = { id: 'owner-1' }; // 실제로는 소유자였다
    view.rerender(<SharedBudget />);

    await waitFor(() => expect(screen.getByText('내 대시보드로 가기')).toBeInTheDocument());
    expect(eventsOf('share_open').length).toBe(0);
  });

  // [CL-SHARE-AUDIT-D3-20260717-190000] 링크별 1회 — 다른 토큰은 각각 집계(과소집계 가드)
  it('SB.17 같은 세션에서 다른 공유 링크를 열면 share_open 이 각각 발화', async () => {
    h.rpc.mockResolvedValue({ data: rowsFor(6, 0.8), error: null });
    const first = renderWithProviders(<SharedBudget />);
    await waitFor(() => expect(eventsOf('share_open').length).toBe(1));
    first.unmount();

    h.params.token = 'tok-DIFFERENT';
    renderWithProviders(<SharedBudget />);
    await waitFor(() => expect(eventsOf('share_open').length).toBe(2));
  });
});

describe('SB: 호기심 CTA (설계 §2.3 — returnTo state 계약)', () => {
  it('SB.8 히어로 CTA 클릭 → share_cta_click(cta:hero) + /auth 로 returnTo state 이동', async () => {
    h.rpc.mockResolvedValue({ data: rowsFor(6, 0.8), error: null });
    renderWithProviders(<SharedBudget />);

    // CTA 는 히어로 + 배너 2개 — [0] = 히어로(DOM 순서 = 시각 순서)
    const ctas = await screen.findAllByRole('button', { name: /내 예산 등급 확인하기/ });
    fireEvent.click(ctas[0]);

    expect(eventsOf('share_cta_click')[0]).toMatchObject({ cta: 'hero', grade: 5 });
    // Auth 는 쿼리파람을 읽지 않는다 — 반드시 라우터 state 계약(?from= 금지)
    expect(h.navigate).toHaveBeenCalledWith('/auth', { state: { returnTo: '/budget' } });
  });

  it('SB.9 하단 배너 CTA 클릭 → cta:banner 로 구분 발화', async () => {
    h.rpc.mockResolvedValue({ data: rowsFor(6, 0.8), error: null });
    renderWithProviders(<SharedBudget />);

    const ctas = await screen.findAllByRole('button', { name: /내 예산 등급 확인하기/ });
    expect(ctas.length).toBe(2); // 히어로 + 배너
    fireEvent.click(ctas[1]);

    expect(eventsOf('share_cta_click')[0]).toMatchObject({ cta: 'banner' });
    expect(h.navigate).toHaveBeenCalledWith('/auth', { state: { returnTo: '/budget' } });
  });

  it('SB.10 구 CTA("무료로 시작하기"·홈 이동)는 제거됨(회귀 가드)', async () => {
    h.rpc.mockResolvedValue({ data: rowsFor(6, 0.8), error: null });
    renderWithProviders(<SharedBudget />);

    await screen.findByRole('region', { name: '예산 등급 카드' });
    expect(screen.queryByRole('button', { name: '무료로 시작하기' })).toBeNull();
  });
});

describe('SB: SEO·엣지', () => {
  it('SB.11 noindex 메타 주입(공유 URL 대량 색인 차단 — 설계 §6)', async () => {
    h.rpc.mockResolvedValue({ data: rowsFor(6, 0.8), error: null });
    renderWithProviders(<SharedBudget />);

    await screen.findByRole('region', { name: '예산 등급 카드' });
    const robots = document.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute('content')).toContain('noindex');
  });

  it('SB.12 RPC 빈 응답 → 에러 화면·카드 미렌더·계측 0(없는 등급 발명 금지)', async () => {
    h.rpc.mockResolvedValue({ data: [], error: null });
    renderWithProviders(<SharedBudget />);

    expect(await screen.findByText('공유 링크가 만료되었거나 존재하지 않아요')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '예산 등급 카드' })).toBeNull();
    expect(eventsOf('share_open').length).toBe(0);
  });

  it('SB.13 RPC amount 가 문자열(numeric)로 와도 등급이 NaN 오염되지 않음', async () => {
    const rows = rowsFor(6, 0.8).map((r) => ({ ...r, amount: String(r.amount) }));
    h.rpc.mockResolvedValue({ data: rows, error: null });
    renderWithProviders(<SharedBudget />);

    expect(await screen.findByText('웨딩 재테크 만렙')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '예산 완성도' })).toHaveAttribute('aria-valuenow', '100');
  });

  it('SB.14 gtag 부재(차단기·프리렌더)에서도 렌더·CTA 가 throw 없이 동작(UX 비차단 원칙)', async () => {
    delete (window as unknown as { gtag?: unknown }).gtag;
    h.rpc.mockResolvedValue({ data: rowsFor(6, 0.8), error: null });
    renderWithProviders(<SharedBudget />);

    const ctas = await screen.findAllByRole('button', { name: /내 예산 등급 확인하기/ });
    expect(() => fireEvent.click(ctas[0])).not.toThrow();
    expect(h.navigate).toHaveBeenCalledWith('/auth', { state: { returnTo: '/budget' } });
  });
});

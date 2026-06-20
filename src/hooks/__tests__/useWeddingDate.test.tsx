// [CL-COVERAGE50-20260620] useWeddingDate 단위 검증 — 미테스트 영역 커버리지 보강
//
// 계약(contract): useWeddingDate 는 "결혼 D-day 데이터 레이어"다.
//  - 마운트(user 있음) → 첫 예산(budgets, created_at ASC limit 1)의 wedding_date/wedding_time 로드
//  - user 없음 → 상태 null 고정 + loading 즉시 종료(인증 게이트), 네트워크 0
//  - updateWeddingDate(date,time) → 모든 예산 update 후 낙관적 로컬 반영 + 성공 toast
//  - fetch 에러는 삼켜서(swallow) UI 폭주 방지하되 loading 은 반드시 false 로 종단
//  - 저장된 날짜는 "yyyy-MM-dd" 문자열 그대로(과거/오늘/미래 모두) 가공 없이 노출
//    (D-day 시각 계산은 WeddingCountdown.calculateCountdown 책임; 훅은 원천 데이터만 관리)
//
// 결정론: vi.useFakeTimers + setSystemTime('2026-06-20T00:00:00Z') 고정.
//         과거/오늘/미래 날짜를 시스템시각 기준으로 구성해 "훅이 어떤 날짜든 그대로 surface"함을 검증.
// 격리: supabase 는 setup.ts 전역 mock. 여기선 from() 을 테이블별 controlled chain 으로 오버라이드.
//       useAuth / use-toast 는 본 파일에서 직접 모킹(가변 홀더 + spy).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { supabase } from '@/integrations/supabase/client';
import { useWeddingDate } from '@/hooks/useWeddingDate';

// 고정 시스템 시각 — 모든 과거/오늘/미래 판정의 기준점
const FIXED_NOW = new Date('2026-06-20T00:00:00Z');

// 가짜 타이머 환경에서 @testing-library 의 waitFor 는 real-timer 폴링에 의존해 멈춘다.
// 훅의 비동기 상태는 Promise(마이크로태스크)로만 해소되므로, act 안에서 마이크로태스크를
// 충분히 flush 하면 결정론적으로 상태가 안정화된다(타이머 무관, setSystemTime 고정 유지).
async function flush() {
  await act(async () => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
  });
}

// useAuth: hoisted 가변 홀더 — 테스트별 user 교체(인증 게이트 검증)
const h = vi.hoisted(() => ({ user: { id: 'user-1' } as { id: string } | null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: h.user }) }));

// use-toast: 호출 인자 단언을 위해 spy 로 모킹
const toastSpy = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastSpy }) }));

/**
 * 체이너블 쿼리 mock.
 *  - select(...).eq(...).order(...).limit(...).maybeSingle()  → maybe 결과(단건)
 *  - update(...).eq(...)                                       → await(then) 시 mutate 결과
 * 두 종단(maybeSingle / then)에 서로 다른 결과를 주입할 수 있다.
 */
function chain(opts: { maybe?: unknown; mutate?: unknown } = {}) {
  const maybe = opts.maybe ?? { data: null, error: null };
  const mutate = opts.mutate ?? { data: null, error: null };
  const q: Record<string, unknown> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'order', 'limit', 'single'];
  for (const m of methods) q[m] = vi.fn(() => q);
  q.maybeSingle = vi.fn(() => Promise.resolve(maybe));
  // thenable → update 경로의 await 종단
  (q as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(mutate).then(resolve);
  return q;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
  h.user = { id: 'user-1' };
  toastSpy.mockReset();
  vi.mocked(supabase.from).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useWeddingDate — fetch (마운트 데이터 로드)', () => {
  it('UT.1 미래 결혼일: 첫 예산의 wedding_date/wedding_time 을 그대로 노출하고 loading=false', async () => {
    // 시스템시각(2026-06-20) 기준 미래 날짜 — 가장 일반적인 happy path
    vi.mocked(supabase.from).mockImplementation((table: string) =>
      (table === 'budgets'
        ? chain({ maybe: { data: { wedding_date: '2026-10-10', wedding_time: '13:00:00' }, error: null } })
        : chain()) as never,
    );

    const { result } = renderHook(() => useWeddingDate());

    await flush();
    expect(result.current.loading).toBe(false);
    expect(result.current.weddingDate).toBe('2026-10-10');
    expect(result.current.weddingTime).toBe('13:00:00');
    // 데이터 출처 계약: budgets 테이블을 조회했는가
    expect(supabase.from).toHaveBeenCalledWith('budgets');
  });

  it('UT.2 과거/오늘 경계: 어제·오늘·내일 날짜 모두 가공 없이 surface (D-day 판정은 소비자 책임)', async () => {
    // 훅은 날짜를 "해석"하지 않고 원천 문자열만 보존한다는 계약을 경계값 3종으로 고정.
    const cases: Array<{ label: string; date: string }> = [
      { label: '과거(어제)', date: '2026-06-19' },
      { label: '오늘', date: '2026-06-20' },
      { label: '미래(내일)', date: '2026-06-21' },
    ];

    for (const c of cases) {
      vi.mocked(supabase.from).mockImplementation((table: string) =>
        (table === 'budgets'
          ? chain({ maybe: { data: { wedding_date: c.date, wedding_time: null }, error: null } })
          : chain()) as never,
      );

      const { result, unmount } = renderHook(() => useWeddingDate());
      await flush();
      expect(result.current.loading).toBe(false);
      // 핵심: 과거든 오늘이든 미래든 훅은 동일하게 원본을 그대로 반환(임의 클램핑/널처리 금지)
      expect(result.current.weddingDate, c.label).toBe(c.date);
      expect(result.current.weddingTime, c.label).toBeNull();
      unmount();
    }
  });

  it('UT.3 빈 결과(maybeSingle data=null): 예산이 없으면 상태는 null 유지 + loading 종단', async () => {
    // 신규 사용자(예산 0) 경계 — data 가 null 이면 setState 분기를 타지 않아야 하고 크래시 없어야 함
    vi.mocked(supabase.from).mockImplementation((table: string) =>
      (table === 'budgets' ? chain({ maybe: { data: null, error: null } }) : chain()) as never,
    );

    const { result } = renderHook(() => useWeddingDate());

    await flush();
    expect(result.current.loading).toBe(false);
    expect(result.current.weddingDate).toBeNull();
    expect(result.current.weddingTime).toBeNull();
  });

  it('UT.4 fetch 에러: 에러를 삼켜 상태는 null 유지하되 loading 은 반드시 false 로 종단', async () => {
    // 계약: catch 가 에러를 console 로만 처리(throw 안 함) → finally 에서 loading=false.
    // 에러 시 무한 스피너(loading=true 고착)는 회귀 버그이므로 가드.
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(supabase.from).mockImplementation((table: string) =>
      (table === 'budgets'
        ? chain({ maybe: { data: null, error: { message: 'db down' } } })
        : chain()) as never,
    );

    const { result } = renderHook(() => useWeddingDate());

    await flush();
    expect(result.current.loading).toBe(false);
    expect(result.current.weddingDate).toBeNull();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe('useWeddingDate — 인증 게이트 / update', () => {
  it('AC.1 user 없음: 상태 null 고정 + loading 즉시 false + budgets 조회 안 함(네트워크 0)', async () => {
    h.user = null;

    const { result } = renderHook(() => useWeddingDate());

    await flush();
    expect(result.current.loading).toBe(false);
    expect(result.current.weddingDate).toBeNull();
    expect(result.current.weddingTime).toBeNull();
    // 미인증 상태에서 DB 를 건드리면 RLS 낭비/오류 → from 미호출이어야 함
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('AC.2 updateWeddingDate(미래일): update 후 낙관적 로컬 반영 + 성공 toast(날짜·시간 표기)', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) =>
      (table === 'budgets'
        ? chain({ maybe: { data: null, error: null }, mutate: { data: null, error: null } })
        : chain()) as never,
    );

    const { result } = renderHook(() => useWeddingDate());
    await flush();
    expect(result.current.loading).toBe(false);
    toastSpy.mockReset(); // 마운트 단계 외 호출만 검증

    await act(async () => {
      await result.current.updateWeddingDate('2026-12-25', '11:30:00');
    });

    // 낙관적 반영: 서버 재조회 없이 즉시 로컬 상태 갱신
    expect(result.current.weddingDate).toBe('2026-12-25');
    expect(result.current.weddingTime).toBe('11:30:00');
    // 성공 토스트 1회 + 설명에 날짜와 시간이 결합되어 들어감
    expect(toastSpy).toHaveBeenCalledTimes(1);
    const arg = toastSpy.mock.calls[0][0];
    expect(arg.title).toBe('결혼 일정이 저장되었어요');
    expect(arg.description).toContain('2026-12-25');
    expect(arg.description).toContain('11:30:00');
    expect(arg.variant).toBeUndefined(); // 성공이므로 destructive 아님
  });

  it('AC.3 updateWeddingDate(null,null): 일정 초기화 — 상태 null + "초기화" 안내 toast', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) =>
      (table === 'budgets'
        ? chain({ maybe: { data: { wedding_date: '2026-10-10', wedding_time: '13:00:00' }, error: null } })
        : chain()) as never,
    );

    const { result } = renderHook(() => useWeddingDate());
    await flush();
    expect(result.current.weddingDate).toBe('2026-10-10');
    toastSpy.mockReset();

    await act(async () => {
      await result.current.updateWeddingDate(null, null);
    });

    expect(result.current.weddingDate).toBeNull();
    expect(result.current.weddingTime).toBeNull();
    const arg = toastSpy.mock.calls[0][0];
    expect(arg.description).toBe('일정이 초기화되었습니다.');
  });

  it('AC.4 update 에러: destructive toast 출력 + 로컬 상태는 갱신되지 않음(낙관적 반영 차단)', async () => {
    // 서버 update 가 실패하면 throw → catch 에서 destructive toast.
    // 이때 setWeddingDate 는 throw 이후 라인이라 실행되지 않아야 한다(잘못된 D-day 표시 방지).
    vi.mocked(supabase.from).mockImplementation((table: string) =>
      (table === 'budgets'
        ? chain({ maybe: { data: null, error: null }, mutate: { data: null, error: { message: '권한 없음' } } })
        : chain()) as never,
    );

    const { result } = renderHook(() => useWeddingDate());
    await flush();
    expect(result.current.loading).toBe(false);
    toastSpy.mockReset();

    await act(async () => {
      await result.current.updateWeddingDate('2027-01-01', '10:00:00');
    });

    // 실패 시 로컬 상태 오염 금지
    expect(result.current.weddingDate).toBeNull();
    expect(result.current.weddingTime).toBeNull();
    // destructive toast + 에러 메시지 전달
    const arg = toastSpy.mock.calls[0][0];
    expect(arg.variant).toBe('destructive');
    expect(arg.title).toBe('저장 중 오류가 발생했어요');
    expect(arg.description).toBe('권한 없음');
  });

  it('AC.5 미인증 update: user 없으면 DB·toast 모두 미발생(조용히 no-op)', async () => {
    h.user = null;

    const { result } = renderHook(() => useWeddingDate());
    await flush();
    expect(result.current.loading).toBe(false);
    vi.mocked(supabase.from).mockClear();
    toastSpy.mockReset();

    await act(async () => {
      await result.current.updateWeddingDate('2026-09-09', '09:00:00');
    });

    // 인증 전 저장 시도는 조용히 무시 — 부수효과(쿼리/토스트) 0
    expect(supabase.from).not.toHaveBeenCalled();
    expect(toastSpy).not.toHaveBeenCalled();
    expect(result.current.weddingDate).toBeNull();
  });
});

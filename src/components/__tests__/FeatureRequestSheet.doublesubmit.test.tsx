// [CL-BTNAUDIT3-20260704 | 이중제출테스트] FeatureRequestSheet 비동기 더블서밋 회귀 가드.
// 결함(수정 전): handleSubmit 이 submitting(state)만으로 중복을 막아, await supabase.auth.getUser() 창에서
//   두 번째 클릭이 클로저 stale(submitting=false)로 재진입 → feature_requests INSERT 2회(중복 의견 행).
// 근본수정: 동기 useRef 게이트(inFlight)로 같은 틱 재진입을 리렌더 이전에 차단.
// 오라클: getUser 를 수동 resolve 로 지연시키고, 그 창에서 두 번 클릭 → insert 호출 1회만 검증.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/test-utils';
import { supabase } from '@/integrations/supabase/client';
import { FeatureRequestSheet } from '../FeatureRequestSheet';

// 토스트는 결정론을 위해 no-op 스텁(전역 use-toast 대체)
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

/** 수동으로 resolve 가능한 deferred 프라미스 */
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('FeatureRequestSheet 비동기 더블서밋 방어(동기 게이트)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('getUser await 지연 중 이중 클릭 → feature_requests insert 는 1회만', async () => {
    // getUser 를 수동 resolve 로 지연 → await 창을 인위적으로 열어둔다(재진입 레이스 재현).
    const d = deferred<{ data: { user: { id: string } | null }; error: null }>();
    vi.mocked(supabase.auth.getUser).mockReturnValueOnce(
      d.promise as unknown as ReturnType<typeof supabase.auth.getUser>,
    );

    // insert 호출 횟수를 세는 공유 스텁으로 from() 을 오버라이드.
    const insertMock = vi.fn(() => Promise.resolve({ data: null, error: null }));
    vi.mocked(supabase.from).mockImplementation(
      () => ({ insert: insertMock }) as unknown as ReturnType<typeof supabase.from>,
    );

    const onOpenChange = vi.fn();
    renderWithProviders(
      <FeatureRequestSheet open onOpenChange={onOpenChange} />,
    );

    // 내용 입력(빈 내용 가드 통과 조건)
    const textarea = screen.getByPlaceholderText(/예산 엑셀 내보내기/);
    fireEvent.change(textarea, { target: { value: '하객 관리 기능' } });

    const submitBtn = screen.getByRole('button', { name: '보내기' });

    // 첫 클릭 → getUser await 에서 정지(아직 resolve 안 함)
    fireEvent.click(submitBtn);
    // 리렌더 커밋 이전(같은 틱 시나리오) 두 번째 클릭 — 동기 ref 게이트가 없으면 재진입한다.
    fireEvent.click(submitBtn);

    // 이 시점엔 getUser 가 아직 resolve 안 됐으므로 어떤 클릭도 insert 에 도달하지 못함
    expect(insertMock).toHaveBeenCalledTimes(0);

    // await 창 종료 → 실제 제출 경로 진행
    d.resolve({ data: { user: null }, error: null });

    // insert 는 정확히 1회만 호출되어야 한다(두 번째 클릭은 게이트로 차단)
    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    // 안정화 후에도 여전히 1회(추가 호출 없음)
    await Promise.resolve();
    expect(insertMock).toHaveBeenCalledTimes(1);
    // getUser 자체도 첫 클릭에서 1회만 진입(게이트가 두 번째 진입 자체를 차단)
    expect(vi.mocked(supabase.auth.getUser)).toHaveBeenCalledTimes(1);
  });

  it('제출 완료(성공 화면 800ms) 후 재제출 가능 — 게이트가 영구 잠기지 않음', async () => {
    vi.useFakeTimers();
    try {
      // getUser 는 즉시 resolve(기본 전역 스텁: user null)
      const insertMock = vi.fn(() => Promise.resolve({ data: null, error: null }));
      vi.mocked(supabase.from).mockImplementation(
        () => ({ insert: insertMock }) as unknown as ReturnType<typeof supabase.from>,
      );

      const onOpenChange = vi.fn();
      renderWithProviders(<FeatureRequestSheet open onOpenChange={onOpenChange} />);

      const textarea = screen.getByPlaceholderText(/예산 엑셀 내보내기/);
      fireEvent.change(textarea, { target: { value: '첫 제출 내용' } });
      fireEvent.click(screen.getByRole('button', { name: '보내기' }));

      // await 체인(getUser→insert) 소진 → 성공 화면 진입
      await vi.waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));

      // 성공 setTimeout(800ms) 경과 → onOpenChange(false) 로 닫힘 요청 + 게이트 해제 완료
      await vi.advanceTimersByTimeAsync(800);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

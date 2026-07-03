/**
 * [CL-SEC-AUDIT-20260703-101500] 보안감사 취약점 #6 — clearMessages 미처리 promise reject 근본수정 회귀 가드.
 *
 * 근본원인(수정 전): clearMessages 가 `await untypedSupabase...update(...)` 를 try/catch 없이 await →
 *   Supabase 실패(네트워크·auth·DB) 시 unhandled promise rejection 이 onClick 핸들러로 전파(콘솔 미처리 거부/잠재 크래시).
 * 근본수정: 서버 삭제 실패를 try/catch 로 격리 — 로컬 messages/state 클리어는 항상 성공(서버 실패와 분리),
 *   서버 실패는 debug 로깅으로 흡수(증상무마 빈 catch 아님, UI 일관성 보장).
 *
 * 이 스위트는 훅의 실제 구현을 렌더(mock 아님)하고 supabase update 를 reject 시켜
 *   ①수정 전 미처리 거부(reject 전파) ②수정 후 안전 처리(throw 0·로컬 클리어 보장)를 입증한다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAIChat } from '@/hooks/useAIChat';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 't@t.com' }, loading: false, session: null }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ── supabase.from() 체이너블 스텁 팩토리 ──────────────────────────────────────
// 전역 setup.ts mock 은 update 체인을 항상 resolve 시키므로, 이 스위트는 from() 을
// 시나리오별 스텁으로 오버라이드해 ①초기 대화 로드(conversationId 세팅) ②update reject 를 주입한다.
// 완전 체이너블 쿼리빌더 — 모든 필터/정렬 메서드가 자신을 반환(임의 체이닝 길이 지원).
// update 실패 주입은 rejectOnUpdate 플래그로 제어: update() 호출 이후의 최종 await(.eq)가 reject.
const CHAIN_METHODS = [
  'select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'order', 'limit', 'range',
  'match', 'filter', 'is', 'in', 'gte', 'lte', 'gt', 'lt', 'like', 'ilike', 'or', 'not',
] as const;

interface StubOptions {
  /** select().…maybeSingle()/single() 이 반환할 데이터(초기 대화 로드용) */
  loadData?: { id: string; messages: unknown[] } | null;
  /** true 면 update() 이후 체인의 최종 await 가 이 에러로 reject */
  rejectUpdateWith?: Error;
}

function makeStub(opts: StubOptions = {}): Record<string, unknown> {
  const { loadData = null, rejectUpdateWith } = opts;
  let inUpdatePath = false;

  const q: Record<string, unknown> = {};
  for (const m of CHAIN_METHODS) {
    q[m] = vi.fn(() => {
      if (m === 'update') inUpdatePath = true;
      return q;
    });
  }
  q.maybeSingle = vi.fn(async () => ({ data: loadData, error: null }));
  q.single = vi.fn(async () => ({ data: loadData, error: null }));

  // await q → thenable. update 경로면 reject(주입 시), 아니면 정상 resolve.
  q.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
    if (inUpdatePath && rejectUpdateWith) {
      const p = Promise.reject(rejectUpdateWith);
      return reject ? p.catch(reject) : p;
    }
    return Promise.resolve({ data: [], error: null }).then(resolve);
  };
  return q;
}

const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;

describe('[SEC #6] useAIChat.clearMessages — 서버 삭제 실패 격리(미처리 reject 근본수정)', () => {
  const unhandled: unknown[] = [];
  const onUnhandled = (e: PromiseRejectionEvent) => {
    unhandled.push(e.reason);
    e.preventDefault?.();
  };

  beforeEach(() => {
    unhandled.length = 0;
    fromMock.mockReset();
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', onUnhandled);
    }
  });

  afterEach(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('unhandledrejection', onUnhandled);
    }
  });

  /**
   * SC6.1 [핵심] update reject 시 clearMessages 는 throw 하지 않는다(미처리 거부 근절).
   *   수정 전: clearMessages 의 await 가 reject 전파 → act 가 throw → 이 테스트 red.
   *   수정 후: try/catch 흡수 → resolve → green.
   */
  it('SC6.1: supabase update 가 reject 해도 clearMessages 는 throw 하지 않는다', async () => {
    const err = new Error('network down');
    // 첫 from(): 초기 대화 로드(conversationId 세팅) — 이후 from(): update reject
    fromMock
      .mockReturnValueOnce(makeStub({ loadData: { id: 'conv-1', messages: [{ role: 'user', content: '안녕', timestamp: 't' }] } }))
      .mockReturnValue(makeStub({ rejectUpdateWith: err }));

    const { result } = renderHook(() => useAIChat({ feature: 'qa' }));

    // 초기 로드가 conversationId 를 세팅할 때까지 대기(=update 경로가 실행되는 조건)
    await waitFor(() => expect(result.current.messages.length).toBeGreaterThan(0));

    // clearMessages 호출 — reject 가 전파되면 이 expect 가 실패(red 입증)
    let threw: unknown = null;
    await act(async () => {
      try {
        await result.current.clearMessages();
      } catch (e) {
        threw = e;
      }
    });

    expect(threw, 'clearMessages 가 서버 실패를 전파하면 안 됨(미처리 거부)').toBeNull();
  });

  /**
   * SC6.1b [취약점 본질] onClick={clearMessages} 처럼 반환 promise 를 버리는(fire-and-forget) 호출에서도
   *   미처리 거부(unhandledrejection) 가 발생하지 않는다. ChatDrawer.tsx 의 onClick 핸들러가 이 형태다.
   */
  it('SC6.1b: 반환 promise 를 무시(onClick 형태)해도 unhandledrejection 미발생', async () => {
    fromMock
      .mockReturnValueOnce(makeStub({ loadData: { id: 'conv-1', messages: [{ role: 'user', content: '안녕', timestamp: 't' }] } }))
      .mockReturnValue(makeStub({ rejectUpdateWith: new Error('boom') }));

    const { result } = renderHook(() => useAIChat({ feature: 'qa' }));
    await waitFor(() => expect(result.current.messages.length).toBeGreaterThan(0));

    // onClick={clearMessages} 를 그대로 재현: 반환값을 await 하지 않고 버린다.
    await act(async () => {
      void result.current.clearMessages();
      // 마이크로태스크 큐 flush → reject 가 있었다면 unhandledrejection 이 이 시점 이후 발생
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(unhandled, `unhandledrejection 이 발생하면 안 됨: ${JSON.stringify(unhandled)}`).toEqual([]);
  });

  /**
   * SC6.2 [로컬/서버 분리] 서버 update 가 실패해도 로컬 messages 는 항상 비워진다(UI 일관성).
   */
  it('SC6.2: 서버 삭제 실패해도 로컬 messages 는 즉시 비워진다', async () => {
    fromMock
      .mockReturnValueOnce(makeStub({ loadData: { id: 'conv-1', messages: [{ role: 'user', content: '안녕', timestamp: 't' }] } }))
      .mockReturnValue(makeStub({ rejectUpdateWith: new Error('db error') }));

    const { result } = renderHook(() => useAIChat({ feature: 'qa' }));
    await waitFor(() => expect(result.current.messages.length).toBeGreaterThan(0));

    await act(async () => {
      await result.current.clearMessages().catch(() => {});
    });

    expect(result.current.messages).toEqual([]);
  });

  /**
   * SC6.3 [정상 경로 회귀] 서버 update 가 성공하면 로컬도 비워지고 throw 없음.
   */
  it('SC6.3: 서버 update 성공 시 로컬 클리어 + throw 없음', async () => {
    fromMock
      .mockReturnValueOnce(makeStub({ loadData: { id: 'conv-1', messages: [{ role: 'user', content: '안녕', timestamp: 't' }] } }))
      .mockReturnValue(makeStub()); // update 체인은 resolve(정상)

    const { result } = renderHook(() => useAIChat({ feature: 'qa' }));
    await waitFor(() => expect(result.current.messages.length).toBeGreaterThan(0));

    let threw: unknown = null;
    await act(async () => {
      try {
        await result.current.clearMessages();
      } catch (e) {
        threw = e;
      }
    });

    expect(threw).toBeNull();
    expect(result.current.messages).toEqual([]);
  });

  /**
   * SC6.4 [conversationId 없음] 저장된 대화가 없으면 서버 호출 자체를 건너뛰고 로컬만 클리어(throw 0).
   */
  it('SC6.4: conversationId 없을 때 서버 호출 스킵 + 로컬 클리어', async () => {
    fromMock.mockReturnValue(makeStub({ loadData: null })); // 로드 결과 없음 → conversationId=null

    const { result } = renderHook(() => useAIChat({ feature: 'qa' }));

    let threw: unknown = null;
    await act(async () => {
      try {
        await result.current.clearMessages();
      } catch (e) {
        threw = e;
      }
    });

    expect(threw).toBeNull();
    expect(result.current.messages).toEqual([]);
  });
});

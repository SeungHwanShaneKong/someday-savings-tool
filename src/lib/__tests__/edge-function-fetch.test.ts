// [CL-COVERAGE50-20260620] edge-function-fetch 단위 검증 — 미테스트 영역 커버리지 보강
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  edgeFunctionFetch,
  EdgeFunctionError,
  getUserFriendlyError,
  checkEdgeFunctionHealth,
} from '../edge-function-fetch';
import { EDGE_FUNCTION_URL, EDGE_FUNCTION_KEY } from '../edge-function-config';
import { supabase } from '@/integrations/supabase/client';

// ── 전역 supabase 클라이언트는 setup.ts 에서 자동 모킹됨(getSession → session:null).
//    edgeFunctionFetch 는 항상 getAuthToken() 을 먼저 호출하므로,
//    happy-path 검증을 위해 토큰을 주입할 수 있도록 vi.mocked 로 세션을 오버라이드한다.
const mockedGetSession = vi.mocked(supabase.auth.getSession);

/** 인증 세션을 주입해 getAuthToken() 이 성공하도록 한다. */
function injectSession(token: string | null) {
  mockedGetSession.mockResolvedValue({
    // 런타임에서 token 만 읽으므로(access_token) 최소 형태로 충분.
    data: { session: token ? ({ access_token: token } as never) : null },
    error: null,
  } as never);
}

/** fetch Response 모의 객체를 생성한다. json 은 호출 시 jsonImpl 을 실행. */
function makeResponse(opts: {
  ok: boolean;
  status: number;
  jsonImpl?: () => unknown;
}): Response {
  return {
    ok: opts.ok,
    status: opts.status,
    json: vi.fn(async () => {
      if (opts.jsonImpl) return opts.jsonImpl();
      return {};
    }),
  } as unknown as Response;
}

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
  // 기본값: 유효 토큰 주입(개별 테스트가 필요 시 재정의).
  injectSession('valid-token-abc');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────
// UT.1 Happy path: URL 구성 · 헤더(apikey/Authorization) · body 직렬화
// ─────────────────────────────────────────────────────────────
describe('UT.1 edgeFunctionFetch — 정상 요청 구성(컷오버 EDGE_FUNCTION_URL 검증)', () => {
  it('UT.1.1 성공 응답 시 파싱된 JSON 을 반환하고, URL/헤더/body 를 계약대로 구성한다', async () => {
    const payload = { reply: '안녕하세요', tokens: 42 };
    fetchSpy.mockResolvedValue(
      makeResponse({ ok: true, status: 200, jsonImpl: () => payload }),
    );

    const result = await edgeFunctionFetch<typeof payload>({
      functionName: 'ai-chat',
      body: { q: '질문' },
    });

    expect(result).toEqual(payload);

    // URL = `${EDGE_FUNCTION_URL}/functions/v1/<functionName>` (컷오버 대상 메인 프로젝트)
    const [calledUrl, calledInit] = fetchSpy.mock.calls[0];
    expect(calledUrl).toBe(`${EDGE_FUNCTION_URL}/functions/v1/ai-chat`);
    // 컷오버: 메인 프로젝트(pnfjwsugsdyzyahrants) 도메인이어야 한다.
    expect(calledUrl).toContain('pnfjwsugsdyzyahrants.supabase.co');

    expect(calledInit.method).toBe('POST');
    // Authorization 은 세션 access_token, apikey 는 EDGE_FUNCTION_KEY 이어야 한다.
    expect(calledInit.headers.Authorization).toBe('Bearer valid-token-abc');
    expect(calledInit.headers.apikey).toBe(EDGE_FUNCTION_KEY);
    expect(calledInit.headers['Content-Type']).toBe('application/json');
    // body 는 JSON 문자열로 직렬화.
    expect(calledInit.body).toBe(JSON.stringify({ q: '질문' }));
    // AbortController signal 연결.
    expect(calledInit.signal).toBeInstanceOf(AbortSignal);
  });

  it('UT.1.2 body 미지정 시 요청 body 는 undefined 이다(빈 객체로 보내지 않음)', async () => {
    fetchSpy.mockResolvedValue(
      makeResponse({ ok: true, status: 200, jsonImpl: () => ({ ok: 1 }) }),
    );

    await edgeFunctionFetch({ functionName: 'rag-query' });

    const [, calledInit] = fetchSpy.mock.calls[0];
    expect(calledInit.body).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────
// UT.2 인증 게이트: 토큰 없으면 fetch 이전에 AUTH_ERROR
// ─────────────────────────────────────────────────────────────
describe('UT.2 edgeFunctionFetch — 인증 가드', () => {
  it('UT.2.1 세션 토큰이 없으면 fetch 를 호출하지 않고 AUTH_ERROR 를 던진다', async () => {
    injectSession(null);

    await expect(
      edgeFunctionFetch({ functionName: 'ai-chat', body: {} }),
    ).rejects.toMatchObject({
      name: 'EdgeFunctionError',
      type: 'AUTH_ERROR',
    });

    // 인증 실패는 네트워크 호출 이전에 단락(short-circuit)되어야 한다.
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// UT.3 HTTP 비-200 분류: 401/403=AUTH, 5xx=SERVER, 4xx(429포함)=CLIENT + responseBody 보존
// ─────────────────────────────────────────────────────────────
describe('UT.3 edgeFunctionFetch — HTTP 상태코드 분류', () => {
  it('UT.3.1 403 → AUTH_ERROR(서버 메시지 우선, status/responseBody 보존)', async () => {
    const errBody = { error: '권한 없음' };
    fetchSpy.mockResolvedValue(
      makeResponse({ ok: false, status: 403, jsonImpl: () => errBody }),
    );

    const caught = await edgeFunctionFetch({ functionName: 'admin-only' }).catch(
      (e) => e,
    ) as EdgeFunctionError;
    expect(caught).toBeInstanceOf(EdgeFunctionError);
    expect(caught.type).toBe('AUTH_ERROR');
    expect(caught.status).toBe(403);
    expect(caught.message).toBe('권한 없음');
    expect(caught.responseBody).toEqual(errBody);
  });

  it('UT.3.2 500 → SERVER_ERROR, 경계값 검증(>=500 분기)', async () => {
    fetchSpy.mockResolvedValue(
      makeResponse({ ok: false, status: 500, jsonImpl: () => ({}) }),
    );

    const caught = await edgeFunctionFetch({ functionName: 'ai-chat' }).catch(
      (e) => e,
    ) as EdgeFunctionError;
    expect(caught.type).toBe('SERVER_ERROR');
    expect(caught.status).toBe(500);
    // 서버 메시지가 없으면 상태코드를 포함한 기본 메시지.
    expect(caught.message).toContain('500');
  });

  it('UT.3.3 429(rate limit) → CLIENT_ERROR 이며 한도 정보 responseBody 를 보존한다', async () => {
    const limitBody = { error: '요청 한도 초과', retryAfter: 60 };
    fetchSpy.mockResolvedValue(
      makeResponse({ ok: false, status: 429, jsonImpl: () => limitBody }),
    );

    const caught = await edgeFunctionFetch({ functionName: 'ai-chat' }).catch(
      (e) => e,
    ) as EdgeFunctionError;
    expect(caught.type).toBe('CLIENT_ERROR');
    expect(caught.status).toBe(429);
    // 클라이언트가 429 한도 정보를 읽을 수 있어야 한다(CL-AI-CHAT-LIMIT5).
    expect(caught.responseBody).toEqual(limitBody);
  });

  it('UT.3.4 비-200 이고 에러 본문 JSON 파싱이 실패해도 status 기반 메시지로 폴백한다', async () => {
    fetchSpy.mockResolvedValue(
      makeResponse({
        ok: false,
        status: 400,
        jsonImpl: () => {
          throw new Error('not json');
        },
      }),
    );

    const caught = await edgeFunctionFetch({ functionName: 'ai-chat' }).catch(
      (e) => e,
    ) as EdgeFunctionError;
    // errorData = {} 로 폴백 → CLIENT_ERROR, status 포함 기본 메시지.
    expect(caught.type).toBe('CLIENT_ERROR');
    expect(caught.status).toBe(400);
    expect(caught.responseBody).toEqual({});
  });
});

// ─────────────────────────────────────────────────────────────
// UT.4 네트워크/타임아웃/파싱 에러 매핑
// ─────────────────────────────────────────────────────────────
describe('UT.4 edgeFunctionFetch — 예외 유형 매핑', () => {
  it('UT.4.1 fetch 가 TypeError 를 던지면 NETWORK_ERROR 로 변환한다', async () => {
    fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'));

    const caught = await edgeFunctionFetch({ functionName: 'ai-chat' }).catch(
      (e) => e,
    ) as EdgeFunctionError;
    expect(caught).toBeInstanceOf(EdgeFunctionError);
    expect(caught.type).toBe('NETWORK_ERROR');
  });

  it('UT.4.2 AbortError(DOMException) → TIMEOUT_ERROR 이며 메시지에 초 단위 임계값 포함', async () => {
    const abort = new DOMException('aborted', 'AbortError');
    fetchSpy.mockRejectedValue(abort);

    const caught = await edgeFunctionFetch({
      functionName: 'ai-chat',
      timeoutMs: 5000,
    }).catch((e) => e) as EdgeFunctionError;
    expect(caught.type).toBe('TIMEOUT_ERROR');
    // 5000ms / 1000 = 5초
    expect(caught.message).toContain('5초');
  });

  it('UT.4.3 성공(ok) 응답이지만 본문 JSON 파싱 실패 시 PARSE_ERROR 를 던진다', async () => {
    fetchSpy.mockResolvedValue(
      makeResponse({
        ok: true,
        status: 200,
        jsonImpl: () => {
          throw new SyntaxError('broken json');
        },
      }),
    );

    const caught = await edgeFunctionFetch({ functionName: 'ai-chat' }).catch(
      (e) => e,
    ) as EdgeFunctionError;
    expect(caught).toBeInstanceOf(EdgeFunctionError);
    expect(caught.type).toBe('PARSE_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────
// UT.5 타임아웃 타이머 정리(누수 방지) — fake timers 로 결정론적 검증
// ─────────────────────────────────────────────────────────────
describe('UT.5 edgeFunctionFetch — 타이머 정리', () => {
  it('UT.5.1 성공 시 timeout 타이머를 해제하여 controller.abort 를 호출하지 않는다', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-20T00:00:00Z'));
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');

    fetchSpy.mockResolvedValue(
      makeResponse({ ok: true, status: 200, jsonImpl: () => ({ done: true }) }),
    );

    const promise = edgeFunctionFetch({ functionName: 'ai-chat', timeoutMs: 30000 });
    // 마이크로태스크(await fetch/json) 진행.
    await promise;

    // finally 블록에서 clearTimeout 호출되어야 한다(타이머 누수 방지).
    expect(clearSpy).toHaveBeenCalled();
    // 타이머가 해제됐으므로, 임계값을 한참 넘겨도 abort 콜백이 실행되지 않는다.
    vi.advanceTimersByTime(60000);
    vi.useRealTimers();
  });
});

// ─────────────────────────────────────────────────────────────
// AC.1 부가 계약: getUserFriendlyError 메시지 매핑 & checkEdgeFunctionHealth
// ─────────────────────────────────────────────────────────────
describe('AC.1 getUserFriendlyError — 한국어 메시지 매핑', () => {
  it('AC.1.1 EdgeFunctionError 유형별로 한국어 메시지를 반환한다', () => {
    expect(
      getUserFriendlyError(new EdgeFunctionError('NETWORK_ERROR', 'x')),
    ).toContain('연결할 수 없습니다');
    expect(
      getUserFriendlyError(new EdgeFunctionError('TIMEOUT_ERROR', 'x')),
    ).toContain('오래 걸립니다');
    // CLIENT_ERROR 는 서버 메시지(err.message)를 우선 노출.
    expect(
      getUserFriendlyError(new EdgeFunctionError('CLIENT_ERROR', '입력값 오류')),
    ).toBe('입력값 오류');
  });

  it('AC.1.2 EdgeFunctionError 가 아닌 일반 Error/미상값도 안전하게 처리한다', () => {
    expect(getUserFriendlyError(new Error('plain'))).toBe('plain');
    expect(getUserFriendlyError('문자열')).toBe('알 수 없는 오류가 발생했습니다.');
    expect(getUserFriendlyError(null)).toBe('알 수 없는 오류가 발생했습니다.');
  });
});

describe('AC.2 checkEdgeFunctionHealth — OPTIONS preflight', () => {
  it('AC.2.1 204 응답이면 true, fetch 거부(미배포)면 false 를 반환한다', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 204 } as Response);
    await expect(checkEdgeFunctionHealth()).resolves.toBe(true);

    fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(checkEdgeFunctionHealth()).resolves.toBe(false);

    // OPTIONS 메서드 + 헬스체크 함수 경로 확인.
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(`${EDGE_FUNCTION_URL}/functions/v1/share-image-gen`);
    expect(init.method).toBe('OPTIONS');
  });
});

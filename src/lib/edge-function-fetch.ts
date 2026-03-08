// [EF-RESILIENCE-20260308-041500] 중앙 Edge Function fetch 래퍼
// 에러 분류, 한국어 메시지, 타임아웃, 인증 자동 처리

import { supabase } from '@/integrations/supabase/client';
import { EDGE_FUNCTION_URL, EDGE_FUNCTION_KEY } from '@/lib/edge-function-config';

// ── 에러 유형 ──
export type EdgeFunctionErrorType =
  | 'NETWORK_ERROR'   // fetch 자체 실패 (CORS, DNS, 미배포)
  | 'AUTH_ERROR'      // 미로그인 / 토큰 만료
  | 'SERVER_ERROR'    // HTTP 5xx
  | 'CLIENT_ERROR'    // HTTP 4xx
  | 'PARSE_ERROR'     // JSON 파싱 실패
  | 'TIMEOUT_ERROR';  // 30초 초과

export class EdgeFunctionError extends Error {
  type: EdgeFunctionErrorType;
  status?: number;

  constructor(type: EdgeFunctionErrorType, message: string, status?: number) {
    super(message);
    this.name = 'EdgeFunctionError';
    this.type = type;
    this.status = status;
  }
}

// ── 한국어 사용자 친화 메시지 ──
export function getUserFriendlyError(err: unknown): string {
  if (err instanceof EdgeFunctionError) {
    switch (err.type) {
      case 'NETWORK_ERROR':
        return 'AI 서비스에 연결할 수 없습니다. 네트워크 확인 후 재시도해주세요.';
      case 'AUTH_ERROR':
        return '인증이 필요합니다. 로그인 후 다시 시도해주세요.';
      case 'SERVER_ERROR':
        return 'AI 서비스에 일시적 오류가 발생했습니다. 잠시 후 재시도해주세요.';
      case 'CLIENT_ERROR':
        return err.message || '요청에 오류가 있습니다. 입력을 확인해주세요.';
      case 'PARSE_ERROR':
        return 'AI 응답을 처리할 수 없습니다. 잠시 후 재시도해주세요.';
      case 'TIMEOUT_ERROR':
        return 'AI 서비스 응답이 너무 오래 걸립니다. 잠시 후 재시도해주세요.';
    }
  }
  if (err instanceof Error) return err.message;
  return '알 수 없는 오류가 발생했습니다.';
}

// ── fetch 옵션 ──
interface EdgeFunctionFetchOptions {
  functionName: string;
  body?: Record<string, unknown>;
  timeoutMs?: number;
}

// ── 인증 토큰 획득 ──
async function getAuthToken(): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    throw new EdgeFunctionError('AUTH_ERROR', '인증 토큰이 없습니다. 로그인이 필요합니다.');
  }
  return token;
}

// ── 중앙 fetch 래퍼 ──
export async function edgeFunctionFetch<T>(
  options: EdgeFunctionFetchOptions,
): Promise<T> {
  const { functionName, body, timeoutMs = 30000 } = options;

  // 1. Auth
  const token = await getAuthToken();

  // 2. Timeout via AbortController
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `${EDGE_FUNCTION_URL}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          apikey: EDGE_FUNCTION_KEY,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      },
    );

    // 3. HTTP error classification
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const serverMessage = (errorData as any)?.error || '';

      if (response.status === 401 || response.status === 403) {
        throw new EdgeFunctionError('AUTH_ERROR', serverMessage || '인증이 필요합니다', response.status);
      }
      if (response.status >= 500) {
        throw new EdgeFunctionError('SERVER_ERROR', serverMessage || `서버 오류 (${response.status})`, response.status);
      }
      throw new EdgeFunctionError('CLIENT_ERROR', serverMessage || `요청 오류 (${response.status})`, response.status);
    }

    // 4. JSON parse
    try {
      return await response.json() as T;
    } catch {
      throw new EdgeFunctionError('PARSE_ERROR', 'JSON 응답 파싱 실패');
    }
  } catch (err) {
    // Re-throw our own errors
    if (err instanceof EdgeFunctionError) throw err;

    // AbortError = timeout
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new EdgeFunctionError('TIMEOUT_ERROR', `${timeoutMs / 1000}초 초과`);
    }

    // TypeError = network failure (CORS, DNS, 미배포 등)
    if (err instanceof TypeError) {
      throw new EdgeFunctionError(
        'NETWORK_ERROR',
        'AI 서비스에 연결할 수 없습니다. 서비스가 아직 준비되지 않았을 수 있습니다.',
      );
    }

    // Unknown
    throw new EdgeFunctionError(
      'NETWORK_ERROR',
      err instanceof Error ? err.message : 'Unknown fetch error',
    );
  } finally {
    clearTimeout(timer);
  }
}

// ── 서비스 헬스 체크 (OPTIONS preflight) ──
export async function checkEdgeFunctionHealth(): Promise<boolean> {
  try {
    const response = await fetch(
      `${EDGE_FUNCTION_URL}/functions/v1/share-image-gen`,
      { method: 'OPTIONS' },
    );
    return response.status === 204 || response.ok;
  } catch {
    return false;
  }
}

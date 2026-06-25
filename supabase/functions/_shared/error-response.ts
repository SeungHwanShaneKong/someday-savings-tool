// [CL-VULN-R8-ERRLEAK-20260626-000000] 표준 500 에러 응답 — 내부 메시지/스택 누출 차단.
//
// 문제(R8 감사 D4): 여러 Edge 함수가 catch 에서 error.message / detail:message 를 그대로 클라이언트에 반환 →
//   OpenAI/DB 내부 오류·스택 단서가 외부로 노출(정보 누출). 공격자가 입력을 조작해 내부 구조를 프로파일링 가능.
// 해결: 클라이언트에는 일반 메시지 + 추적용 requestId 만 반환하고, 원본(메시지+스택)은 서버 로그에만 남긴다.
//   사용자는 requestId 로 문의 가능하되 내부는 비공개.

import { corsHeaders } from './cors.ts';

/**
 * 일반화된 에러 응답 생성기.
 * @param fnName  함수명(서버 로그 식별자)
 * @param error   원본 에러(서버 로그에만 기록)
 * @param opts    userMessage(클라 노출 메시지)·status(기본 500)·extra(응답에 병합할 안전한 추가 필드, 예: jobId)
 */
export function errorResponse(
  fnName: string,
  error: unknown,
  opts?: { userMessage?: string; status?: number; extra?: Record<string, unknown> },
): Response {
  // requestId: 충돌 무관한 짧은 추적자(crypto 우선, 미가용 시 시각 기반).
  const requestId =
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID().slice(0, 8)
      : Date.now().toString(36);
  const raw = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(`[${fnName}] error id=${requestId}:`, raw);
  return new Response(
    JSON.stringify({
      error: opts?.userMessage ?? '요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      requestId,
      ...(opts?.extra ?? {}),
    }),
    { status: opts?.status ?? 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

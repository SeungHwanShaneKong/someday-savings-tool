// [AGENT-TEAM-9-20260307] Edge Function 호출 로깅 유틸리티
export async function logFunctionCall(
  supabase: any,
  functionName: string,
  startTime: number,
  statusCode: number,
  userId?: string | null,
  errorMessage?: string | null
): Promise<void> {
  try {
    const durationMs = Date.now() - startTime;
    await supabase.from('function_call_log').insert({
      function_name: functionName,
      duration_ms: durationMs,
      status_code: statusCode,
      user_id: userId || null,
      error_message: errorMessage || null,
    });
  } catch (err) {
    // Fire-and-forget — never block the main response
    console.warn('[log-call] logging failed:', err);
  }
}

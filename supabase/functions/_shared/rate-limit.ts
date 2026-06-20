// [CL-SEC-AIQUOTA-20260621] 형제 AI Edge Function 공용 일일 레이트리밋.
//
// 배경: round-1 은 ai-chat·rag-query 에만 일일 한도를 걸었다. negotiate-coach·honeymoon-planner·
//   timeline-optimizer 는 verifyUserToken 만 통과하면 quota 없이 chatCompletion 을 호출 → 누구나
//   JWT 로 직접 POST 루프를 돌려 OpenAI 비용을 무제한 고갈(비용 DoS)시킬 수 있었다.
// 카운터: ai-chat 과 동일하게 ai_conversations(user_id, feature, created_at) 집계(단일 진실원).
//   각 함수는 성공 시 ai_conversations 에 feature 행을 1개 남겨 카운트가 증가하도록 한다.

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

export interface DailyLimitResult {
  allowed: boolean;
  used: number;
  limit: number;
}

/**
 * 오늘(UTC 자정 기준) 해당 user_id + feature 의 ai_conversations 행 수를 세어 한도 초과 여부 반환.
 * 호출 비용을 들이기 전(verifyUserToken 직후, chatCompletion 직전)에 확인할 것.
 */
export async function checkDailyLimit(
  supabase: SupabaseLike,
  userId: string,
  feature: string,
  limit: number,
): Promise<DailyLimitResult> {
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('ai_conversations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('created_at', `${today}T00:00:00Z`);
  const used = count ?? 0;
  return { allowed: used < limit, used, limit };
}

/** 한도 초과 시 사용할 표준 429 JSON 응답 본문. */
export function dailyLimitMessage(featureLabel: string, limit: number): string {
  return `오늘의 ${featureLabel} 사용 한도(${limit}회)를 모두 사용하셨어요. 내일 다시 이용해주세요! 🌙`;
}

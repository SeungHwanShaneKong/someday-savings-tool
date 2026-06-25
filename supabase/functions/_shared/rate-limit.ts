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

// [CL-VULN-R8-AIQUOTA-20260626-000000] 원자 예약(reserve-before-call) — D1 변조내성 + D2 TOCTOU 동시 해소.
//
// 기존 checkDailyLimit 의 두 결함:
//   D1) 카운트원천이 ai_conversations(소유자 DELETE 가능) → 사용자가 자기 행 삭제로 카운터 리셋 → 한도 무력화(비용 DoS).
//   D2) count-then-act 비원자 → OpenAI 호출 전 게이트만 보고 통과, 실제 증가는 호출 '후' insert → 동시 N요청 전부 통과.
// 해결: service_role 전용 ai_usage 원장을 reserve_ai_quota RPC 로 '원자 증가 후 카운트'를 받아(=reserve-before-call)
//   호출부가 used>limit 이면 429. RPC 미배포(마이그 적용 전)·일시 오류 시 구 count 방식으로 안전 강등(가용성 우선, 무중단).
import { decideFromReserve } from './quota-logic.ts';

/**
 * 원자 일일 예약. chatCompletion/embeddings 등 비용 발생 '직전'에 호출.
 * 반환 used 는 항상 '이번 요청 포함' post-increment 의미 → 호출부는 remaining = max(0, limit - used) 로 일관 계산.
 * 한 번 예약된 슬롯은 환불하지 않는다(보안 우선: 실패 유발로 환불을 악용한 우회 차단). 드문 OpenAI 실패 시 과집계는 익일 자동 리셋.
 */
export async function reserveDailyLimit(
  supabase: SupabaseLike,
  userId: string,
  feature: string,
  limit: number,
): Promise<DailyLimitResult> {
  let rpcValue: number | null = null;
  try {
    const { data, error } = await supabase.rpc('reserve_ai_quota', {
      p_user_id: userId,
      p_feature: feature,
      p_limit: limit,
    });
    if (error) {
      console.warn(`[reserveDailyLimit] RPC 미가용 → count 강등 (feature=${feature}): ${error.message ?? error}`);
    } else if (typeof data === 'number') {
      rpcValue = data;
    } else if (Array.isArray(data) && typeof data[0] === 'number') {
      rpcValue = data[0];
    }
  } catch (e) {
    console.warn(`[reserveDailyLimit] RPC 예외 → count 강등 (feature=${feature}):`, e);
  }
  // 강등 경로: 구 count(+1=이번 요청 포함 예측치)로 정규화. reserve 경로: rpcValue 그대로 사용.
  const fallback = rpcValue === null ? await checkDailyLimit(supabase, userId, feature, limit) : null;
  const { allowed, used } = decideFromReserve(rpcValue, limit, (fallback?.used ?? 0) + 1);
  return { allowed, used, limit };
}

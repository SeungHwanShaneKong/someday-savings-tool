// [CL-POKE-20260709-231909] 파트너 '콕 찌르기' 순수 로직 — 쿨다운 판정·스토리지 키·응답→토스트 매핑.
//
// 설계:
//  - 서버(notify-partner Edge)의 (sender,recipient,notify_day,kind='poke') 부분 유니크가 **권위**.
//    localStorage 쿨다운은 낙관적 UX(불필요한 invoke 억제)일 뿐, 우회돼도 서버가 rate_limited 로 거부.
//  - 스토리지 키는 예산이 아니라 (나, 파트너) 페어 기준 — 서버 키가 (sender,recipient,day)이므로
//    예산별 키로 두면 "다른 예산에서 또 찌를 수 있어 보이는" 거짓 UI 가 된다.
//  - 부수효과 없음(localStorage 접근은 호출측 PokeButton 이 try/catch 로 수행) → vitest 직접 검증.

/** 낙관 쿨다운 기간(24h) — 서버의 일일 슬롯(UTC 일자)과 정확히 일치하진 않지만 보수적 근사. */
export const POKE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** (나, 파트너) 페어 기준 localStorage 키 — 예산 무관(서버 유니크 키와 동일 축). */
export function pokeStorageKey(userId: string, partnerId: string): string {
  return `poke_last_${userId}_${partnerId}`;
}

/**
 * 24h 쿨다운 판정. lastMs 가 없거나(null) 유한수가 아니면 허용.
 * 음수 delta(시계 역행: lastMs 가 미래) → 허용(영구 잠금 고착 방지 — 서버가 최종 거부).
 * 정확히 24h 경과 시점부터 허용(>=).
 */
export function canPoke(lastMs: number | null, nowMs: number): boolean {
  if (lastMs == null || !Number.isFinite(lastMs)) return true;
  const delta = nowMs - lastMs;
  if (delta < 0) return true; // 시계 역행 — 잠금 고착 대신 허용(서버 유니크가 권위)
  return delta >= POKE_COOLDOWN_MS;
}

/** 남은 쿨다운을 한국어로 — 1시간 이상은 시간, 미만은 분(최소 1분). 음수/0 은 "잠시 후". */
export function cooldownRemainText(remainMs: number): string {
  if (!Number.isFinite(remainMs) || remainMs <= 0) return '잠시 후 다시 찌를 수 있어요';
  const hours = Math.floor(remainMs / 3_600_000);
  if (hours >= 1) return `약 ${hours}시간 후에 다시 찌를 수 있어요`;
  const minutes = Math.max(1, Math.ceil(remainMs / 60_000));
  return `약 ${minutes}분 후에 다시 찌를 수 있어요`;
}

/** 토스트 페이로드(useToast 계약 부분집합). */
export interface PokeToastPayload {
  title: string;
  description?: string;
  variant?: 'destructive';
}

/** invoke 응답의 판별 유니언 — startCooldown=낙관 쿨다운 기록 여부, awardPoke=게이미피케이션 보상 여부. */
export type PokeOutcome =
  | { type: 'sent'; startCooldown: true; awardPoke: true; toast: PokeToastPayload }
  | { type: 'rate_limited'; startCooldown: true; awardPoke: false; toast: PokeToastPayload }
  | { type: 'no_partner'; startCooldown: false; awardPoke: false; toast: PokeToastPayload }
  | { type: 'global_capped'; startCooldown: false; awardPoke: false; toast: PokeToastPayload }
  | { type: 'unavailable'; startCooldown: false; awardPoke: false; toast: PokeToastPayload }
  | { type: 'error'; startCooldown: false; awardPoke: false; toast: PokeToastPayload };

/** notify-partner invoke 응답 형태(성공 200 계약: {ok,sent} | {ok,skipped}). */
export interface PokeInvokeResult {
  data?: { sent?: boolean; skipped?: string } | null;
  error?: unknown;
}

/**
 * Edge 응답 → 한국어 토스트 + 후속 동작 전수 매핑(7분기 + invoke 에러).
 *  sent · rate_limited · no_partner · global_capped · no_provider · no_sender_domain · schema_not_ready.
 *  - sent / rate_limited 만 쿨다운 기록(서버가 슬롯 소진을 확정한 경우). 일시 에러는 쿨다운 미기록.
 *  - 보상(awardPoke)은 sent:true 일 때만 — 거짓 적립 차단(usePartnerEditNotifier 의 V1 게이트와 동일 원칙).
 */
export function mapPokeOutcome(res: PokeInvokeResult | null, partnerName?: string | null): PokeOutcome {
  const name = partnerName?.trim() || '파트너';

  if (!res || res.error != null) {
    return {
      type: 'error', startCooldown: false, awardPoke: false,
      toast: { title: '콕 찌르기에 실패했어요', description: '잠시 후 다시 시도해주세요.', variant: 'destructive' },
    };
  }
  if (res.data?.sent === true) {
    return {
      type: 'sent', startCooldown: true, awardPoke: true,
      toast: { title: `콕! 찔렀어요 💌 ${name}님께 메일을 보냈어요`, description: '하루 한 번만 보낼 수 있어요.' },
    };
  }
  switch (res.data?.skipped) {
    case 'rate_limited':
      return {
        type: 'rate_limited', startCooldown: true, awardPoke: false,
        toast: { title: '오늘은 이미 콕 찔렀어요 — 내일 다시!' },
      };
    case 'no_partner':
      return {
        type: 'no_partner', startCooldown: false, awardPoke: false,
        toast: { title: '아직 파트너가 없어요', description: '먼저 파트너를 초대해보세요.' },
      };
    case 'global_capped':
      return {
        type: 'global_capped', startCooldown: false, awardPoke: false,
        toast: { title: '오늘 알림이 몰렸어요, 내일 시도해주세요' },
      };
    case 'no_provider':
    case 'no_sender_domain':
    case 'schema_not_ready':
      return {
        type: 'unavailable', startCooldown: false, awardPoke: false,
        toast: { title: '지금은 알림을 보낼 수 없어요', description: '준비가 끝나면 다시 열릴 거예요.' },
      };
    default:
      // 알 수 없는 응답(구/신 버전 불일치 등) — 보수적으로 에러 취급(쿨다운·보상 없음)
      return {
        type: 'error', startCooldown: false, awardPoke: false,
        toast: { title: '콕 찌르기에 실패했어요', description: '잠시 후 다시 시도해주세요.', variant: 'destructive' },
      };
  }
}

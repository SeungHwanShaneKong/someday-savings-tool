// [CL-POKE-VIS-20260711-173901] '콕 찌르기' 실행 훅 — PokeButton 본문 로직 추출(동작 등가).
//
// 계약(추출 이전 PokeButton 과 동일):
//  - 서버 유니크((sender,recipient,day,kind))가 권위. localStorage 24h 쿨다운은 낙관적 UX.
//  - sent/rate_limited(서버가 슬롯 소진 확정)일 때만 쿨다운 기록. 일시 에러는 미기록(재시도 허용).
//  - onPoked 는 sent:true 일 때만 1회 호출(거짓 게이미피케이션 적립 차단).
//  - localStorage 불가 환경(사파리 프라이빗 등)은 try/catch degrade — 서버가 여전히 1일 1회 강제.
//  - [신규] 모듈 레벨 pub-sub 쿨다운 브로드캐스트(usePWAInstall suppressionListeners 패턴 복제) —
//    같은 페어 키의 모든 마운트 인스턴스(헤더 compact 버튼 + 관리 카드 버튼 + 넛지 카드)가
//    한쪽의 poke 로 동시에 onCooldown=true 가 된다. 페이로드에 lastMs 를 실어 storage 불가
//    환경에서도 동기화(스토리지 이벤트/폴링 불요). 언마운트 시 리스너 해제.
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { PartnerInfo } from '@/hooks/useCollaboration';
import {
  POKE_COOLDOWN_MS,
  canPoke,
  mapPokeOutcome,
  pokeStorageKey,
  type PokeInvokeResult,
} from '@/lib/collab/poke-logic';

// ── 모듈 레벨 쿨다운 브로드캐스트 (pairKey 단위) ──
type CooldownListener = (pairKey: string, lastMs: number) => void;
const cooldownListeners = new Set<CooldownListener>();
function broadcastCooldown(pairKey: string, lastMs: number) {
  cooldownListeners.forEach((listener) => listener(pairKey, lastMs));
}

export interface UsePokeArgs {
  budgetId: string | null;
  /** 현재 파트너(useCollaboration.myPartner / useMyPartner) — 없으면 poke 는 no-op·onCooldown=false */
  partner: PartnerInfo | null;
  /** 실제 발송(sent:true) 시 1회 호출 — 게이미피케이션 보상 배선용 */
  onPoked?: () => void;
}

export interface UsePokeResult {
  /** notify-partner(kind:'poke') invoke + 토스트 + 쿨다운/보상 처리. 예외를 던지지 않는다. */
  poke: () => Promise<void>;
  /** 24h 낙관 쿨다운 중 여부(같은 페어의 다른 인스턴스 poke 도 pub-sub 으로 즉시 반영) */
  onCooldown: boolean;
}

export function usePoke({ budgetId, partner, onPoked }: UsePokeArgs): UsePokeResult {
  const { user } = useAuth();
  const { toast } = useToast();
  // 쿨다운 만료 시각(ms) — null 이면 즉시 찌르기 가능
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);

  const userId = user?.id ?? null;
  const partnerId = partner?.user_id ?? null;
  const partnerName = partner?.display_name?.trim() || '파트너';
  // (나, 파트너) 페어 키 — userId/partnerId 원시값 파생이라 dep 로 동일 의미
  const pairKey = userId && partnerId ? pokeStorageKey(userId, partnerId) : null;

  // 마운트/페어 변경 시 localStorage 에서 쿨다운 복원(storage 불가 환경 degrade)
  useEffect(() => {
    if (!pairKey) return;
    try {
      const raw = localStorage.getItem(pairKey);
      const lastMs = raw == null ? null : Number(raw);
      if (lastMs != null && Number.isFinite(lastMs) && !canPoke(lastMs, Date.now())) {
        setCooldownUntil(lastMs + POKE_COOLDOWN_MS);
      } else {
        setCooldownUntil(null);
      }
    } catch {
      setCooldownUntil(null); // storage 접근 불가 → 낙관 쿨다운 없이 서버 판정에 위임
    }
  }, [pairKey]);

  // 같은 페어 키의 다른 인스턴스가 쿨다운을 기록하면 즉시 동기(멀티 마운트 일관성)
  useEffect(() => {
    if (!pairKey) return;
    const listener: CooldownListener = (key, lastMs) => {
      if (key !== pairKey) return;
      setCooldownUntil(lastMs + POKE_COOLDOWN_MS);
    };
    cooldownListeners.add(listener);
    return () => {
      cooldownListeners.delete(listener);
    };
  }, [pairKey]);

  const onCooldown = cooldownUntil != null && cooldownUntil > Date.now();

  const recordCooldown = (nowMs: number) => {
    setCooldownUntil(nowMs + POKE_COOLDOWN_MS);
    if (!pairKey) return;
    try {
      localStorage.setItem(pairKey, String(nowMs));
    } catch { /* storage 불가 — 서버 유니크가 여전히 강제 */ }
    broadcastCooldown(pairKey, nowMs); // 저장 성공/실패 무관 — 마운트된 형제 인스턴스는 항상 동기
  };

  const poke = async (): Promise<void> => {
    let res: PokeInvokeResult | null = null;
    try {
      res = (await supabase.functions.invoke('notify-partner', {
        body: { budgetId, kind: 'poke' },
      })) as PokeInvokeResult;
    } catch (e) {
      res = { data: null, error: e };
    }
    const outcome = mapPokeOutcome(res, partnerName);
    toast(outcome.toast);
    if (outcome.startCooldown) recordCooldown(Date.now());
    if (outcome.awardPoke) onPoked?.();
  };

  return { poke, onCooldown };
}

// [CL-POKE-20260709-231909] 파트너 '콕 찌르기' 버튼 — notify-partner Edge(kind:'poke') 수동 넛지.
//
// 계약:
//  - partner 없으면 렌더 자체를 하지 않음(null).
//  - AsyncButton 재사용 → 진행 중 disabled+스피너(더블서밋 차단).
//  - 서버 유니크((sender,recipient,day,kind))가 권위. localStorage 24h 쿨다운은 낙관적 UX.
//  - sent/rate_limited(서버가 슬롯 소진 확정)일 때만 쿨다운 기록. 일시 에러는 미기록(재시도 허용).
//  - onPoked 는 sent:true 일 때만 1회 호출(거짓 게이미피케이션 적립 차단).
//  - localStorage 불가 환경(사파리 프라이빗 등)은 try/catch degrade — 서버가 여전히 1일 1회 강제.
import { useEffect, useState } from 'react';
import { HandHeart } from 'lucide-react';
import { AsyncButton } from '@/components/ui/async-button';
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

interface PokeButtonProps {
  budgetId: string | null;
  /** 현재 파트너(useCollaboration.myPartner) — 없으면 미렌더 */
  partner: PartnerInfo | null;
  /** 실제 발송(sent:true) 시 1회 호출 — 게이미피케이션 보상 배선용 */
  onPoked?: () => void;
}

export function PokeButton({ budgetId, partner, onPoked }: PokeButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  // 쿨다운 만료 시각(ms) — null 이면 즉시 찌르기 가능
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);

  const userId = user?.id ?? null;
  const partnerId = partner?.user_id ?? null;
  const partnerName = partner?.display_name?.trim() || '파트너';

  // 마운트/페어 변경 시 localStorage 에서 쿨다운 복원(storage 불가 환경 degrade)
  useEffect(() => {
    if (!userId || !partnerId) return;
    try {
      const raw = localStorage.getItem(pokeStorageKey(userId, partnerId));
      const lastMs = raw == null ? null : Number(raw);
      if (lastMs != null && Number.isFinite(lastMs) && !canPoke(lastMs, Date.now())) {
        setCooldownUntil(lastMs + POKE_COOLDOWN_MS);
      } else {
        setCooldownUntil(null);
      }
    } catch {
      setCooldownUntil(null); // storage 접근 불가 → 낙관 쿨다운 없이 서버 판정에 위임
    }
  }, [userId, partnerId]);

  if (!partner) return null;

  const onCooldown = cooldownUntil != null && cooldownUntil > Date.now();

  const recordCooldown = (nowMs: number) => {
    setCooldownUntil(nowMs + POKE_COOLDOWN_MS);
    if (!userId || !partnerId) return;
    try {
      localStorage.setItem(pokeStorageKey(userId, partnerId), String(nowMs));
    } catch { /* storage 불가 — 서버 유니크가 여전히 강제 */ }
  };

  const handlePoke = async () => {
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

  return (
    <div className="inline-flex flex-col items-start">
      <AsyncButton
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 text-primary hover:text-primary"
        onClick={handlePoke}
        disabled={onCooldown}
        loadingText="찌르는 중..."
        aria-label={`파트너 ${partnerName}님에게 콕 찌르기`}
      >
        <HandHeart className="w-3.5 h-3.5" aria-hidden="true" /> 콕 찌르기
      </AsyncButton>
      {onCooldown && (
        <p className="text-[10px] text-muted-foreground/70 pl-1">내일 다시 찌를 수 있어요 ⏰</p>
      )}
    </div>
  );
}

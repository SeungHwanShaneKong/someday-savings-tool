// [CL-POKE-VIS-20260711-173901] 파트너 '콕 찌르기' 비모달 넛지 카드 — 하단 슬라이드(비차단 aside).
//
// 트리거(전부 충족 시 세션 1회): 내 편집(myEditedThisSession=editSignal>0) + 파트너 3일+ 조용
//   (maxUpdatedAt(items, myUserId) 기준) + 지금 찌르기 가능(canPoke) + 파트너 존재(active).
// 상한: KST 하루 1회(pokeNudgeShownKey — 노출 확정 시 즉시 기록, MobileDesktopNotice 패턴)
//   + '한 달간 다시 보지 않기' 30일 억제(pokeNudgeSuppressKey).
// 설계 결정:
//  - 세션당 1회 평가(decidedRef — BudgetFlow wizardDecidedRef 패턴): 게이트 데이터가 준비된 뒤
//    한 번만 판정하고, 이후 조건이 변해도 재팝업하지 않는다(피로 방지).
//  - canPokeNow 는 usePoke.onCooldown state 가 아니라 localStorage(pokeStorageKey)+canPoke 로 직접
//    판정 — 첫 커밋에서 usePoke 의 쿨다운 복원 effect 와 이 결정 effect 가 같은 패스에 실행되는
//    순서 레이스(state 미반영)를 제거(같은 소스·같은 판정 함수라 의미 동일).
//  - 모바일 && InstallPrompt 미억제 → 미노출 + 일일 키 미기록(하단 배너 시간 배타 — 이중 카드 방지,
//    다음 기회 보존).
//  - localStorage 접근 전부 try/catch degrade(프라이빗 모드 등) — 발송 자체는 서버 유니크가 권위.
import { useEffect, useRef, useState } from 'react';
import { HandHeart } from 'lucide-react';
import { AsyncButton } from '@/components/ui/async-button';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MOBILE_BREAKPOINT } from '@/hooks/use-mobile';
import { isInstallPromptSuppressed } from '@/hooks/usePWAInstall';
import { usePoke } from '@/hooks/usePoke';
import type { PartnerInfo } from '@/hooks/useCollaboration';
import { maxUpdatedAt, type HasIdUpdated } from '@/lib/collab/changed-since';
import { canPoke, pokeStorageKey } from '@/lib/collab/poke-logic';
import { pokeNudgeShownKey, pokeNudgeSuppressKey, shouldShowPokeNudge } from '@/lib/collab/poke-nudge';
import { toKSTDateString } from '@/lib/gamification/streak-calc';

interface PokeNudgeCardProps {
  /** 파트너 존재('우리' 모드 + myPartner) — false 면 평가·렌더 모두 없음 */
  active: boolean;
  partner: PartnerInfo | null;
  budgetId: string | null;
  /** 활성 예산 항목(updated_at·last_edited_by) — 파트너 최근 편집 신호(maxUpdatedAt) 산출용 */
  items: ReadonlyArray<HasIdUpdated>;
  myUserId: string | null;
  /** 내가 이번 세션에 성공 편집을 했는가(editSignal > 0) */
  myEditedThisSession: boolean;
  /** 실제 발송(sent:true) 시 1회 — 게이미피케이션 보상 배선용 */
  onPoked?: () => void;
}

export function PokeNudgeCard({
  active,
  partner,
  budgetId,
  items,
  myUserId,
  myEditedThisSession,
  onPoked,
}: PokeNudgeCardProps) {
  const { poke, onCooldown } = usePoke({ budgetId, partner, onPoked });
  const [visible, setVisible] = useState(false);
  const [suppressChecked, setSuppressChecked] = useState(false);
  // 세션당 1회 평가 가드(wizardDecidedRef 패턴) — 데이터 준비 전에는 소진하지 않는다
  const decidedRef = useRef(false);

  useEffect(() => {
    if (decidedRef.current) return;
    if (!active || !partner || !myUserId) return;
    if (!myEditedThisSession) return;      // 트리거 = 내 편집(이전에는 판정 자체를 보류)
    if (items.length === 0) return;        // 항목 미로드 — quiet 판정 불가(로드 후 재평가)
    decidedRef.current = true;             // 여기서부터 세션 1회 평가 확정

    const nowMs = Date.now();

    // usePoke 와 동일 소스·동일 판정으로 쿨다운을 직접 확인(첫 커밋 effect 순서 레이스 제거)
    let canPokeNow = true;
    try {
      const raw = localStorage.getItem(pokeStorageKey(myUserId, partner.user_id));
      canPokeNow = canPoke(raw == null ? null : Number(raw), nowMs);
    } catch { /* storage 불가 → 서버 판정 위임(허용) */ }

    const shownKey = pokeNudgeShownKey(myUserId, toKSTDateString(new Date(nowMs)));
    let alreadyShownTodayKST = false;
    try { alreadyShownTodayKST = localStorage.getItem(shownKey) != null; } catch { /* noop */ }

    let suppressedAtMs: number | null = null;
    try {
      const raw = localStorage.getItem(pokeNudgeSuppressKey(myUserId));
      suppressedAtMs = raw == null ? null : Number(raw);
    } catch { /* noop */ }

    const show = shouldShowPokeNudge({
      active: true,
      myEditedThisSession: true,
      partnerLastEditISO: maxUpdatedAt(items, myUserId),
      canPokeNow,
      alreadyShownTodayKST,
      suppressedAtMs,
      nowMs,
    });
    if (!show) return;

    // [CL-AUDIT-POKE-D1-20260711] InstallPrompt(모바일 하단 배너)와 시간 배타 — 미노출 + 일일 키 미기록(기회 보존).
    //   근본수정: useIsMobile(비동기 첫-렌더 false → 세션 1회 게이트 소진 후 되돌릴 수 없어 배타 무력화)의
    //   잠정값 대신, 이 effect(마운트 후 실행)의 정확한 window.innerWidth 를 직접 읽어 판정한다.
    const isMobileNow = typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;
    if (isMobileNow && !isInstallPromptSuppressed()) return;

    try { localStorage.setItem(shownKey, '1'); } catch { /* noop */ }
    setVisible(true);
  }, [active, partner, myUserId, myEditedThisSession, items]);

  // 닫힘 공통 경로 — '한 달간 다시 보지 않기' 체크 시 억제 시각 기록(storage degrade)
  const close = () => {
    if (suppressChecked && myUserId) {
      try {
        localStorage.setItem(pokeNudgeSuppressKey(myUserId), String(Date.now()));
      } catch { /* noop */ }
    }
    setVisible(false);
  };

  // CTA — 발송 결과(토스트·쿨다운·보상)는 usePoke 가 처리, 카드는 시도 후 닫힌다
  const handlePoke = async () => {
    await poke();
    close();
  };

  if (!visible || !active || !partner) return null;

  const partnerName = partner.display_name?.trim() || '파트너';

  return (
    <aside
      aria-label="파트너 콕 찌르기 제안"
      className="fixed z-40 inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-4 sm:bottom-20 sm:w-96 rounded-xl border border-border bg-card p-3 shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300"
    >
      <p className="text-sm font-semibold text-foreground">💌 {partnerName}님이 요즘 조용하네요</p>
      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
        우리 예산, 같이 보자고 살짝 콕 찔러볼까요? 다정한 이메일 알림이 가요.
      </p>
      <div className="mt-2.5 flex items-center gap-2">
        <AsyncButton
          size="sm"
          className="flex-1 gap-1.5"
          onClick={handlePoke}
          disabled={onCooldown}
          loadingText="찌르는 중..."
        >
          <HandHeart className="w-3.5 h-3.5" aria-hidden="true" /> 콕 찌르기
        </AsyncButton>
        <Button size="sm" variant="ghost" className="flex-shrink-0 text-muted-foreground" onClick={close}>
          오늘은 그냥 두기
        </Button>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <Checkbox
          id="poke-nudge-suppress"
          checked={suppressChecked}
          onCheckedChange={(v) => setSuppressChecked(v === true)}
          className="h-3.5 w-3.5"
        />
        <label htmlFor="poke-nudge-suppress" className="text-[11px] text-muted-foreground cursor-pointer">
          한 달간 다시 보지 않기
        </label>
      </div>
    </aside>
  );
}

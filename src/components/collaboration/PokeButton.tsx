// [CL-POKE-20260709-231909] 파트너 '콕 찌르기' 버튼 — notify-partner Edge(kind:'poke') 수동 넛지.
// [CL-POKE-VIS-20260711-173901] 본문 로직을 usePoke 훅으로 추출(동작 등가) + compact 변형(헤더 컨트롤 라인용).
//
// 계약:
//  - partner 없으면 렌더 자체를 하지 않음(null).
//  - AsyncButton 재사용 → 진행 중 disabled+스피너(더블서밋 차단).
//  - 발송/토스트/쿨다운/보상 로직은 usePoke 가 소유(같은 페어 멀티 인스턴스 쿨다운 동기 포함).
//  - compact=false(기본) 경로의 렌더 트리는 추출 이전과 무변경(기존 PokeButton.test.tsx 계약 보존).
//  - compact=true: outline·좁은 화면 라벨 축약(아이콘 상시)·쿨다운 시 서브텍스트 대신 title/aria 안내.
import { HandHeart } from 'lucide-react';
import { AsyncButton } from '@/components/ui/async-button';
import { usePoke } from '@/hooks/usePoke';
import type { PartnerInfo } from '@/hooks/useCollaboration';

interface PokeButtonProps {
  budgetId: string | null;
  /** 현재 파트너(useCollaboration.myPartner) — 없으면 미렌더 */
  partner: PartnerInfo | null;
  /** 실제 발송(sent:true) 시 1회 호출 — 게이미피케이션 보상 배선용 */
  onPoked?: () => void;
  /** [CL-POKE-VIS-20260711-173901] 헤더 컨트롤 라인용 컴팩트 변형 */
  compact?: boolean;
}

export function PokeButton({ budgetId, partner, onPoked, compact = false }: PokeButtonProps) {
  const { poke, onCooldown, unavailable } = usePoke({ budgetId, partner, onPoked });

  const partnerName = partner?.display_name?.trim() || '파트너';

  if (!partner) return null;

  // [CL-POKE-UNAVAIL-20260711-204500] 발송 불가(서버 미구성) 세션 → 쿨다운과 별개로 비활성 + 다른 안내.
  //   우선순위: unavailable(구성 문제, 새로고침 전 불변) > onCooldown(내일 해제).
  const disabled = onCooldown || unavailable;

  if (compact) {
    return (
      <AsyncButton
        variant="outline"
        size="sm"
        className="gap-1.5 flex-shrink-0"
        onClick={poke}
        disabled={disabled}
        loadingText="찌르는 중..."
        aria-label={
          unavailable
            ? '콕 찌르기 — 이메일 알림 준비 중이에요'
            : onCooldown
              ? `파트너 ${partnerName}님에게 콕 찌르기 — 내일 다시 찌를 수 있어요`
              : `파트너 ${partnerName}님에게 콕 찌르기`
        }
        title={
          unavailable
            ? '이메일 알림 준비 중이에요 🛠️'
            : onCooldown
              ? '내일 다시 찌를 수 있어요 ⏰'
              : undefined
        }
      >
        <HandHeart className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
        <span className="hidden sm:inline">콕 찌르기</span>
      </AsyncButton>
    );
  }

  return (
    <div className="inline-flex flex-col items-start">
      <AsyncButton
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 text-primary hover:text-primary"
        onClick={poke}
        disabled={disabled}
        loadingText="찌르는 중..."
        aria-label={`파트너 ${partnerName}님에게 콕 찌르기`}
      >
        <HandHeart className="w-3.5 h-3.5" aria-hidden="true" /> 콕 찌르기
      </AsyncButton>
      {unavailable ? (
        <p className="text-[10px] text-muted-foreground/70 pl-1">이메일 알림 준비 중이에요 🛠️</p>
      ) : onCooldown ? (
        <p className="text-[10px] text-muted-foreground/70 pl-1">내일 다시 찌를 수 있어요 ⏰</p>
      ) : null}
    </div>
  );
}

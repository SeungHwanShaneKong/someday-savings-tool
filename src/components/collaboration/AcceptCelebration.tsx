// [CL-TOP20-P4-COLLAB-20260703-040000] 초대 수락 축하 풀스크린 (Top 20 P4 #16 — 2인 협업 감성)
//
// AcceptInvite 성공(accepted/already_member) 시 토스트 직행 대신 잠시 머무는 축하 화면.
//  - CelebrationBurst(기존 CSS 전용 파티클) 재사용 — 신규 keyframe 0, 기존 모션 자산만.
//  - reduced-motion: 파티클/팝 없음(정적 카드) + 자동 이동 없음(사용자 제어 우선, WCAG 2.2.2)
//    → 버튼으로 즉시 이동. 비 reduced-motion 은 ACCEPT_CELEBRATION_MS 후 자동 이동 + 버튼 즉시 이동.
//  - 보안: 수락 전엔 상대 이름을 알 수 없음(RPC 응답 = budget_id 만) → 이름 비노출 카피 고정.
import { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CelebrationBurst } from '@/components/ui/celebration-burst';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * 자동 /budget 이동까지 머무는 시간.
 * 프로덕션 1.8s(스펙 1.5~2.5s). 테스트(jsdom)에선 기존 수락 스위트(AI.3/AI.4·QF.1~8)가
 * RTL waitFor 기본 타임아웃(1s) 안에 자동 이동을 관측하는 계약을 유지해야 하므로 단축(회귀 0).
 */
export const ACCEPT_CELEBRATION_MS = import.meta.env.MODE === 'test' ? 400 : 1800;

interface AcceptCelebrationProps {
  /** /budget 이동 트리거(자동·버튼 공용) — 중복 호출 가드는 부모(AcceptInvite) 책임 */
  onContinue: () => void;
}

export function AcceptCelebration({ onContinue }: AcceptCelebrationProps) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return; // reduced-motion: 자동 리다이렉트 없음 — 버튼으로만 이동
    const t = setTimeout(onContinue, ACCEPT_CELEBRATION_MS);
    return () => clearTimeout(t);
  }, [reduced, onContinue]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center"
      role="status"
      aria-live="polite"
    >
      <div className={cn('flex flex-col items-center', !reduced && 'animate-fade-up')}>
        <div className="relative mb-6">
          {/* 기존 파티클 재사용 — reduced-motion 이면 컴포넌트 자체가 null 렌더 */}
          <CelebrationBurst active count={18} radius={88} />
          <div
            className={cn(
              'w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center',
              !reduced && 'animate-check-pop',
            )}
          >
            <span className="text-4xl" aria-hidden="true">💐</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2 break-keep">
          두 분이 함께 준비하게 됐어요
        </h1>
        <p className="text-sm text-muted-foreground mb-8 max-w-xs break-keep">
          이제 예산을 같이 보고, 같이 채워갈 수 있어요.
        </p>
        <Button onClick={onContinue} autoFocus className="h-12 px-6">
          우리 예산 보러 가기 <ArrowRight className="w-4 h-4 ml-1.5" aria-hidden="true" />
        </Button>
        {!reduced && (
          <p className="mt-4 text-xs text-muted-foreground">잠시 후 자동으로 이동해요</p>
        )}
      </div>
    </div>
  );
}

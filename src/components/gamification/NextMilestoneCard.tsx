/**
 * [CL-TOP20-P4-GAMIFY-20260703-040000] 다음 방문 이유 카드
 * - "내일 오면 🔥 7일 달성!" — login/checklist 중 다음 마일스톤이 더 가까운 것 1개 노출
 * - 오늘 진행 요약(방문·체크리스트 활성 여부) 칩 2개
 * - useStreak 반환값을 props 로 주입(자체 훅 호출 금지 — 테스트 용이).
 *   랜딩 허브 통합은 PM 몫 — 여기서는 export 만 제공.
 */
import { cn } from '@/lib/utils';
import {
  pickNextVisitReason,
  type NextVisitReason,
} from '@/lib/gamification/milestone-progress';

export interface NextMilestoneCardProps {
  /** useStreak().loginStreakDays */
  loginStreakDays: number;
  /** useStreak().checklistStreakDays */
  checklistStreakDays: number;
  /** useStreak().loginActiveToday */
  loginActiveToday: boolean;
  /** useStreak().checklistActiveToday */
  checklistActiveToday: boolean;
  /** useStreak().loginNextMilestoneIn */
  loginNextMilestoneIn: number | null;
  /** useStreak().checklistNextMilestoneIn */
  checklistNextMilestoneIn: number | null;
  /** useStreak().isLoading — 로딩 중엔 렌더하지 않음(레이아웃 점프 방지) */
  isLoading?: boolean;
  className?: string;
}

/** 마일스톤 문구 생성 — 자연스러운 한국어 (내일=1일 남음 특별 처리) */
function reasonHeadline(reason: NextVisitReason): string {
  const { kind, daysToNext, targetMilestone } = reason;
  if (kind === 'login') {
    return daysToNext === 1
      ? `내일 오면 🔥 ${targetMilestone}일 달성!`
      : `${daysToNext}일 더 오면 🔥 ${targetMilestone}일 달성!`;
  }
  return daysToNext === 1
    ? `내일 체크리스트를 완료하면 ✅ ${targetMilestone}일 달성!`
    : `${daysToNext}일 더 완료하면 ✅ ${targetMilestone}일 달성!`;
}

function TodayChip({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        done
          ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : 'border-border bg-muted/30 text-muted-foreground',
      )}
    >
      <span aria-hidden>{done ? '✓' : '·'}</span>
      {label}
    </span>
  );
}

export function NextMilestoneCard({
  loginStreakDays,
  checklistStreakDays,
  loginActiveToday,
  checklistActiveToday,
  loginNextMilestoneIn,
  checklistNextMilestoneIn,
  isLoading = false,
  className,
}: NextMilestoneCardProps) {
  if (isLoading) return null;

  const reason = pickNextVisitReason({
    loginStreakDays,
    checklistStreakDays,
    loginNextMilestoneIn,
    checklistNextMilestoneIn,
  });

  return (
    <section
      aria-label="다음 방문 목표"
      className={cn(
        'rounded-xl border p-4',
        'border-[hsl(var(--wedding-gold)/0.35)] bg-[hsl(var(--wedding-gold)/0.08)]',
        className,
      )}
    >
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
        다음 방문 목표
      </p>
      <p className="text-sm sm:text-base font-semibold text-foreground leading-snug">
        {reason !== null
          ? reasonHeadline(reason)
          : '🌟 모든 마일스톤 달성! 최고 기록을 이어가고 있어요'}
      </p>
      {/* 오늘 진행 요약 */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <TodayChip done={loginActiveToday} label={`오늘 방문 ${loginActiveToday ? '완료' : '전'}`} />
        <TodayChip
          done={checklistActiveToday}
          label={`오늘 체크리스트 ${checklistActiveToday ? '완료' : '전'}`}
        />
      </div>
    </section>
  );
}

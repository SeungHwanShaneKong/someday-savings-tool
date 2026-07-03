// [CL-TOP20-P3-CHECK-20260703-030000]
/**
 * 긴급 알럿 도트 — 빨강(destructive)=기한 초과, 앰버(warning)=7일 내 마감. 미완료 기준.
 *
 * 접근성: 부모(섹션/그룹 헤더 버튼)의 aria-label 이 카운트 정보를 전달하므로
 * 시각 요소는 aria-hidden + title(마우스 툴팁)로 처리한다.
 */
import { cn } from '@/lib/utils';
import { urgencyLabelParts, type UrgencyCounts } from '@/lib/checklist-urgency';

interface UrgencyDotProps extends UrgencyCounts {
  /** true 면 도트 옆에 카운트 숫자 배지(기간 섹션 헤더용), false 면 소형 도트만(카테고리 그룹용) */
  showCount?: boolean;
  className?: string;
}

export function UrgencyDot({ overdue, dueSoon, showCount = false, className }: UrgencyDotProps) {
  if (overdue <= 0 && dueSoon <= 0) return null;
  const label = urgencyLabelParts({ overdue, dueSoon }).join(', ');

  return (
    <span
      className={cn('inline-flex items-center gap-1 flex-shrink-0', className)}
      aria-hidden="true"
      title={label}
      data-testid="urgency-dot"
    >
      {overdue > 0 &&
        (showCount ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-destructive">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
            {overdue}
          </span>
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
        ))}
      {dueSoon > 0 &&
        (showCount ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" />
            {dueSoon}
          </span>
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-warning" />
        ))}
    </span>
  );
}

// [CL-CHECKUX-20260709-232512]
/**
 * "지금 할 일" 포커스 카드 — 체크리스트 상단 상시 노출.
 * (세션 1회 OverdueAlertBanner 를 승계: 배너는 새로고침하면 사라졌지만 이 카드는 항상 보인다)
 *
 * - 행 = 원탭 체크(44px 히트영역) + 제목 + 긴급배지 + 기한 + 기간칩
 * - 행 본문 클릭 → 해당 기간 섹션으로 스크롤(onNavigateToPeriod)
 * - "+n개 더 보기" → 로컬 limit 상승(5개씩)
 * - 선정/정렬은 selectFocusItems 순수 셀렉터에 위임(항목 배지와 긴급도 프레임 일치)
 */
import { useMemo, useState } from 'react';
import { Zap } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { getUrgencyLevel } from '@/lib/checklist-nudges';
import { selectFocusItems, countUrgency } from '@/lib/checklist-urgency';
import { PERIOD_LABELS, type ChecklistPeriod } from '@/lib/checklist-templates';
import type { ChecklistItem } from '@/hooks/useChecklist';

const DEFAULT_LIMIT = 5;
const LIMIT_STEP = 5;

const URGENCY_BADGE: Record<string, { label: string; className: string }> = {
  overdue: { label: '기한 초과', className: 'bg-destructive/10 text-destructive' },
  urgent: { label: '이번 주', className: 'bg-orange-100 text-orange-800' },
  soon: { label: '이번 달', className: 'bg-yellow-100 text-yellow-800' },
};

function formatDue(dueDate: string): string {
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 까지`;
}

interface FocusNowCardProps {
  items: ChecklistItem[];
  activePeriod: ChecklistPeriod | null;
  onToggle: (id: string) => void;
  /** 행 본문 클릭 → 해당 기간 섹션으로 스크롤 */
  onNavigateToPeriod: (period: ChecklistPeriod) => void;
}

export function FocusNowCard({
  items,
  activePeriod,
  onToggle,
  onNavigateToPeriod,
}: FocusNowCardProps) {
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  // 참조 안정성 계약: items 불변이면 재계산 없음(페이지 state 리렌더에 안전)
  const { focus, totalCandidates } = useMemo(
    () => selectFocusItems(items, activePeriod, { limit }),
    [items, activePeriod, limit],
  );
  const overdueTotal = useMemo(() => countUrgency(items).overdue, [items]);

  const hiddenCount = totalCandidates - focus.length;

  return (
    <section
      aria-label="지금 할 일"
      className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-toss-sm animate-fade-up"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <h2 className="flex items-center gap-1.5 text-sm sm:text-base font-semibold text-foreground">
          <Zap className="w-4 h-4 text-primary" aria-hidden="true" />
          지금 할 일
        </h2>
        {overdueTotal > 0 && (
          <span className="text-[11px] font-medium bg-destructive/10 text-destructive px-2 py-0.5 rounded-full whitespace-nowrap">
            기한 지난 할 일 {overdueTotal}개
          </span>
        )}
      </div>

      {/* 빈 상태 — 후보 0이면 카드가 안심 문구로 유지(상시 노출) */}
      {totalCandidates === 0 ? (
        <p className="text-xs sm:text-sm text-muted-foreground py-2">
          지금 처리할 급한 할 일이 없어요. 순조롭게 진행 중이에요 🎉
        </p>
      ) : (
        <ul className="divide-y divide-border/50">
          {focus.map((item) => {
            const urgency = getUrgencyLevel(item.due_date, false);
            const badge = URGENCY_BADGE[urgency];
            const checkboxId = `focus-chk-${item.id}`;
            return (
              <li key={item.id} className="flex items-start gap-3 min-h-12 py-2 first:pt-1 last:pb-0">
                {/* 원탭 체크 — 시각 20px, 히트영역 44px(label 이 checkbox 버튼에 연결) */}
                <label
                  htmlFor={checkboxId}
                  data-testid="focus-checkbox-hit"
                  className="min-h-11 min-w-11 -my-1.5 -ml-2 flex items-center justify-center cursor-pointer flex-shrink-0"
                >
                  <Checkbox
                    id={checkboxId}
                    checked={item.is_completed}
                    onCheckedChange={() => onToggle(item.id)}
                    className="h-5 w-5 rounded-full"
                    aria-label={`${item.title} 완료로 표시`}
                  />
                </label>

                {/* 행 본문 — 클릭하면 해당 기간 섹션으로 이동 */}
                <button
                  type="button"
                  onClick={() => onNavigateToPeriod(item.period)}
                  aria-label={`${item.title} — ${PERIOD_LABELS[item.period]} 구간으로 이동`}
                  className="flex-1 min-w-0 text-left py-1 rounded-lg hover:bg-muted/40 active:bg-muted/60 transition-colors"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium leading-tight min-w-0 break-keep">
                      {item.title}
                    </span>
                    {badge && (
                      <span
                        className={cn(
                          'text-[11px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap',
                          badge.className,
                        )}
                      >
                        {badge.label}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {item.due_date && (
                      <span className="text-xs text-muted-foreground">
                        {formatDue(item.due_date)}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground/80 bg-muted/60 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                      {PERIOD_LABELS[item.period]}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* 더 보기 — 로컬 limit 상승 */}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setLimit((prev) => prev + LIMIT_STEP)}
          className="w-full min-h-11 md:min-h-9 mt-1 text-xs font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
        >
          +{hiddenCount}개 더 보기
        </button>
      )}
    </section>
  );
}

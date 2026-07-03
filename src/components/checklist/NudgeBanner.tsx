// [CL-AI-HIERARCHY-20260308-163000]
// [DDAY-INLINE-PICKER-2026-03-07] 인라인 날짜 선택기 Popover 통합
// [CL-TOP20-P3-CHECK-20260703-030000] D-day 실시간 프리뷰 카드 + 빈 상태 샘플 스켈레톤
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, X, CalendarDays, Clock } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getRandomNoDdayNudge, getRandomIncompleteNudge } from '@/lib/checklist-nudges';
import { getDdayPreview } from '@/lib/checklist-urgency';
import { CHECKLIST_TEMPLATES, PERIOD_LABELS } from '@/lib/checklist-templates';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// [CL-TOP20-P3-CHECK-20260703-030000] 빈 상태 샘플 프리뷰 — 실제 템플릿 앞 3개(회색·읽기전용)
const SAMPLE_TEMPLATES = CHECKLIST_TEMPLATES.slice(0, 3);

interface NudgeBannerProps {
  type: 'no-dday' | 'incomplete';
  onAction?: () => void;
  actionLabel?: string;
  /** [DDAY-INLINE-PICKER-2026-03-07] 인라인 날짜 선택 후 저장 콜백 */
  onSave?: (date: string, time: string) => Promise<void>;
  /** [CL-TOP20-P3-CHECK-20260703-030000] 체크리스트 0개(빈 상태)일 때 샘플 항목 스켈레톤 노출 */
  showSamplePreview?: boolean;
}

export function NudgeBanner({ type, onAction, actionLabel, onSave, showSamplePreview = false }: NudgeBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [nudge] = useState(() =>
    type === 'no-dday' ? getRandomNoDdayNudge() : getRandomIncompleteNudge()
  );

  // [DDAY-INLINE-PICKER-2026-03-07] 인라인 날짜 선택기 상태
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('12:00');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedDate || !onSave) return;

    setSaving(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const timeStr = `${selectedTime}:00`;
      await onSave(dateStr, timeStr);
      setPopoverOpen(false);
    } catch (err) {
      console.error('D-day save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  if (dismissed) return null;

  // [DDAY-INLINE-PICKER-2026-03-07] onSave가 있으면 인라인 Popover 렌더링
  const useInlinePicker = type === 'no-dday' && !!onSave;

  return (
    <div className="relative bg-gradient-to-r from-primary/10 via-blue-50 to-primary/5 rounded-2xl p-4 sm:p-5 border border-primary/20">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground rounded-full"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <span className="text-2xl flex-shrink-0">{nudge.emoji}</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground leading-snug">
            {nudge.message}
          </p>

          {/* [DDAY-INLINE-PICKER-2026-03-07] 인라인 날짜 선택기 Popover */}
          {useInlinePicker && actionLabel && (
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="default"
                  className="mt-2.5 h-8 text-xs"
                >
                  <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                  {actionLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      결혼 날짜
                    </label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      locale={ko}
                      className="rounded-md border pointer-events-auto"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-primary" />
                      결혼 시간
                    </label>
                    <Input
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  {/* [CL-TOP20-P3-CHECK-20260703-030000] 실시간 D-day 프리뷰 카드 */}
                  <div aria-live="polite">
                    {selectedDate && (() => {
                      const preview = getDdayPreview(selectedDate);
                      return (
                        <div
                          data-testid="dday-preview"
                          className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-1"
                        >
                          <p className="text-sm font-semibold text-primary">
                            {preview.ddayLabel} · {preview.dateLabel}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            저장하면 {CHECKLIST_TEMPLATES.length}개 할 일이 시기별로 배치돼요
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  <Button
                    onClick={handleSave}
                    disabled={!selectedDate || saving}
                    className="w-full"
                  >
                    {saving ? '저장 중...' : '저장'}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* 기존 방식: onAction 콜백으로 네비게이션 (onSave가 없을 때 fallback) */}
          {!useInlinePicker && onAction && actionLabel && (
            <Button
              size="sm"
              variant="default"
              className="mt-2.5 h-8 text-xs"
              onClick={onAction}
            >
              <CalendarIcon className="w-3.5 h-3.5 mr-1" />
              {actionLabel}
            </Button>
          )}

          {/* [CL-TOP20-P3-CHECK-20260703-030000] 빈 상태(체크리스트 0) — 샘플 항목 3개 스켈레톤 프리뷰 */}
          {type === 'no-dday' && showSamplePreview && (
            <div className="mt-3.5 space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">
                날짜를 설정하면 이렇게 생성돼요
              </p>
              <ul className="space-y-1.5" aria-label="체크리스트 미리보기 예시">
                {SAMPLE_TEMPLATES.map((t) => (
                  <li
                    key={t.title}
                    className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/40 px-3 py-2 select-none"
                  >
                    <span
                      className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-muted-foreground/30"
                      aria-hidden="true"
                    />
                    <span className="truncate text-xs text-muted-foreground">
                      {t.title}
                    </span>
                    <span className="ml-auto flex-shrink-0 text-[10px] text-muted-foreground/70">
                      {PERIOD_LABELS[t.period]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// [CACHE-BUST-20260307-172400]
// [DDAY-INLINE-PICKER-2026-03-07] 인라인 날짜 선택기 Popover 통합
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, X, CalendarDays, Clock } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getRandomNoDdayNudge, getRandomIncompleteNudge } from '@/lib/checklist-nudges';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface NudgeBannerProps {
  type: 'no-dday' | 'incomplete';
  onAction?: () => void;
  actionLabel?: string;
  /** [DDAY-INLINE-PICKER-2026-03-07] 인라인 날짜 선택 후 저장 콜백 */
  onSave?: (date: string, time: string) => Promise<void>;
}

export function NudgeBanner({ type, onAction, actionLabel, onSave }: NudgeBannerProps) {
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
    <div className="relative bg-gradient-to-r from-primary/10 via-blue-50 to-primary/5 rounded-2xl p-4 border border-primary/20">
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
        </div>
      </div>
    </div>
  );
}

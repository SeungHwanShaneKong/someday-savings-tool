import { useState, useEffect } from 'react';
import { useWeddingDate } from '@/hooks/useWeddingDate';
import { Button } from '@/components/ui/button';
// [CL-BTNPERFECT-20260629] 저장/초기화 더블서밋 차단 + 진행 중 비활성·스피너(중복 DB write 방지)
import { AsyncButton } from '@/components/ui/async-button';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarDays, Clock, Heart, Settings2 } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface CountdownValues {
  days: number;
  hours: number;
  minutes: number;
  isPast: boolean;
}

// [CL-QUALITY-DDAY-20260621] D-day 는 raw 24h 주기가 아니라 "오늘 0시 ~ 결혼일 0시"의 달력 일수다.
// (이전 Math.floor(diff/24h) 는 결혼 전날 저녁부터 당일까지 하루 적게 'D-0일'로 표시하는 off-by-one 버그)
// export: 단위 테스트용(다른 호출처 없음, 비파괴).
export function calculateCountdown(targetDate: Date): CountdownValues {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  // 두 끝점을 로컬 자정으로 정규화해 달력 일수 계산. Math.round 로 DST 부동소수 잡음 방어.
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const calendarDays = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86400000);

  if (diff <= 0) {
    return { days: Math.abs(calendarDays), hours: 0, minutes: 0, isPast: true };
  }

  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days: calendarDays, hours, minutes, isPast: false };
}

export function WeddingCountdown() {
  const { weddingDate, weddingTime, loading, updateWeddingDate } = useWeddingDate();
  const [countdown, setCountdown] = useState<CountdownValues | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('12:00');

  // Parse the stored date/time and calculate countdown
  useEffect(() => {
    if (!weddingDate) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      try {
        const dateStr = weddingDate;
        const timeStr = weddingTime || '00:00:00';
        
        // Parse date and time
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hours, minutes] = timeStr.split(':').map(Number);
        
        const targetDate = new Date(year, month - 1, day, hours, minutes, 0);
        setCountdown(calculateCountdown(targetDate));
      } catch (error) {
        console.error('Failed to parse wedding date:', error);
        setCountdown(null);
      }
    };

    updateCountdown();
    
    // Update every minute
    const interval = setInterval(updateCountdown, 60 * 1000);
    return () => clearInterval(interval);
  }, [weddingDate, weddingTime]);

  // Sync selected date when opening the popover
  useEffect(() => {
    if (isOpen && weddingDate) {
      try {
        const [year, month, day] = weddingDate.split('-').map(Number);
        setSelectedDate(new Date(year, month - 1, day));
        if (weddingTime) {
          setSelectedTime(weddingTime.slice(0, 5)); // HH:MM format
        }
      } catch {
        setSelectedDate(undefined);
      }
    }
  }, [isOpen, weddingDate, weddingTime]);

  // [CL-BTNPERFECT-20260629] useAsyncAction: pendingRef 동기 게이트로 같은 틱 더블클릭 차단(중복 updateWeddingDate),
  //   실패 시 표준 토스트, 진행 중 버튼 비활성+스피너. 성공 시에만 팝오버 닫기.
  const save = useAsyncAction(async () => {
    if (!selectedDate) {
      await updateWeddingDate(null, null);
    } else {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const timeStr = `${selectedTime}:00`; // Add seconds
      await updateWeddingDate(dateStr, timeStr);
    }
    setIsOpen(false);
  });

  const clear = useAsyncAction(async () => {
    await updateWeddingDate(null, null);
    setSelectedDate(undefined);
    setSelectedTime('12:00');
    setIsOpen(false);
  });

  if (loading) {
    return (
      <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* Countdown Display */}
      {!weddingDate ? (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              size="lg"
              className={cn(
                "gap-2 px-5 py-3 h-auto min-h-[48px]",
                "text-base sm:text-lg font-bold",
                "bg-primary",
                "text-primary-foreground",
                "shadow-[0_4px_16px_hsl(var(--primary)/0.35)]",
                "hover:shadow-[0_6px_24px_hsl(var(--primary)/0.5)]",
                "hover:scale-[1.02] hover:bg-primary/90 active:scale-[0.98]",
                "transition-all duration-200 ease-out",
                "rounded-xl"
              )}
            >
              <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="hidden sm:inline">결혼 일정을 입력해 주세요</span>
              <span className="sm:hidden">D-Day 설정</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
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
              <div className="flex gap-2">
                <AsyncButton onClick={() => save.run()} pending={save.pending} loadingText="저장 중…" className="flex-1">
                  저장
                </AsyncButton>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      ) : countdown ? (
        <div className="flex items-center gap-2">
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-2 font-medium transition-all",
                  countdown.isPast
                    ? "text-destructive hover:text-destructive/80"
                    : "text-primary hover:text-primary/80"
                )}
              >
                {countdown.isPast ? (
                  <>
                    <Heart className="h-4 w-4 fill-current" />
                    <span className="hidden sm:inline">결혼을 축하드립니다!</span>
                    <span className="font-bold">D+{countdown.days}일</span>
                  </>
                ) : (
                  <>
                    <CalendarDays className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      D-{countdown.days}일 {countdown.hours}시간 {countdown.minutes}분
                    </span>
                    <span className="sm:hidden">
                      D-{countdown.days}일
                    </span>
                  </>
                )}
                <Settings2 className="h-3.5 w-3.5 ml-1 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
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
                <div className="flex gap-2">
                  <AsyncButton variant="outline" onClick={() => clear.run()} pending={clear.pending} loadingText="처리 중…" className="flex-1">
                    초기화
                  </AsyncButton>
                  <AsyncButton onClick={() => save.run()} pending={save.pending} loadingText="저장 중…" className="flex-1">
                    저장
                  </AsyncButton>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      ) : null}
    </div>
  );
}

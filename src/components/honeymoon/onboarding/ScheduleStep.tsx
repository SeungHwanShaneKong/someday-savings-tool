/**
 * [CL-HONEYMOON-REDESIGN-20260316] 일정 선택 스텝
 * 듀얼 썸 슬라이더 + 출발월 그리드 + AI 추천 CTA
 */

import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduleStepProps {
  nightsMin: number;
  nightsMax: number;
  onNightsChange: (min: number, max: number) => void;
  departureMonth: number | null;
  onDepartureMonthChange: (month: number | null) => void;
  onNext: () => void;
}

const MONTHS = [
  { value: 1, label: '1월' }, { value: 2, label: '2월' },
  { value: 3, label: '3월' }, { value: 4, label: '4월' },
  { value: 5, label: '5월' }, { value: 6, label: '6월' },
  { value: 7, label: '7월' }, { value: 8, label: '8월' },
  { value: 9, label: '9월' }, { value: 10, label: '10월' },
  { value: 11, label: '11월' }, { value: 12, label: '12월' },
];

export function ScheduleStep({
  nightsMin, nightsMax, onNightsChange,
  departureMonth, onDepartureMonthChange, onNext,
}: ScheduleStepProps) {
  return (
    <div className="flex flex-col items-center w-full py-8">
      <h2 className="text-heading text-foreground text-center mb-2">
        며칠 동안
        <br />
        다녀올까요?
      </h2>
      <p className="text-sm text-muted-foreground mb-8">
        자유롭게 조절해보세요
      </p>

      {/* Nights display */}
      <div className="text-display text-primary mb-2 tabular-nums">
        {nightsMin === nightsMax ? `${nightsMin}박` : `${nightsMin}~${nightsMax}박`}
      </div>
      <p className="text-xs text-muted-foreground mb-6">
        {nightsMin + 1}일 ~ {nightsMax + 1}일
      </p>

      {/* Dual-thumb slider */}
      <div className="w-full max-w-sm mb-10">
        <Slider
          value={[nightsMin, nightsMax]}
          min={2}
          max={14}
          step={1}
          onValueChange={([min, max]) => onNightsChange(min, max)}
          aria-label="여행 기간"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>2박</span>
          <span>14박</span>
        </div>
      </div>

      {/* Departure month */}
      <div className="w-full max-w-sm mb-8">
        <p className="text-sm text-foreground font-medium mb-3 text-center">
          출발 예정 월 <span className="text-muted-foreground text-xs">(선택)</span>
        </p>
        <div className="grid grid-cols-6 gap-2">
          {MONTHS.map(m => (
            <button
              key={m.value}
              onClick={() =>
                onDepartureMonthChange(departureMonth === m.value ? null : m.value)
              }
              className={cn(
                'py-2 rounded-xl text-xs font-medium transition-all',
                departureMonth === m.value
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Button
        size="lg"
        onClick={onNext}
        className="rounded-2xl px-8 py-5 text-base font-semibold w-full max-w-sm shadow-primary-glow"
      >
        <Sparkles className="w-5 h-5 mr-2" />
        AI 추천 받기
      </Button>
    </div>
  );
}

import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatKoreanWon } from '@/lib/budget-categories';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import type { HoneymoonFilters } from '@/hooks/useHoneymoonMap';
import type { HoneymoonConcept, AccommodationType } from '@/lib/honeymoon-destinations';

interface FilterSlidersProps {
  filters: HoneymoonFilters;
  onUpdate: <K extends keyof HoneymoonFilters>(
    key: K,
    value: HoneymoonFilters[K]
  ) => void;
  onReset: () => void;
}

const CONCEPT_OPTIONS: { value: HoneymoonConcept; label: string; emoji: string }[] = [
  { value: '휴양', label: '휴양', emoji: '🏖️' },
  { value: '관광', label: '관광', emoji: '🏛️' },
  { value: '쇼핑', label: '쇼핑', emoji: '🛍️' },
  { value: '액티비티', label: '액티비티', emoji: '🤿' },
];

const ACCOMMODATION_OPTIONS: { value: AccommodationType; label: string; emoji: string }[] = [
  { value: '풀빌라', label: '풀빌라', emoji: '🏝️' },
  { value: '올인클루시브', label: '올인클루', emoji: '🍹' },
  { value: '리조트', label: '리조트', emoji: '🏨' },
  { value: '호텔', label: '호텔', emoji: '🏢' },
  { value: '에어비앤비', label: '에어비앤비', emoji: '🏠' },
];

export function FilterSliders({ filters, onUpdate, onReset }: FilterSlidersProps) {
  return (
    <div className="space-y-4 bg-card rounded-xl border border-border p-4 hover:shadow-toss transition-all duration-200">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">필터</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onReset}
          aria-label="필터 초기화"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          초기화
        </Button>
      </div>

      {/* Budget slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">💰 예산</span>
          <span className="text-xs font-medium text-primary">
            {formatKoreanWon(filters.maxBudget)}
          </span>
        </div>
        <Slider
          value={[filters.maxBudget]}
          min={2000000}
          max={15000000}
          step={500000}
          onValueChange={([v]) => onUpdate('maxBudget', v)}
          aria-label="예산 범위"
        />
      </div>

      {/* Nights slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">📅 기간</span>
          <span className="text-xs font-medium text-primary">
            {filters.minNights}~{filters.maxNights}박
          </span>
        </div>
        <Slider
          value={[filters.minNights, filters.maxNights]}
          min={3}
          max={14}
          step={1}
          onValueChange={([min, max]) => {
            onUpdate('minNights', min);
            onUpdate('maxNights', max);
          }}
          aria-label="여행 기간"
        />
      </div>

      {/* Concept toggle */}
      <div>
        <span className="text-xs text-muted-foreground block mb-2">🎯 컨셉</span>
        <ToggleGroup
          type="multiple"
          value={filters.concepts}
          onValueChange={(v) =>
            onUpdate('concepts', v as HoneymoonConcept[])
          }
          className="flex flex-wrap gap-1.5"
        >
          {CONCEPT_OPTIONS.map((opt) => (
            <ToggleGroupItem
              key={opt.value}
              value={opt.value}
              className="text-xs h-7 px-2.5 rounded-full"
            >
              {opt.emoji} {opt.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Accommodation toggle */}
      <div>
        <span className="text-xs text-muted-foreground block mb-2">🏨 숙소</span>
        <ToggleGroup
          type="multiple"
          value={filters.accommodationTypes}
          onValueChange={(v) =>
            onUpdate('accommodationTypes', v as AccommodationType[])
          }
          className="flex flex-wrap gap-1.5"
        >
          {ACCOMMODATION_OPTIONS.map((opt) => (
            <ToggleGroupItem
              key={opt.value}
              value={opt.value}
              className="text-xs h-7 px-2.5 rounded-full"
            >
              {opt.emoji} {opt.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}

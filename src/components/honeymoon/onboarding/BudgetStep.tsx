/**
 * [CL-HONEYMOON-REDESIGN-20260316] 예산 슬라이더 스텝
 * 토스 스타일 대형 금액 표시 + 티어 칩 + 매칭 여행지 프리뷰
 */

import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatKoreanWon } from '@/lib/budget-categories';
import { DESTINATIONS } from '@/lib/honeymoon-destinations';
import { cn } from '@/lib/utils';

interface BudgetStepProps {
  value: number;
  onChange: (value: number) => void;
  onNext: () => void;
}

const BUDGET_TIERS = [
  { label: '절약형', emoji: '🏠', value: 3000000 },
  { label: '표준형', emoji: '✨', value: 6000000 },
  { label: '프리미엄', emoji: '💎', value: 10000000 },
];

export function BudgetStep({ value, onChange, onNext }: BudgetStepProps) {
  const matchingDests = DESTINATIONS.filter(d => d.budgetRange.min <= value);

  return (
    <div className="flex flex-col items-center w-full py-8">
      <h2 className="text-heading text-foreground text-center mb-2">
        여행 예산은
        <br />
        얼마가 좋을까요?
      </h2>
      <p className="text-sm text-muted-foreground mb-8">
        2인 기준 총 예산이에요
      </p>

      {/* Large budget display */}
      <div className="text-display text-primary mb-8 tabular-nums">
        {formatKoreanWon(value)}
      </div>

      {/* Slider */}
      <div className="w-full max-w-sm mb-6">
        <Slider
          value={[value]}
          min={2000000}
          max={15000000}
          step={500000}
          onValueChange={([v]) => onChange(v)}
          aria-label="예산 범위"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>200만원</span>
          <span>1,500만원</span>
        </div>
      </div>

      {/* Tier quick-set chips */}
      <div className="flex gap-2 mb-8">
        {BUDGET_TIERS.map(tier => (
          <button
            key={tier.label}
            onClick={() => onChange(tier.value)}
            className={cn(
              'px-4 py-2 rounded-full text-xs font-medium transition-all',
              'border border-border hover:border-primary/50',
              value === tier.value
                ? 'bg-primary text-white border-primary'
                : 'bg-card text-foreground',
            )}
          >
            {tier.emoji} {tier.label}
          </button>
        ))}
      </div>

      {/* [CL-TOP100-DESTINATIONS-20260325] Matching destinations preview (최대 8개 + 외 N개) */}
      <div className="bg-muted/30 rounded-2xl p-4 w-full max-w-sm mb-8">
        <p className="text-xs text-muted-foreground mb-2">
          이 예산이면 갈 수 있는 곳
        </p>
        <div className="flex flex-wrap gap-1.5">
          {matchingDests.slice(0, 8).map(d => (
            <Badge
              key={d.id}
              variant="outline"
              className="text-xs rounded-full"
            >
              {d.markerEmoji} {d.name}
            </Badge>
          ))}
          {matchingDests.length > 8 && (
            <Badge variant="secondary" className="text-xs rounded-full">
              외 {matchingDests.length - 8}개
            </Badge>
          )}
          {matchingDests.length === 0 && (
            <span className="text-xs text-muted-foreground">
              예산을 조금 더 높여보세요
            </span>
          )}
        </div>
      </div>

      {/* Next button */}
      <Button
        size="lg"
        onClick={onNext}
        className="rounded-2xl px-8 py-5 text-base font-semibold w-full max-w-sm"
      >
        다음
      </Button>
    </div>
  );
}

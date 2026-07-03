// [CL-TOP20-P1-SIM-20260703-010000]
// 랜딩 인터랙티브 예산 미니 시뮬레이터 — Top 20 로드맵 P1(#3).
// 익명 첫 방문자가 하객 수 × 예식 스타일 두 번의 조작만으로 "내 결혼 예산" 감을 잡고
// 본 서비스(가입/체험)로 브리지되도록 하는 랜딩 전용 위젯.
//
// 설계 원칙:
// - 수치는 AVERAGE_COSTS(2025 전국 평균, src/lib/average-costs.ts) 단일소스에서 파생 — 하드코딩 최소화.
// - recharts 금지(랜딩 초기 번들에 vendor-chart 유입 방지) → 브레이크다운은 순수 div 바.
// - 라우팅/저장은 부모 책임: onStartClick / onDemoClick 콜백으로만 브리지(현재 추정값 전달).
// - 계측: 첫 조작 1회 landing_calc_interact(trackFunnelOnce) + CTA landing_calc_bridge_click(dest).

import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { AnimatedWon } from '@/components/budget/AnimatedWon';
import { AVERAGE_COSTS, SOURCE_TEXT } from '@/lib/average-costs';
import { formatKoreanWon } from '@/lib/budget-categories';
import { trackFunnel, trackFunnelOnce } from '@/lib/analytics/funnel-events';
import { cn } from '@/lib/utils';

// ── 산식 상수 (전부 AVERAGE_COSTS 파생) ─────────────────────────────────────────
/** 카테고리 소계(원) — AVERAGE_COSTS 단일소스 합산. */
const sumCategory = (categoryId: string): number =>
  Object.values(AVERAGE_COSTS[categoryId] ?? {}).reduce((acc, item) => acc + item.amount, 0);

/** 평균 식대 14,000,000원의 note 가 '200명 기준' → 1인 식대 = 14,000,000 ÷ 200 = 70,000원/인. */
const MEAL_REFERENCE_GUESTS = 200;
const MEAL_COST_PER_GUEST = AVERAGE_COSTS['main-ceremony']['meal-cost'].amount / MEAL_REFERENCE_GUESTS;

/** 예식장·본식(식대 제외) = 대관료 + 답례품 + 예식 스탭 + 본식 스냅. */
const CEREMONY_FIXED_TOTAL =
  sumCategory('main-ceremony') - AVERAGE_COSTS['main-ceremony']['meal-cost'].amount;
const SUDEME_TOTAL = sumCategory('sudeme-styling');
const GIFTS_TOTAL = sumCategory('gifts-houseware');
const HONEYMOON_TOTAL = sumCategory('honeymoon');
/** 준비·홍보(청첩장 등) + 기타(피로연 등) — 총액에는 포함, 브레이크다운 상위 노출에선 제외. */
const ETC_TOTAL = sumCategory('preparation-promotion') + sumCategory('miscellaneous');
/** 하객 수와 무관한 고정 비용 합(신혼집 제외 전 카테고리). */
const FIXED_BASE_TOTAL =
  CEREMONY_FIXED_TOTAL + SUDEME_TOTAL + GIFTS_TOTAL + HONEYMOON_TOTAL + ETC_TOTAL;

/**
 * 스타일 배수 근거:
 * - 알뜰형 0.75 — 공공/야외 예식·뷔페·직접 준비 등으로 전국 평균 대비 약 25% 절감하는 실속 코스.
 * - 표준형 1.0  — AVERAGE_COSTS(2025 전국 평균) 그대로.
 * - 프리미엄 1.4 — 호텔 예식·하이엔드 스드메 기준, 평균 대비 약 40% 상향.
 */
export type WeddingStyleId = 'saving' | 'standard' | 'premium';

interface StyleOption {
  id: WeddingStyleId;
  label: string;
  hint: string;
  multiplier: number;
}

const STYLE_OPTIONS: StyleOption[] = [
  { id: 'saving', label: '알뜰형', hint: '비용 절감', multiplier: 0.75 },
  { id: 'standard', label: '표준형', hint: '전국 평균', multiplier: 1.0 },
  { id: 'premium', label: '프리미엄', hint: '호텔·하이엔드', multiplier: 1.4 },
];

const GUESTS_MIN = 50;
const GUESTS_MAX = 500;
const GUESTS_STEP = 10;
const DEFAULT_GUESTS = 250;

/** 표시용 만원 단위 반올림 — 랜딩 추정치는 원 단위 정밀도가 무의미. */
const roundToManwon = (value: number): number => Math.round(value / 10_000) * 10_000;

interface BreakdownItem {
  name: string;
  amount: number;
}

/** 콜백으로 부모에 전달되는 현재 추정 스냅샷. */
export interface SimulatorEstimate {
  guests: number;
  styleId: WeddingStyleId;
  /** 만원 단위 반올림된 예상 총예산(원). */
  total: number;
}

export interface LandingBudgetSimulatorProps {
  /** "이 예산으로 시작하기" 클릭 — 라우팅/저장은 부모 담당. 현재 추정값을 전달한다. */
  onStartClick: (estimate: SimulatorEstimate) => void;
  /** "체험판에서 자세히 보기" 클릭 — 미전달 시 버튼 자체를 렌더하지 않는다. */
  onDemoClick?: (estimate: SimulatorEstimate) => void;
  className?: string;
}

export function LandingBudgetSimulator({ onStartClick, onDemoClick, className }: LandingBudgetSimulatorProps) {
  const [guests, setGuests] = useState(DEFAULT_GUESTS);
  const [styleId, setStyleId] = useState<WeddingStyleId>('standard');
  // 첫 조작 계측 가드 — trackFunnelOnce 가 세션 중복도 막지만, 드래그 틱마다의 스토리지 접근을 차단.
  const interactedRef = useRef(false);

  const style = STYLE_OPTIONS.find((option) => option.id === styleId) ?? STYLE_OPTIONS[1];

  const { total, breakdown, maxItemAmount } = useMemo(() => {
    const multiplier = style.multiplier;
    // 총액 = (고정 비용 합 + 하객 수 × 1인 식대) × 스타일 배수, 만원 단위 반올림.
    const rawTotal = (FIXED_BASE_TOTAL + guests * MEAL_COST_PER_GUEST) * multiplier;
    // 브레이크다운 = 식대(슬라이더 반응성을 위해 항상 노출) + 고정 비용 상위 3개 묶음.
    // 고정 묶음 크기 순서는 예물·혼수(3,160만) > 예식장·본식(790만) > 신혼여행(690만) > 스드메(605만)로
    // 배수와 무관하게 불변 → 스드메·기타는 총액에만 포함하고 상위 노출에서 제외.
    const items: BreakdownItem[] = [
      { name: '식대·연회', amount: roundToManwon(guests * MEAL_COST_PER_GUEST * multiplier) },
      { name: '예물·혼수·가전', amount: roundToManwon(GIFTS_TOTAL * multiplier) },
      { name: '예식장·본식', amount: roundToManwon(CEREMONY_FIXED_TOTAL * multiplier) },
      { name: '신혼여행', amount: roundToManwon(HONEYMOON_TOTAL * multiplier) },
    ].sort((a, b) => b.amount - a.amount);
    return {
      total: roundToManwon(rawTotal),
      breakdown: items,
      maxItemAmount: items[0]?.amount ?? 0,
    };
  }, [guests, style]);

  const markInteracted = () => {
    if (interactedRef.current) return;
    interactedRef.current = true;
    trackFunnelOnce('landing_calc_interact');
  };

  const handleGuestsChange = (value: number[]) => {
    markInteracted();
    setGuests(value[0] ?? DEFAULT_GUESTS);
  };

  const handleStyleSelect = (id: WeddingStyleId) => {
    markInteracted();
    setStyleId(id);
  };

  const handleBridge = (dest: 'start' | 'demo', callback?: (estimate: SimulatorEstimate) => void) => {
    trackFunnel('landing_calc_bridge_click', { dest, style: styleId, guests, total });
    callback?.({ guests, styleId, total });
  };

  return (
    <Card className={cn('mx-auto w-full max-w-lg border-border bg-card', className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">우리 결혼, 얼마나 들까요?</CardTitle>
        <CardDescription>
          하객 수와 예식 스타일만 고르면 2025년 전국 평균 데이터로 바로 계산해 드려요.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 하객 수 슬라이더 */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-foreground">예상 하객 수</span>
            <span className="text-sm font-semibold tabular-nums text-primary">
              {guests.toLocaleString()}명
            </span>
          </div>
          <Slider
            value={[guests]}
            min={GUESTS_MIN}
            max={GUESTS_MAX}
            step={GUESTS_STEP}
            onValueChange={handleGuestsChange}
            aria-label="예상 하객 수"
          />
          <div className="flex justify-between text-xs text-muted-foreground" aria-hidden="true">
            <span>{GUESTS_MIN}</span>
            <span>{GUESTS_MAX}</span>
          </div>
        </div>

        {/* 예식 스타일 3택 토글 */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">예식 스타일</p>
          <div role="group" aria-label="예식 스타일" className="grid grid-cols-3 gap-2">
            {STYLE_OPTIONS.map((option) => {
              const selected = option.id === styleId;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => handleStyleSelect(option.id)}
                  className={cn(
                    'rounded-lg border px-2 py-2.5 text-center transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="mt-0.5 block text-[11px]">{option.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 예상 총예산 — 시각용 카운트업(aria-hidden) + 스크린리더용 최종값(aria-live) 분리 */}
        <div className="rounded-xl bg-secondary/50 px-4 py-5 text-center">
          <p className="text-xs font-medium text-muted-foreground">예상 총예산</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-primary" aria-hidden="true">
            <AnimatedWon value={total} />
          </p>
          <p role="status" aria-live="polite" className="sr-only">
            예상 총예산 {formatKoreanWon(total)}
          </p>
        </div>

        {/* 상위 항목 미니 브레이크다운 (recharts 없이 순수 바) */}
        <ul className="space-y-2.5">
          {breakdown.map((item) => (
            <li key={item.name} className="space-y-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-medium tabular-nums text-foreground">
                  {formatKoreanWon(item.amount)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-primary/70 transition-[width] duration-500 motion-reduce:transition-none"
                  style={{
                    width: `${maxItemAmount > 0 ? Math.max(4, Math.round((item.amount / maxItemAmount) * 100)) : 0}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          스드메·준비 비용까지 포함한 추정이며 신혼집 비용은 제외돼 있어요. {SOURCE_TEXT}
        </p>
      </CardContent>

      <CardFooter className="flex-col gap-2">
        <Button size="lg" className="w-full" onClick={() => handleBridge('start', onStartClick)}>
          이 예산으로 시작하기
        </Button>
        {onDemoClick && (
          <Button variant="outline" className="w-full" onClick={() => handleBridge('demo', onDemoClick)}>
            체험판에서 자세히 보기
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

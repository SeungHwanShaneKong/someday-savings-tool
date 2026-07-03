// [CL-TOP20-P3-HIDDEN-20260703-030000] 숨은 비용 경고 트리거 — Top20 P3-#13
// 고스트였던 HiddenCostWarning 을 예산 테이블 항목 행에 배선하는 소형 amber 트리거.
// Tooltip 대신 Popover 단일 채택: 클릭/탭 공통 동작(데스크톱·모바일 일관), 설명이 길어
// hover 소실 위험이 없는 쪽이 WCAG 1.4.13(호버 콘텐츠) 관점에서 안전.
// 발동 조건은 룰 엔진(hidden-costs BRD §1)과 동일 — 해당 항목에 금액이 입력(>0)된 경우만.
import { AlertTriangle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HiddenCostWarning } from './HiddenCostWarning';
import { getHiddenRules } from '@/lib/hidden-cost-map';
import { formatKoreanWon } from '@/lib/budget-categories';
import { cn } from '@/lib/utils';

interface HiddenCostTriggerProps {
  categoryId: string;
  subCategoryId: string;
  /** 금액 입력(>0) 시에만 트리거 노출 — 룰 엔진 발동 조건과 동일 */
  amount: number;
  /** 접근성 라벨용 항목 표시명 */
  itemName: string;
  className?: string;
}

export function HiddenCostTrigger({
  categoryId,
  subCategoryId,
  amount,
  itemName,
  className,
}: HiddenCostTriggerProps) {
  if (amount <= 0) return null;
  const rules = getHiddenRules(categoryId, subCategoryId);
  if (rules.length === 0) return null;

  const total = rules.reduce((sum, r) => sum + r.estimatedCost, 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${itemName} 숨은 비용 ${rules.length}건 보기`}
          className={cn(
            // [CL-TOP20-R50-UI-20260703-094000] 터치 타깃 확장 — 모바일 36px(h-9), md 이상 기존 20px 유지.
            // 셀 내 배치(flex items-center gap-1, align-middle 셀) 확인: 행 높이만 유연하게 늘고 컬럼 붕괴 없음.
            'inline-flex h-9 w-9 md:h-5 md:w-5 flex-shrink-0 items-center justify-center rounded-full',
            'bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 dark:text-amber-400',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1',
            'transition-colors touch-manipulation',
            className,
          )}
        >
          <AlertTriangle className="h-4 w-4 md:h-3 md:w-3" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="z-50 w-72 p-3" side="top" align="start" collisionPadding={16}>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            놓치기 쉬운 숨은 비용 {rules.length}건
          </p>
          <HiddenCostWarning
            categoryId={categoryId}
            subCategoryId={subCategoryId}
            amount={amount}
            showDescription
          />
          <p className="border-t border-border pt-1.5 text-[11px] text-muted-foreground">
            예상 추가 비용 합계{' '}
            <span className="font-semibold text-amber-700 dark:text-amber-300">
              +{formatKoreanWon(total)}
            </span>
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// [CL-TOP20-P3-SUMMARY-20260703-030000] 비교표 모바일 카드화 — 아코디언(행당 1카드)
// 데스크톱 표(overflow-x-auto)와 동일 데이터·동일 최저/최고 규칙을 모바일 세로 레이아웃으로 재구성.
// 표의 색상 규칙 유지 + 색상만으로 구분하지 않도록 최저/최고 텍스트 배지 병기(WCAG 1.4.1).

import type { ReactNode } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { formatKoreanWon } from '@/lib/budget-categories';

export interface ComparisonColumn {
  id: string;
  label: string;
  /** 예산 대표색 (CHART_COLORS) — 미니 바/총합 값에 사용 */
  color: string;
}

export interface ComparisonRow {
  key: string;
  label: string;
  /** 이모지 문자열 또는 색 점 등 임의 노드 */
  icon?: ReactNode;
  /** columns 와 같은 순서의 금액 배열 */
  values: number[];
}

interface ComparisonCardsProps {
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
  /** 카테고리 표의 최저(초록)/최고(주황) 강조 — 분담 표는 false (데스크톱 표와 동일 규칙) */
  highlightMinMax?: boolean;
  /** 아코디언 하단 고정 총합 행 (카테고리 표 전용) */
  totalRow?: { label: string; values: number[] };
}

/**
 * 데스크톱 표의 최저/최고 규칙 계승 (최저=0 제외 최솟값 · 전값 동률이면 무강조).
 * 한 옵션에만 있는 지출([0, N])은 최고만 표시 — 격차 자체가 의사결정 포인트.
 */
function getRowFlags(values: number[], columnsCount: number) {
  const maxInRow = Math.max(...values);
  const hasSpread = maxInRow !== Math.min(...values); // 0 포함 스프레드(동률 가드)
  const positives = values.filter(v => v > 0);
  const minNonzero = positives.length > 0 ? Math.min(...positives) : 0;
  return values.map(value => ({
    isMax: value === maxInRow && value > 0 && columnsCount > 1 && hasSpread,
    isMin: value === minNonzero && value > 0 && columnsCount > 1 && maxInRow !== minNonzero,
  }));
}

export function ComparisonCards({
  columns,
  rows,
  highlightMinMax = false,
  totalRow,
}: ComparisonCardsProps) {
  if (rows.length === 0 && !totalRow) return null;

  return (
    <div>
      <Accordion type="multiple" defaultValue={rows.length > 0 ? [rows[0].key] : []}>
        {rows.map(row => {
          const flags = getRowFlags(row.values, columns.length);
          const maxInRow = Math.max(...row.values, 0);
          const gap =
            row.values.length > 1
              ? Math.max(...row.values) - Math.min(...row.values)
              : 0;

          return (
            <AccordionItem key={row.key} value={row.key}>
              <AccordionTrigger className="py-3 hover:no-underline">
                <span className="flex flex-1 items-center justify-between gap-2 pr-2 text-left">
                  <span className="flex items-center gap-2 min-w-0">
                    {row.icon != null && (
                      <span className="shrink-0" aria-hidden="true">
                        {row.icon}
                      </span>
                    )}
                    <span className="text-sm font-medium truncate">{row.label}</span>
                  </span>
                  {highlightMinMax && gap > 0 && (
                    <span className="shrink-0 text-xs font-normal text-muted-foreground">
                      격차 {formatKoreanWon(gap)}
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-3">
                  {columns.map((column, i) => {
                    const value = row.values[i];
                    const { isMin, isMax } = flags[i];
                    const barWidth = maxInRow > 0 ? Math.round((value / maxInRow) * 100) : 0;

                    return (
                      <li key={column.id}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground truncate">
                            {column.label}
                          </span>
                          <span className="flex items-center gap-1.5 shrink-0">
                            {highlightMinMax && isMin && (
                              <span className="text-[10px] leading-none bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                                최저
                              </span>
                            )}
                            {highlightMinMax && isMax && (
                              <span className="text-[10px] leading-none bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
                                최고
                              </span>
                            )}
                            <span
                              className={`text-sm ${
                                highlightMinMax && isMin
                                  ? 'text-green-600 font-medium'
                                  : highlightMinMax && isMax
                                    ? 'text-orange-600 font-medium'
                                    : 'font-medium'
                              }`}
                            >
                              {value > 0 ? formatKoreanWon(value) : '-'}
                            </span>
                          </span>
                        </div>
                        {/* 미니 가로 바 — 값은 텍스트로 이미 제공되므로 시각 보조 전용 */}
                        <div
                          className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden"
                          aria-hidden="true"
                        >
                          <div
                            className="h-full rounded-full transition-[width]"
                            style={{ width: `${barWidth}%`, backgroundColor: column.color }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {totalRow && (
        <div className="mt-3 rounded-xl bg-muted/50 p-3">
          <p className="text-sm font-semibold mb-2">{totalRow.label}</p>
          <ul className="space-y-1.5">
            {columns.map((column, i) => (
              <li key={column.id} className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground truncate">{column.label}</span>
                <span className="text-sm font-semibold" style={{ color: column.color }}>
                  {formatKoreanWon(totalRow.values[i])}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

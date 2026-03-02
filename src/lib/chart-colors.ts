import type { CSSProperties } from 'react';

/**
 * 차트 색상 상수 — CSS 변수 기반 통합 관리
 * 모든 차트 컴포넌트에서 이 상수를 import하여 사용
 */
export const CHART_COLORS = [
  'hsl(var(--chart-1))', // Primary Blue
  'hsl(var(--chart-2))', // Pink/Bride
  'hsl(var(--chart-3))', // Green/Success
  'hsl(var(--chart-4))', // Orange/Warning
  'hsl(var(--chart-5))', // Purple
] as const;

export type CostSplitColorKey = 'groom' | 'bride' | 'together' | '-';

export const COST_SPLIT_COLORS: Record<CostSplitColorKey, string> = {
  groom: 'hsl(221, 83%, 53%)',
  bride: 'hsl(340, 75%, 55%)',
  together: 'hsl(145, 65%, 42%)',
  '-': 'hsl(var(--muted-foreground))',
};

/** Recharts 공통 툴팁 스타일 */
export const CHART_TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--radius)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
};

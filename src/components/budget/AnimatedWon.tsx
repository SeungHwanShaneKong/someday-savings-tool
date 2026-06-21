// [CL-AUDIT-COUNTUP-ISOLATE-20260622] 카운트업 리프 컴포넌트 — 페이지 리렌더 증폭 차단.
//   기존엔 BudgetFlow 가 직접 useCountUp(getTotal()) 을 호출 → rAF 프레임마다 페이지가 리렌더되고
//   비메모 BudgetTable(~40행)까지 통째로 재조정됐다. 카운트업을 이 리프에 가두면 rAF 리렌더는
//   이 작은 텍스트 노드에만 머물고 형제 테이블은 영향받지 않는다.
import { formatKoreanWon } from '@/lib/budget-categories';
import { useCountUp } from '@/hooks/useCountUp';
import { cn } from '@/lib/utils';

interface AnimatedWonProps {
  value: number;
  className?: string;
}

export function AnimatedWon({ value, className }: AnimatedWonProps) {
  const animated = useCountUp(value);
  return <span className={cn('animate-number', className)}>{formatKoreanWon(animated)}</span>;
}

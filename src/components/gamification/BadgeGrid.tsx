/**
 * [CL-GAMIFY-INT-20260418-222329] 뱃지 그리드 (획득/미획득 차등)
 * - 카테고리별 섹션 분할 옵션
 * - 획득한 뱃지는 컬러, 미획득은 회색톤 + 자물쇠
 */
import { useMemo } from 'react';
import { BadgeChip } from './BadgeChip';
import type {
  BadgeDefinition,
  UserEarnedBadge,
} from '@/lib/gamification/types';

interface BadgeGridProps {
  definitions: ReadonlyArray<BadgeDefinition>;
  earned: ReadonlyArray<UserEarnedBadge>;
  groupByCategory?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const CATEGORY_LABELS: Record<string, string> = {
  starter: '🎯 시작',
  planner: '💼 플래너',
  saver: '💰 절약',
  ai_ace: '🤖 AI 에이스',
  legendary: '👑 전설',
};

export function BadgeGrid({
  definitions,
  earned,
  groupByCategory = true,
  size = 'md',
}: BadgeGridProps) {
  // 모든 훅은 early-return 전에 호출 (rules-of-hooks)
  const earnedMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of earned) m.set(e.badge_id, e.earned_at);
    return m;
  }, [earned]);

  // display_order 기준 정렬
  const sortedDefs = useMemo(
    () => [...definitions].sort((a, b) => a.display_order - b.display_order),
    [definitions],
  );

  const grouped = useMemo(() => {
    const m = new Map<string, BadgeDefinition[]>();
    for (const def of sortedDefs) {
      if (!m.has(def.category)) m.set(def.category, []);
      m.get(def.category)!.push(def);
    }
    return m;
  }, [sortedDefs]);

  const earnedCount = earnedMap.size;
  const totalCount = sortedDefs.length;

  if (!groupByCategory) {
    return (
      <section aria-label="뱃지 컬렉션">
        <div className="text-xs text-muted-foreground mb-3">
          획득 {earnedCount} / 전체 {totalCount}
        </div>
        <div className="flex flex-wrap gap-3">
          {sortedDefs.map((def) => (
            <BadgeChip
              key={def.id}
              badge={def}
              earned={earnedMap.has(def.id)}
              earnedAt={earnedMap.get(def.id)}
              size={size}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6" aria-label="뱃지 컬렉션">
      <div className="text-sm text-muted-foreground">
        획득 <span className="font-bold text-foreground">{earnedCount}</span> / 전체 {totalCount}
      </div>
      {Array.from(grouped.entries()).map(([category, defs]) => {
        const earnedInGroup = defs.filter((d) => earnedMap.has(d.id)).length;
        return (
          <div key={category}>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center justify-between">
              <span>{CATEGORY_LABELS[category] ?? category}</span>
              <span className="text-xs text-muted-foreground font-normal">
                {earnedInGroup}/{defs.length}
              </span>
            </h3>
            <div className="flex flex-wrap gap-3">
              {defs.map((def) => (
                <BadgeChip
                  key={def.id}
                  badge={def}
                  earned={earnedMap.has(def.id)}
                  earnedAt={earnedMap.get(def.id)}
                  size={size}
                />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

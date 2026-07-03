// [CL-TREE-HIERARCHY-20260308-190000]
// [CL-TREE-REDESIGN-20260403] 트리 커넥터 + forceExpand + 미니 프로그레스
// [CL-TOP20-P3-CHECK-20260703-030000] 그룹 헤더 소형 긴급 도트 + 긴급순 정렬
import { useState, useEffect, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChecklistItem } from './ChecklistItem';
import { UrgencyDot } from './UrgencyDot';
import { countUrgency, sortItemsByUrgency, urgencyLabelParts } from '@/lib/checklist-urgency';
import type { CategoryGroup } from '@/lib/checklist-tree';

/** 카테고리 색상 → tree-branch CSS 클래스 매핑 */
const TREE_BRANCH_COLORS: Record<string, string> = {
  'blue-400':    'tree-branch-blue',
  'pink-400':    'tree-branch-pink',
  'amber-400':   'tree-branch-amber',
  'emerald-400': 'tree-branch-emerald',
  'sky-400':     'tree-branch-sky',
  'gray-400':    'tree-branch-gray',
  'slate-300':   'tree-branch-slate',
};

interface ChecklistCategoryGroupProps {
  group: CategoryGroup;
  isLast?: boolean;
  forceExpand?: boolean | null;
  /** [CL-TOP20-P3-CHECK-20260703-030000] 긴급순 보기 — on 시 항목을 due 임박순 정렬(완료 하단) */
  urgencySort?: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onBudgetLink?: (categoryLink: string, subCategoryLink: string) => void;
}

export function ChecklistCategoryGroup({
  group,
  forceExpand,
  urgencySort = false,
  onToggle,
  onDelete,
  onUpdateNotes,
  onBudgetLink,
}: ChecklistCategoryGroupProps) {
  const { meta, items, completed } = group;
  const allDone = completed === items.length && items.length > 0;
  const percentage = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

  // 스마트 기본 상태: 완료 그룹은 접힘, 미완료는 펼침
  const [isOpen, setIsOpen] = useState(!allDone);

  // [CL-TREE-REDESIGN-20260403] forceExpand 동기화
  useEffect(() => {
    if (forceExpand === true) setIsOpen(true);
    else if (forceExpand === false) setIsOpen(false);
  }, [forceExpand]);

  const treeBranchColor = TREE_BRANCH_COLORS[meta.color] || 'tree-branch-slate';

  // [CL-TOP20-P3-CHECK-20260703-030000] 그룹 긴급 카운트(미완료만) + 긴급순 정렬(원본 불변)
  const urgency = useMemo(() => countUrgency(items), [items]);
  const urgencyAria = urgencyLabelParts(urgency)
    .map((part) => `, ${part}`)
    .join('');
  const displayItems = useMemo(
    () => (urgencySort ? sortItemsByUrgency(items) : items),
    [items, urgencySort]
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="space-y-0">
        {/* Category sub-header — 클릭으로 접기/펼치기 */}
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 sm:py-2 rounded-lg',
              'hover:bg-muted/40 active:bg-muted/60 transition-colors cursor-pointer',
              'group'
            )}
            aria-label={`${meta.name} 그룹, ${items.length}개 항목 중 ${completed}개 완료${urgencyAria}`}
          >
            {/* 카테고리 아이콘 */}
            <span className="text-sm flex-shrink-0" aria-hidden="true">
              {meta.icon}
            </span>

            {/* 카테고리 이름 */}
            <span
              className={cn(
                'text-xs sm:text-sm font-semibold text-foreground/80 truncate',
                allDone && 'text-muted-foreground line-through'
              )}
            >
              {meta.name}
            </span>

            {/* [CL-TOP20-P3-CHECK-20260703-030000] 소형 긴급 도트 */}
            <UrgencyDot overdue={urgency.overdue} dueSoon={urgency.dueSoon} />

            {/* [CL-TREE-REDESIGN-20260403] 미니 프로그레스 바 + 카운트 */}
            <div className="flex items-center gap-1.5 ml-auto mr-1 flex-shrink-0">
              <Progress
                value={percentage}
                className="w-12 h-1 hidden sm:block"
                indicatorClassName={cn(
                  allDone ? 'bg-green-500' : 'bg-primary/60'
                )}
              />
              <span
                className={cn(
                  'text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-full',
                  allDone
                    ? 'bg-green-100 text-green-700'
                    : completed > 0
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {completed}/{items.length}
              </span>
            </div>

            {/* 접기/펼치기 인디케이터 */}
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 text-muted-foreground flex-shrink-0 transition-transform duration-200',
                'group-hover:text-foreground',
                isOpen && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </button>
        </CollapsibleTrigger>

        {/* [CL-TREE-REDESIGN-20260403] 아이템 컨테이너 — 트리 커넥터 */}
        <CollapsibleContent className="collapsible-content">
          <div className={cn(
            'ml-3 sm:ml-4 space-y-2 sm:space-y-2.5 pb-1',
            allDone && 'opacity-60'
          )}>
            {displayItems.map((item, idx) => (
              <div
                key={item.id}
                className={cn(
                  'tree-branch',
                  treeBranchColor,
                  idx === displayItems.length - 1 && 'last-tree-item'
                )}
              >
                <ChecklistItem
                  item={item}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onUpdateNotes={onUpdateNotes}
                  onBudgetLink={onBudgetLink}
                />
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

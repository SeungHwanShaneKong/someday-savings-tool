// [CL-TREE-HIERARCHY-20260308-190000]
// 인터렉티브 카테고리 그룹 — Collapsible 트리 노드
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChecklistItem } from './ChecklistItem';
import type { CategoryGroup } from '@/lib/checklist-tree';

/** 카테고리 색상 → Tailwind border-l 클래스 매핑 */
const TREE_LINE_COLORS: Record<string, string> = {
  'blue-400':    'border-l-blue-400',
  'pink-400':    'border-l-pink-400',
  'amber-400':   'border-l-amber-400',
  'emerald-400': 'border-l-emerald-400',
  'sky-400':     'border-l-sky-400',
  'gray-400':    'border-l-gray-400',
  'slate-300':   'border-l-slate-300',
};

interface ChecklistCategoryGroupProps {
  group: CategoryGroup;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onBudgetLink?: (categoryLink: string, subCategoryLink: string) => void;
}

export function ChecklistCategoryGroup({
  group,
  onToggle,
  onDelete,
  onUpdateNotes,
  onBudgetLink,
}: ChecklistCategoryGroupProps) {
  const { meta, items, completed } = group;
  const allDone = completed === items.length && items.length > 0;

  // 스마트 기본 상태: 완료 그룹은 접힘, 미완료는 펼침
  const [isOpen, setIsOpen] = useState(!allDone);

  const treeLine = TREE_LINE_COLORS[meta.color] || 'border-l-slate-300';

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
            aria-label={`${meta.name} 그룹, ${items.length}개 항목 중 ${completed}개 완료`}
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

            {/* 진행률 pill */}
            <span
              className={cn(
                'text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ml-auto mr-1',
                allDone
                  ? 'bg-green-100 text-green-700'
                  : completed > 0
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {completed}/{items.length}
            </span>

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

        {/* 아이템 컨테이너 — 트리라인 + 들여쓰기 */}
        <CollapsibleContent className="collapsible-content">
          <div
            className={cn(
              'ml-3 sm:ml-4 pl-3 sm:pl-4 border-l-2 space-y-2 sm:space-y-2.5 pb-1',
              treeLine,
              allDone && 'opacity-60'
            )}
          >
            {items.map((item) => (
              <ChecklistItem
                key={item.id}
                item={item}
                onToggle={onToggle}
                onDelete={onDelete}
                onUpdateNotes={onUpdateNotes}
                onBudgetLink={onBudgetLink}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

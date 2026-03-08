// [CL-TREE-HIERARCHY-20260308-190000]
// 체크리스트 트리 하이어라키 — 카테고리 그룹핑 유틸리티
import type { ChecklistItem } from '@/hooks/useChecklist';

/** 카테고리 그룹 표시 순서 */
export const CATEGORY_GROUP_ORDER = [
  'main-ceremony',
  'sudeme-styling',
  'gifts-houseware',
  'preparation-promotion',
  'honeymoon',
  'miscellaneous',
  'general',
] as const;

/** 카테고리 그룹 메타 — 이름, 아이콘, 트리라인 색상 */
export const CATEGORY_GROUP_META: Record<
  string,
  { name: string; icon: string; color: string }
> = {
  'main-ceremony':         { name: '본식 운영',       icon: '💒', color: 'blue-400' },
  'sudeme-styling':        { name: '스드메·스타일링',  icon: '📸', color: 'pink-400' },
  'gifts-houseware':       { name: '혼수·예물',       icon: '💍', color: 'amber-400' },
  'preparation-promotion': { name: '사전 준비·인사',   icon: '📋', color: 'emerald-400' },
  'honeymoon':             { name: '신혼여행',         icon: '✈️', color: 'sky-400' },
  'miscellaneous':         { name: '기타',             icon: '🎵', color: 'gray-400' },
  'general':               { name: '일반 준비',        icon: '📌', color: 'slate-300' },
};

export interface CategoryGroup {
  key: string;
  meta: { name: string; icon: string; color: string };
  items: ChecklistItem[];
  completed: number;
}

/**
 * 아이템을 category_link 기준으로 그룹핑
 * - CATEGORY_GROUP_ORDER 순서 유지
 * - 각 그룹 내부: 미완료 우선, sort_order 순
 * - 빈 그룹 제외
 */
export function groupItemsByCategory(items: ChecklistItem[]): CategoryGroup[] {
  const map = new Map<string, ChecklistItem[]>();

  for (const item of items) {
    const key = item.category_link || 'general';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  const groups: CategoryGroup[] = [];

  for (const key of CATEGORY_GROUP_ORDER) {
    const groupItems = map.get(key);
    if (!groupItems || groupItems.length === 0) continue;

    // 정렬: 미완료 우선 → sort_order 순
    groupItems.sort((a, b) => {
      if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
      return a.sort_order - b.sort_order;
    });

    groups.push({
      key,
      meta: CATEGORY_GROUP_META[key] || CATEGORY_GROUP_META['general'],
      items: groupItems,
      completed: groupItems.filter((i) => i.is_completed).length,
    });
  }

  return groups;
}

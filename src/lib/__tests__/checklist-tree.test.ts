// [CL-COVERAGE50-20260620] checklist-tree 단위 검증 — 미테스트 영역 커버리지 보강
import { describe, it, expect } from 'vitest';
import type { ChecklistItem } from '@/hooks/useChecklist';
import {
  groupItemsByCategory,
  CATEGORY_GROUP_ORDER,
  CATEGORY_GROUP_META,
  type CategoryGroup,
} from '@/lib/checklist-tree';

/**
 * ChecklistItem 팩토리 — 테스트에 필요한 필드만 지정하고 나머지는 안전한 기본값.
 * groupItemsByCategory 는 id, sort_order, is_completed, category_link 만 사용하지만
 * 타입 안정성을 위해 전체 형태를 채운다.
 */
function makeItem(overrides: Partial<ChecklistItem> & { id: string }): ChecklistItem {
  return {
    user_id: 'u1',
    template_id: null,
    budget_id: null,
    title: `item-${overrides.id}`,
    period: 'general' as ChecklistItem['period'],
    sort_order: 0,
    is_completed: false,
    completed_at: null,
    due_date: null,
    notes: null,
    depends_on: null,
    category_link: null,
    sub_category_link: null,
    is_custom: false,
    created_at: '2026-06-20T00:00:00Z',
    updated_at: '2026-06-20T00:00:00Z',
    ...overrides,
  };
}

const keysOf = (groups: CategoryGroup[]) => groups.map((g) => g.key);
const idsOf = (group: CategoryGroup) => group.items.map((i) => i.id);

describe('checklist-tree · groupItemsByCategory', () => {
  // UT.1 — Happy path: category_link 기준 그룹핑 + CATEGORY_GROUP_ORDER 순서 유지
  it('UT.1 입력 순서와 무관하게 그룹을 CATEGORY_GROUP_ORDER 순으로 정렬한다', () => {
    // 의도적으로 ORDER 와 역순(honeymoon → main-ceremony)으로 입력
    const items: ChecklistItem[] = [
      makeItem({ id: 'h1', category_link: 'honeymoon', sort_order: 1 }),
      makeItem({ id: 'm1', category_link: 'main-ceremony', sort_order: 1 }),
      makeItem({ id: 'g1', category_link: 'gifts-houseware', sort_order: 1 }),
    ];

    const groups = groupItemsByCategory(items);

    // 결과 순서는 입력 순서가 아니라 CATEGORY_GROUP_ORDER 를 따라야 한다
    expect(keysOf(groups)).toEqual(['main-ceremony', 'gifts-houseware', 'honeymoon']);
    // 각 그룹의 meta 는 CATEGORY_GROUP_META 에서 해상도되어야 한다
    expect(groups[0].meta).toBe(CATEGORY_GROUP_META['main-ceremony']);
    expect(groups[0].meta.name).toBe('본식 운영');
  });

  // UT.2 — 그룹 내부 정렬: 미완료 우선 → sort_order 오름차순
  it('UT.2 그룹 내부에서 미완료 항목을 먼저, 그 안에서 sort_order 오름차순으로 정렬한다', () => {
    const items: ChecklistItem[] = [
      makeItem({ id: 'done-low', category_link: 'main-ceremony', sort_order: 1, is_completed: true }),
      makeItem({ id: 'open-high', category_link: 'main-ceremony', sort_order: 9, is_completed: false }),
      makeItem({ id: 'open-low', category_link: 'main-ceremony', sort_order: 2, is_completed: false }),
      makeItem({ id: 'done-high', category_link: 'main-ceremony', sort_order: 8, is_completed: true }),
    ];

    const [group] = groupItemsByCategory(items);

    // 미완료(open-low, open-high) → sort_order 순, 이후 완료(done-low, done-high) → sort_order 순
    expect(idsOf(group)).toEqual(['open-low', 'open-high', 'done-low', 'done-high']);
    expect(group.completed).toBe(2);
  });

  // UT.3 — completed 카운트는 그룹별 is_completed=true 개수와 정확히 일치
  it('UT.3 각 그룹의 completed 는 해당 그룹 완료 항목 수와 일치한다', () => {
    const items: ChecklistItem[] = [
      makeItem({ id: 'm-a', category_link: 'main-ceremony', is_completed: true }),
      makeItem({ id: 'm-b', category_link: 'main-ceremony', is_completed: false }),
      makeItem({ id: 'm-c', category_link: 'main-ceremony', is_completed: true }),
      makeItem({ id: 'h-a', category_link: 'honeymoon', is_completed: false }),
    ];

    const groups = groupItemsByCategory(items);
    const byKey = Object.fromEntries(groups.map((g) => [g.key, g]));

    expect(byKey['main-ceremony'].completed).toBe(2);
    expect(byKey['main-ceremony'].items).toHaveLength(3);
    expect(byKey['honeymoon'].completed).toBe(0);
    expect(byKey['honeymoon'].items).toHaveLength(1);
  });

  // AC.1 — Empty/zero: 입력이 비면 빈 배열 반환 (빈 그룹은 절대 생성 안 함)
  it('AC.1 빈 입력에 대해 빈 배열을 반환하고 빈 그룹을 만들지 않는다', () => {
    const groups = groupItemsByCategory([]);
    expect(groups).toEqual([]);
    expect(groups).toHaveLength(0);
  });

  // AC.2 — Missing input: category_link 가 null/빈문자열이면 'general' 버킷으로 폴백
  it("AC.2 category_link 가 null 또는 빈 문자열이면 'general' 그룹으로 폴백한다", () => {
    const items: ChecklistItem[] = [
      makeItem({ id: 'n1', category_link: null, sort_order: 1 }),
      makeItem({ id: 'e1', category_link: '', sort_order: 2 }),
    ];

    const groups = groupItemsByCategory(items);

    expect(keysOf(groups)).toEqual(['general']);
    expect(idsOf(groups[0])).toEqual(['n1', 'e1']);
    expect(groups[0].meta).toBe(CATEGORY_GROUP_META['general']);
  });

  // AC.3 — 동률 안정성: is_completed/sort_order 가 모두 같으면 입력 순서를 보존(stable sort)
  it('AC.3 is_completed 와 sort_order 가 동일하면 입력 순서를 안정적으로 보존한다', () => {
    const items: ChecklistItem[] = [
      makeItem({ id: 'first', category_link: 'general', sort_order: 5, is_completed: false }),
      makeItem({ id: 'second', category_link: 'general', sort_order: 5, is_completed: false }),
      makeItem({ id: 'third', category_link: 'general', sort_order: 5, is_completed: false }),
    ];

    const [group] = groupItemsByCategory(items);
    // V8 Array.sort 는 안정 정렬 → 비교자가 0 을 반환하면 원래 순서 유지
    expect(idsOf(group)).toEqual(['first', 'second', 'third']);
  });

  // AC.4 — 전체 7개 그룹이 모두 존재할 때 정확히 CATEGORY_GROUP_ORDER 와 동일한 순서로 방출
  it('AC.4 모든 카테고리가 채워지면 CATEGORY_GROUP_ORDER 전체 순서대로 그룹을 방출한다', () => {
    const items: ChecklistItem[] = CATEGORY_GROUP_ORDER.map((key, idx) =>
      makeItem({ id: `k-${key}`, category_link: key, sort_order: idx }),
    );

    const groups = groupItemsByCategory(items);

    expect(keysOf(groups)).toEqual([...CATEGORY_GROUP_ORDER]);
    expect(groups).toHaveLength(CATEGORY_GROUP_ORDER.length);
  });

  // [CL-COVERAGE50-FIX-20260620] FIXED: 미등록 category_link 는 null/'' 과 동일하게 'general' 그룹으로
  // 폴백한다(데이터 유실 0). 이전엔 CATEGORY_GROUP_ORDER 만 순회해 미등록 항목이 출력에서 사라졌음.
  it("EDGE.1 CATEGORY_GROUP_ORDER 에 없는 category_link 항목은 'general' 그룹으로 폴백한다(유실 0)", () => {
    const items: ChecklistItem[] = [
      makeItem({ id: 'known', category_link: 'honeymoon' }),
      makeItem({ id: 'unknown', category_link: 'not-a-real-category' }),
    ];

    const groups = groupItemsByCategory(items);

    // honeymoon + general(미등록 폴백) 두 그룹이 CATEGORY_GROUP_ORDER 순서로 방출
    expect(keysOf(groups)).toEqual(['honeymoon', 'general']);
    // 미등록 항목도 유실 없이 'general' 아래로 들어간다
    const general = groups.find((g) => g.key === 'general')!;
    expect(general.items.map((i) => i.id)).toContain('unknown');
    const allEmittedIds = groups.flatMap((g) => g.items.map((i) => i.id));
    expect(allEmittedIds).toContain('known');
    expect(allEmittedIds).toContain('unknown');
  });

  // EDGE.2 — 순수성: 입력 배열의 항목 식별자 집합이 보존되어야 하며, 정렬은 그룹 내부 복사본에서만 일어난다.
  // (구현이 map.get(key).push 로 원본 참조를 모으지만, 입력 배열 자체의 길이는 변하지 않아야 한다.)
  it('EDGE.2 입력 배열 자체의 length 는 변하지 않는다(원본 비파괴)', () => {
    const items: ChecklistItem[] = [
      makeItem({ id: 'a', category_link: 'main-ceremony', sort_order: 3, is_completed: true }),
      makeItem({ id: 'b', category_link: 'main-ceremony', sort_order: 1, is_completed: false }),
    ];
    const originalLength = items.length;
    const originalIds = items.map((i) => i.id);

    groupItemsByCategory(items);

    expect(items).toHaveLength(originalLength);
    expect(items.map((i) => i.id)).toEqual(originalIds);
  });
});

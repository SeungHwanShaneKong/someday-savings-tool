import { useState, useEffect, useCallback } from 'react';
import { BUDGET_CATEGORIES, Category } from '@/lib/budget-categories';

// [CL-SEC-AUDIT-20260703-101500] 보안감사 취약점 #2 [데이터 경계] 근본수정.
//
// 기본 스토리지 키(실사용 /budget 경로). BudgetTable/BudgetTableMobile 의 no-arg 호출은
// 이 키를 그대로 쓰므로 기존 동작은 100% 불변(하위호환).
const DEFAULT_STORAGE_KEY = 'budget-category-order';

export interface UseCategoryOrderOptions {
  /** 카테고리 순서를 영속할 localStorage 키. 미지정 시 모듈 오버라이드→기본키 순으로 해석. */
  storageKey?: string;
}

// ── 모듈 레벨 스코프 오버라이드 ────────────────────────────────────────────────
// BudgetTable 내부는 useCategoryOrder() 를 no-arg 로 호출하므로 prop 으로 스코프를
// 주입할 수 없다. 격리 셸이 마운트 동안 활성 스코프를 지정할 수 있도록
// 모듈 레벨 오버라이드를 제공한다. no-arg 호출은 이 오버라이드를 우선 참조한다.
// (명시적 storageKey 인자는 오버라이드보다 항상 우선한다 — 인자 > 오버라이드 > 기본.)
// [CL-LOGIN-GATE-20260709-233447] 원 소비자였던 /demo(체험판)는 폐지 — 스코프 격리는
// 범용 메커니즘(scope.test 계약·미래 격리 소비자)이므로 유지한다.
let categoryOrderScopeOverride: string | null = null;

/**
 * 모듈 레벨 카테고리-순서 스코프 오버라이드를 설정/해제한다.
 * @param storageKey 활성화할 스토리지 키, 또는 null(해제 → 기본키 복귀).
 */
export function setCategoryOrderScopeOverride(storageKey: string | null): void {
  categoryOrderScopeOverride = storageKey;
}

/** 현재 유효 스토리지 키 해석: 명시 인자 > 모듈 오버라이드 > 기본키. */
function resolveStorageKey(explicit?: string): string {
  if (explicit) return explicit;
  if (categoryOrderScopeOverride) return categoryOrderScopeOverride;
  return DEFAULT_STORAGE_KEY;
}

export function useCategoryOrder(options?: UseCategoryOrderOptions) {
  // 마운트 시점에 유효 키를 고정(렌더마다 재해석하지 않도록 lazy init).
  // 데모 셸은 useLayoutEffect 로 override 를 먼저 세팅한 뒤 BudgetTable 을 렌더하므로
  // BudgetTable 내부 useCategoryOrder 의 첫 렌더에서 데모 키가 잡힌다.
  const [storageKey] = useState<string>(() => resolveStorageKey(options?.storageKey));

  const [orderedCategories, setOrderedCategories] = useState<Category[]>(BUDGET_CATEGORIES);

  // Load order from localStorage on mount (스코프된 키에서만 읽음)
  useEffect(() => {
    const savedOrder = localStorage.getItem(storageKey);
    if (savedOrder) {
      try {
        const orderIds: string[] = JSON.parse(savedOrder);
        const reordered = orderIds
          .map(id => BUDGET_CATEGORIES.find(cat => cat.id === id))
          .filter((cat): cat is Category => cat !== undefined);

        // Add any new categories that might have been added to the default list
        BUDGET_CATEGORIES.forEach(cat => {
          if (!reordered.find(c => c.id === cat.id)) {
            reordered.push(cat);
          }
        });

        setOrderedCategories(reordered);
      } catch (e) {
        console.error('Failed to parse saved category order:', e);
      }
    }
  }, [storageKey]);

  const reorderCategories = useCallback((activeId: string, overId: string) => {
    setOrderedCategories(prev => {
      const oldIndex = prev.findIndex(cat => cat.id === activeId);
      const newIndex = prev.findIndex(cat => cat.id === overId);

      if (oldIndex === -1 || newIndex === -1) return prev;

      const newOrder = [...prev];
      const [movedItem] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, movedItem);

      // Save to localStorage (스코프된 키에만 씀 — 실키 오염 차단)
      localStorage.setItem(storageKey, JSON.stringify(newOrder.map(cat => cat.id)));

      return newOrder;
    });
  }, [storageKey]);

  const resetOrder = useCallback(() => {
    localStorage.removeItem(storageKey);
    setOrderedCategories(BUDGET_CATEGORIES);
  }, [storageKey]);

  return {
    orderedCategories,
    reorderCategories,
    resetOrder,
  };
}

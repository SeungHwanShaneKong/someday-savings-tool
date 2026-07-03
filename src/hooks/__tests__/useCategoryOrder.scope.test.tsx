// [CL-SEC-AUDIT-20260703-101500] 보안감사 취약점 #2 [데이터 경계] TDD.
//
// /demo(게스트) 가 실사용자 localStorage 카테고리 순서('budget-category-order')를
// 양방향 오염하는 결함을 입증·근본수정 검증한다.
//  - 상속(읽기) 오염: 데모가 실키 순서를 상속 → 프라이버시/혼란.
//  - 덮어쓰기(쓰기) 오염: 게스트 데모 재정렬이 실사용자 저장 순서를 파괴 → "데모 실효과 0" 계약 위반.
// 근본수정: useCategoryOrder 에 옵셔널 스코프(storageKey) + 모듈 레벨 스코프 오버라이드.
// BudgetTable no-arg 호출은 완전 불변(하위호환) 이어야 한다.
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { BUDGET_CATEGORIES } from '@/lib/budget-categories';
import {
  useCategoryOrder,
  setCategoryOrderScopeOverride,
} from '@/hooks/useCategoryOrder';

const REAL_KEY = 'budget-category-order';
const DEMO_KEY = 'demo-category-order';

// 원본 순서와 다른 결정론적 재정렬: [0]<->[1] 스왑(첫 두 카테고리 뒤집기)
const swappedIds = (): string[] => {
  const ids = BUDGET_CATEGORIES.map((c) => c.id);
  [ids[0], ids[1]] = [ids[1], ids[0]];
  return ids;
};

beforeEach(() => {
  try {
    localStorage.clear();
  } catch {
    /* noop */
  }
  // 모듈 레벨 오버라이드 누수 방지(테스트 격리)
  setCategoryOrderScopeOverride(null);
});

// ─── 취약점 #2 결함 재현(API 무의존) ──────────────────────────────────────────
// 이 블록은 옵셔널 스코프 API 없이도 "현재 훅이 무스코프 전역키를 쓴다"는
// 오염의 근원을 직접 입증한다. 근본수정 후에도 (기본 경로 불변이므로) green 유지되나,
// 데모가 반드시 storageKey/override 로 격리돼야 한다는 계약의 red 증거다.
describe('취약점 #2 결함 재현 — 무스코프 전역키 오염 근원', () => {
  it('V0: no-arg 훅 2개 인스턴스가 같은 전역키를 공유(=데모↔실사용 오염 통로)', () => {
    // 인스턴스 A(실사용자 역할)가 재정렬 → 전역키에 기록
    const a = renderHook(() => useCategoryOrder());
    act(() => {
      a.result.current.reorderCategories(BUDGET_CATEGORIES[0].id, BUDGET_CATEGORIES[1].id);
    });
    const afterA = localStorage.getItem(REAL_KEY);
    expect(afterA).not.toBeNull();

    // 인스턴스 B(데모 역할, 동일 no-arg)가 마운트 → 같은 전역키를 상속(오염 상속)
    const b = renderHook(() => useCategoryOrder());
    expect(b.result.current.orderedCategories[0].id).toBe(BUDGET_CATEGORIES[1].id);

    // B(데모)가 되돌리는 재정렬 → 전역키를 덮어써 A(실사용자) 순서 파괴(오염 덮어쓰기)
    act(() => {
      b.result.current.reorderCategories(BUDGET_CATEGORIES[1].id, BUDGET_CATEGORIES[0].id);
    });
    // 무스코프이므로 실키가 B에 의해 변경됨(=취약점): afterA 와 달라짐
    expect(localStorage.getItem(REAL_KEY)).not.toBe(afterA);
  });
});

describe('useCategoryOrder — 기본(no-arg) 하위호환 [BudgetTable 경로 회귀 가드]', () => {
  it('B1: no-arg 는 실키(budget-category-order)에서 읽는다(상속 유지)', () => {
    localStorage.setItem(REAL_KEY, JSON.stringify(swappedIds()));
    const { result } = renderHook(() => useCategoryOrder());
    // 스왑된 순서를 상속 — 첫 두 카테고리가 뒤집혀야 함
    expect(result.current.orderedCategories[0].id).toBe(BUDGET_CATEGORIES[1].id);
    expect(result.current.orderedCategories[1].id).toBe(BUDGET_CATEGORIES[0].id);
  });

  it('B2: no-arg reorder 는 실키에 쓴다(기존 동작 불변)', () => {
    const { result } = renderHook(() => useCategoryOrder());
    act(() => {
      result.current.reorderCategories(BUDGET_CATEGORIES[0].id, BUDGET_CATEGORIES[1].id);
    });
    const persisted: string[] = JSON.parse(localStorage.getItem(REAL_KEY) ?? '[]');
    expect(persisted[0]).toBe(BUDGET_CATEGORIES[1].id);
    expect(persisted[1]).toBe(BUDGET_CATEGORIES[0].id);
    // 데모 전용키는 오염되지 않음
    expect(localStorage.getItem(DEMO_KEY)).toBeNull();
  });
});

describe('useCategoryOrder — 스코프 격리 [취약점 #2 근본수정]', () => {
  it('S1: 상속 격리 — 실키에 순서가 있어도 데모 스코프는 상속하지 않는다(기본순서)', () => {
    // 실사용자가 첫 두 카테고리를 뒤집어 저장한 상태
    localStorage.setItem(REAL_KEY, JSON.stringify(swappedIds()));
    // 데모 스코프(storageKey=demo)로 훅 사용
    const { result } = renderHook(() => useCategoryOrder({ storageKey: DEMO_KEY }));
    // 데모는 실키를 상속하지 않음 → 원본 기본순서 유지
    expect(result.current.orderedCategories[0].id).toBe(BUDGET_CATEGORIES[0].id);
    expect(result.current.orderedCategories[1].id).toBe(BUDGET_CATEGORIES[1].id);
  });

  it('S2: 쓰기 격리 — 데모 재정렬이 실키를 건드리지 않고 데모 전용키에만 쓴다', () => {
    // 실사용자의 소중한 저장 순서(스왑됨) — 데모가 절대 파괴하면 안 됨
    const realSnapshot = JSON.stringify(swappedIds());
    localStorage.setItem(REAL_KEY, realSnapshot);

    const { result } = renderHook(() => useCategoryOrder({ storageKey: DEMO_KEY }));
    act(() => {
      // 데모에서 다른 재정렬(마지막 두 카테고리 스왑) 수행
      const n = BUDGET_CATEGORIES.length;
      result.current.reorderCategories(
        BUDGET_CATEGORIES[n - 1].id,
        BUDGET_CATEGORIES[n - 2].id,
      );
    });

    // 실키는 데모 재정렬 전과 100% 동일(무손상)
    expect(localStorage.getItem(REAL_KEY)).toBe(realSnapshot);
    // 데모 전용키에는 데모 순서가 기록됨
    const demoPersisted: string[] = JSON.parse(localStorage.getItem(DEMO_KEY) ?? '[]');
    expect(demoPersisted.length).toBe(BUDGET_CATEGORIES.length);
  });

  it('S3: 모듈 레벨 오버라이드 — no-arg 호출도 오버라이드 스코프를 우선한다(BudgetTable 미변경 격리 경로)', () => {
    // 실키에 스왑 저장
    localStorage.setItem(REAL_KEY, JSON.stringify(swappedIds()));
    // 오버라이드 활성(데모 셸이 마운트 시 설정하는 것과 동일)
    setCategoryOrderScopeOverride(DEMO_KEY);
    // no-arg(=BudgetTable 내부 호출과 동일 시그니처)여도 데모 스코프로 격리
    const { result } = renderHook(() => useCategoryOrder());
    expect(result.current.orderedCategories[0].id).toBe(BUDGET_CATEGORIES[0].id);
    expect(result.current.orderedCategories[1].id).toBe(BUDGET_CATEGORIES[1].id);

    act(() => {
      result.current.reorderCategories(BUDGET_CATEGORIES[0].id, BUDGET_CATEGORIES[1].id);
    });
    // 실키 무손상, 데모 전용키에만 기록
    expect(JSON.parse(localStorage.getItem(REAL_KEY) ?? '[]')).toEqual(swappedIds());
    expect(localStorage.getItem(DEMO_KEY)).not.toBeNull();
  });

  it('S4: 명시적 storageKey 가 모듈 오버라이드보다 우선한다(인자 우선순위)', () => {
    setCategoryOrderScopeOverride(DEMO_KEY);
    const { result } = renderHook(() => useCategoryOrder({ storageKey: REAL_KEY }));
    act(() => {
      result.current.reorderCategories(BUDGET_CATEGORIES[0].id, BUDGET_CATEGORIES[1].id);
    });
    // 명시 인자(REAL_KEY)가 이겨서 실키에 기록
    const persisted: string[] = JSON.parse(localStorage.getItem(REAL_KEY) ?? '[]');
    expect(persisted[0]).toBe(BUDGET_CATEGORIES[1].id);
  });
});

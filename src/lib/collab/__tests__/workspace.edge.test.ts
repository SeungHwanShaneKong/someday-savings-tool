// [CL-COEDIT-QA200-20260620] workspace.ts 모드 로직 — 엣지/경계·내결함성 보강 테스트
//
// 기존 workspace.test.ts(WS.1~WS.8)와 중복 없는 비자명 케이스만 다룬다:
//  - WS.9  대규모(1000) 필터/카운트의 성능·정확(불변식: filtered.length === count[mode], 분리)
//  - WS.10 isShared undefined 가 personal(=false)로 일관 처리(filter·count 동시)
//  - WS.11 store.getItem throw → readWorkspaceMode 폴백(예외가 새지 않음)
//  - WS.12 store.setItem quota throw → writeWorkspaceMode 무음(throw 금지)
//  - WS.13 resolveInitialMode(saved=null + preferShared=false) → personal(명시적 false는 강제 안 함)
import { describe, it, expect, vi } from 'vitest';
import {
  filterBudgetsByMode,
  countByMode,
  readWorkspaceMode,
  writeWorkspaceMode,
  resolveInitialMode,
  WORKSPACE_MODE_KEY,
} from '../workspace';
import type { KVStore } from '../invite-resume';

/** 모든 메서드를 vi.fn 으로 노출해 throw 주입·호출 단언이 가능한 KVStore 더블. */
function spyStore(
  impl: Partial<{
    getItem: (k: string) => string | null;
    setItem: (k: string, v: string) => void;
    removeItem: (k: string) => void;
  }> = {},
): KVStore {
  return {
    getItem: vi.fn(impl.getItem ?? (() => null)),
    setItem: vi.fn(impl.setItem ?? (() => undefined)),
    removeItem: vi.fn(impl.removeItem ?? (() => undefined)),
  };
}

describe('workspace mode 엣지/내결함성', () => {
  it('WS.9 대규모 1000예산 필터·카운트 정확·성능 (불변식 유지)', () => {
    // 결정적 구성: index % 3 === 0 → shared, 그 외 personal. (idx 0,3,6,... = shared)
    const N = 1000;
    const budgets = Array.from({ length: N }, (_, i) => ({
      id: `b${i}`,
      isShared: i % 3 === 0,
    }));
    const expectedShared = budgets.filter((b) => b.isShared).length; // 334 (0..999 중 3의 배수)
    const expectedPersonal = N - expectedShared; // 666

    const start = performance.now();
    const personal = filterBudgetsByMode(budgets, 'personal');
    const shared = filterBudgetsByMode(budgets, 'shared');
    const counts = countByMode(budgets);
    const elapsed = performance.now() - start;

    // 정확성: 카운트와 필터 결과 길이 일치(핵심 불변식)
    expect(counts).toEqual({ personal: expectedPersonal, shared: expectedShared });
    expect(personal).toHaveLength(counts.personal);
    expect(shared).toHaveLength(counts.shared);

    // 완전 분리: 합집합=전체, 교집합=0 (대규모에서도 누수 없음)
    expect(personal.length + shared.length).toBe(N);
    const sharedIds = new Set(shared.map((b) => b.id));
    expect(personal.some((b) => sharedIds.has(b.id))).toBe(false);

    // 순서 보존: 필터는 원본 순서를 유지해야 함(첫 shared = idx 0)
    expect(shared[0].id).toBe('b0');
    expect(personal[0].id).toBe('b1');

    // 성능: O(n) 단순 순회 — 넉넉한 상한(1000건 < 100ms)
    expect(elapsed).toBeLessThan(100);
  });

  it('WS.10 isShared undefined == personal(false) — filter·count 일관', () => {
    // isShared 키 자체가 없는 항목과 명시적 false/true 혼재.
    const budgets: Array<{ id: string; isShared?: boolean }> = [
      { id: 'u' }, // undefined → personal
      { id: 'f', isShared: false }, // false → personal
      { id: 's', isShared: true }, // true → shared
      { id: 'u2' }, // undefined → personal
    ];

    // filter: personal 은 undefined+false 둘 다 포함
    expect(filterBudgetsByMode(budgets, 'personal').map((b) => b.id)).toEqual(['u', 'f', 'u2']);
    // filter: shared 는 명시 true 만
    expect(filterBudgetsByMode(budgets, 'shared').map((b) => b.id)).toEqual(['s']);

    // count: undefined 가 personal 로 집계되어 filter 와 정합
    const counts = countByMode(budgets);
    expect(counts).toEqual({ personal: 3, shared: 1 });
    expect(filterBudgetsByMode(budgets, 'personal')).toHaveLength(counts.personal);
    expect(filterBudgetsByMode(budgets, 'shared')).toHaveLength(counts.shared);
  });

  it('WS.11 store.getItem throw → readWorkspaceMode 폴백(예외 미전파)', () => {
    const boom = spyStore({
      getItem: () => {
        throw new DOMException('SecurityError'); // 프라이빗/차단 환경 모사
      },
    });

    // 기본 폴백
    expect(() => readWorkspaceMode(boom)).not.toThrow();
    expect(readWorkspaceMode(boom)).toBe('personal');
    // 명시 폴백 인자도 try/catch 안에서 존중
    expect(readWorkspaceMode(boom, 'shared')).toBe('shared');
    // getItem 이 실제로 호출되어(=가드 통과) 예외 경로를 탔음을 확인
    expect(boom.getItem).toHaveBeenCalledWith(WORKSPACE_MODE_KEY);
  });

  it('WS.12 store.setItem quota throw → writeWorkspaceMode 무음(throw 금지)', () => {
    let thrown = 0;
    const quotaFull = spyStore({
      setItem: () => {
        thrown++;
        throw new DOMException('QuotaExceededError'); // 저장소 가득
      },
    });

    // 예외를 삼키고 정상 반환(void)
    expect(() => writeWorkspaceMode(quotaFull, 'shared')).not.toThrow();
    expect(writeWorkspaceMode(quotaFull, 'shared')).toBeUndefined();
    // setItem 은 실제로 시도되었음(=무음 catch 경로 검증)
    expect(quotaFull.setItem).toHaveBeenCalledWith(WORKSPACE_MODE_KEY, 'shared');
    expect(thrown).toBeGreaterThanOrEqual(1);
  });

  it('WS.13 resolveInitialMode(saved=null + preferShared=false) → personal', () => {
    // 명시적 preferShared:false 는 shared 를 강제하지 않는다.
    expect(resolveInitialMode({ saved: null, preferShared: false })).toBe('personal');
    // 저장값이 없으면(빈 문자열/공백) 기본 personal
    expect(resolveInitialMode({ saved: '', preferShared: false })).toBe('personal');
    // preferShared:false 라도 유효 저장값 'shared' 는 존중(우선순위: preferShared > saved)
    expect(resolveInitialMode({ saved: 'shared', preferShared: false })).toBe('shared');
    // 불량 저장값 + preferShared:false → personal
    expect(resolveInitialMode({ saved: 'team', preferShared: false })).toBe('personal');
  });

  it('WS.13b readWorkspaceMode 라운드트립과 resolveInitialMode 정합', () => {
    // 실제 저장→읽기→초기모드 결정의 end-to-end 정합(순수 로직만).
    const store = spyStore();
    let saved: string | null = null;
    (store.setItem as ReturnType<typeof vi.fn>).mockImplementation((_k: string, v: string) => {
      saved = v;
    });
    (store.getItem as ReturnType<typeof vi.fn>).mockImplementation(() => saved);

    writeWorkspaceMode(store, 'shared');
    const read = readWorkspaceMode(store);
    expect(read).toBe('shared');
    // 저장된 모드를 resolveInitialMode 가 그대로 채택(preferShared 없음)
    expect(resolveInitialMode({ saved: read })).toBe('shared');
  });
});

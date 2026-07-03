// [CL-TOP20-P1-DEMO-20260703-010000] 데모 예산 순수 모듈 — 결정론·영속 왕복·손상 방어 검증
import { describe, it, expect, beforeEach } from 'vitest';
import { BUDGET_CATEGORIES } from '@/lib/budget-categories';
import {
  DEMO_STORAGE_KEY,
  DEMO_BUDGET_ID,
  createDemoBudgetItems,
  getDemoTotal,
  getDemoPaidStats,
  loadDemoBudget,
  saveDemoBudget,
  resetDemoBudget,
  updateDemoAmount,
  toggleDemoPaid,
  updateDemoNotes,
  addDemoCustomItem,
  deleteDemoItem,
} from '../demo-budget';

beforeEach(() => {
  sessionStorage.clear();
});

/* ─── 시나리오 ①: 전 카테고리 포함 · 총액 > 0 · 결정론 ─── */
describe('demo-budget — 샘플 데이터 생성', () => {
  it('S1-1: 전 카테고리·전 소분류를 빠짐없이 포함한다', () => {
    const items = createDemoBudgetItems();
    for (const category of BUDGET_CATEGORIES) {
      for (const sub of category.subCategories) {
        const found = items.find(
          (it) => it.category === category.id && it.sub_category === sub.id,
        );
        expect(found, `${category.id}/${sub.id} 누락`).toBeTruthy();
      }
    }
    // 소분류 수와 정확히 일치(초과 항목 없음)
    const expectedCount = BUDGET_CATEGORIES.reduce((n, c) => n + c.subCategories.length, 0);
    expect(items).toHaveLength(expectedCount);
  });

  it('S1-2: 총액 > 0 이며 시나리오(약 2억)에 부합한다', () => {
    const total = getDemoTotal(createDemoBudgetItems());
    expect(total).toBeGreaterThan(0);
    // "서울·하객 300·총 ~2억" 범위 가드(데이터 미세 조정 허용, 자릿수 붕괴는 차단)
    expect(total).toBeGreaterThanOrEqual(150_000_000);
    expect(total).toBeLessThanOrEqual(250_000_000);
  });

  it('S1-3: 결정론 — 두 번 생성해도 완전 동일(랜덤·시간 의존 0), id 는 demo- 접두사·중복 없음', () => {
    const a = createDemoBudgetItems();
    const b = createDemoBudgetItems();
    expect(a).toEqual(b);
    expect(a).not.toBe(b); // 참조 공유 없는 새 배열
    for (const item of a) {
      expect(item.id.startsWith('demo-')).toBe(true);
      expect(item.budget_id).toBe(DEMO_BUDGET_ID);
    }
    expect(new Set(a.map((it) => it.id)).size).toBe(a.length);
  });

  it('S1-4: 결제 완료 통계 — paid/total/율 정합, 빈 배열도 NaN 없이 0', () => {
    const items = createDemoBudgetItems();
    const stats = getDemoPaidStats(items);
    expect(stats.totalCount).toBe(items.length);
    expect(stats.paidCount).toBe(items.filter((it) => it.is_paid).length);
    expect(stats.paidCount).toBeGreaterThan(0); // 샘플은 일부 결제 완료 상태 포함
    expect(stats.completionRate).toBe(Math.round((stats.paidCount / stats.totalCount) * 100));
    expect(getDemoPaidStats([])).toEqual({ paidCount: 0, totalCount: 0, completionRate: 0 });
  });
});

/* ─── 시나리오 ②: sessionStorage 저장/복원/초기화 왕복 ─── */
describe('demo-budget — 영속 왕복', () => {
  it('S2-1: 수정 → 저장 → 복원 시 동일 데이터가 돌아온다', () => {
    const base = createDemoBudgetItems();
    const modified = updateDemoAmount(base, 'main-ceremony', 'venue-fee', 12_345);
    saveDemoBudget(modified);
    const loaded = loadDemoBudget();
    expect(loaded).toEqual(modified);
    expect(getDemoTotal(loaded)).toBe(getDemoTotal(base) - 20_000_000 + 12_345);
  });

  it('S2-2: 저장분이 없으면 기본 샘플을 반환한다', () => {
    expect(loadDemoBudget()).toEqual(createDemoBudgetItems());
  });

  it('S2-3: 초기화 — 저장분을 폐기하고 기본 샘플을 반환한다', () => {
    saveDemoBudget(updateDemoAmount(createDemoBudgetItems(), 'honeymoon', 'flight', 1));
    const fresh = resetDemoBudget();
    expect(sessionStorage.getItem(DEMO_STORAGE_KEY)).toBeNull();
    expect(fresh).toEqual(createDemoBudgetItems());
  });
});

/* ─── 시나리오 ③: 손상된 sessionStorage 방어 ─── */
describe('demo-budget — 손상 데이터 방어', () => {
  it('S3-1: 깨진 JSON → throw 없이 기본 샘플 폴백 + 손상분 제거', () => {
    sessionStorage.setItem(DEMO_STORAGE_KEY, '{"broken json');
    let loaded: ReturnType<typeof loadDemoBudget> | undefined;
    expect(() => {
      loaded = loadDemoBudget();
    }).not.toThrow();
    expect(loaded).toEqual(createDemoBudgetItems());
    expect(sessionStorage.getItem(DEMO_STORAGE_KEY)).toBeNull();
  });

  it('S3-2: 배열이 아닌 JSON / 빈 배열 → 기본 샘플 폴백', () => {
    sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ hacked: true }));
    expect(loadDemoBudget()).toEqual(createDemoBudgetItems());
    sessionStorage.setItem(DEMO_STORAGE_KEY, '[]');
    expect(loadDemoBudget()).toEqual(createDemoBudgetItems());
  });

  it('S3-3: 형식 불일치 항목(타입 위조·음수·접두사 위반) → 전체 폐기 후 기본 샘플', () => {
    const cases: unknown[][] = [
      [{ id: 'evil', category: 'x', sub_category: 'y', amount: 1, is_paid: false, notes: null }], // 접두사 위반
      [{ id: 'demo-a', category: 'x', sub_category: 'y', amount: '1', is_paid: false, notes: null }], // amount 문자열
      [{ id: 'demo-a', category: 'x', sub_category: 'y', amount: -5, is_paid: false, notes: null }], // 음수
      [{ id: 'demo-a', category: 'x', sub_category: 'y', amount: 1, is_paid: 'yes', notes: null }], // is_paid 위조
      ['not-an-object'],
    ];
    for (const bad of cases) {
      sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(bad));
      expect(loadDemoBudget(), JSON.stringify(bad)).toEqual(createDemoBudgetItems());
    }
  });
});

/* ─── 시나리오 ④(보강): 순수 업데이트 헬퍼의 불변성·id 규칙 ─── */
describe('demo-budget — 순수 업데이트 헬퍼', () => {
  it('S4-1: updateDemoAmount/toggleDemoPaid 는 원본을 변경하지 않는다(불변)', () => {
    const base = createDemoBudgetItems();
    const snapshot = JSON.stringify(base);
    const afterAmount = updateDemoAmount(base, 'gifts-houseware', 'rings', 999);
    const afterToggle = toggleDemoPaid(base, 'demo-main-ceremony-venue-fee');
    expect(JSON.stringify(base)).toBe(snapshot); // 원본 무손상
    expect(afterAmount.find((it) => it.sub_category === 'rings')?.amount).toBe(999);
    expect(afterToggle.find((it) => it.id === 'demo-main-ceremony-venue-fee')?.is_paid).toBe(false);
  });

  it('S4-2: 커스텀 항목 id — 중간 삭제 후 추가에도 충돌 없음(max+1 규칙)', () => {
    let items = createDemoBudgetItems();
    items = addDemoCustomItem(items, 'miscellaneous', '폐백');
    items = addDemoCustomItem(items, 'miscellaneous', '이바지 음식');
    expect(items.at(-2)?.id).toBe('demo-custom-1');
    expect(items.at(-1)?.id).toBe('demo-custom-2');
    items = deleteDemoItem(items, 'demo-custom-1');
    items = addDemoCustomItem(items, 'miscellaneous', '주례 선물');
    expect(items.at(-1)?.id).toBe('demo-custom-3'); // 살아있는 max(2)+1 — 중복 없음
    expect(new Set(items.map((it) => it.id)).size).toBe(items.length);
  });

  it('S4-3: 빈 이름 추가는 무시, 공백 메모는 null 정규화', () => {
    const base = createDemoBudgetItems();
    expect(addDemoCustomItem(base, 'miscellaneous', '   ')).toBe(base);
    const noted = updateDemoNotes(base, 'demo-honeymoon-flight', '   ');
    expect(noted.find((it) => it.id === 'demo-honeymoon-flight')?.notes).toBeNull();
  });
});

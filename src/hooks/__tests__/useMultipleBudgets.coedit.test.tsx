// [CL-COEDIT-QA200-20260620] useMultipleBudgets 공동편집 — updateItem 낙관/ACK/롤백 + realtimeApplier + isShared 주입 단위 검증
//
// 왜: 교훈 [CL-COEDIT-E2E-20260620] — updateItem 은 (1)즉시 낙관 반영 (2)pending 등록(에코 억제)
//     (3).select().single() ACK 로 서버 updated_at 수신·단조 게이트 기지값 갱신 (4)실패 시 직전값 롤백.
//     realtimeApplier 는 onUpsert(신규 INSERT/교체) · onDelete(known/pending clear) · isShared 주입 계약을
//     CI 에서 고정한다. useCollaboration.test.tsx(초대 멱등)와 중복되지 않는 영역만 다룬다.
// 격리: supabase 클라이언트는 setup.ts 전역 mock. 여기선 from() 을 테이블별로 오버라이드하고,
//     pending/knownUpdatedAt 등 내부 Map 효과는 realtimeApplier 의 onUpsert(에코 무시) 거동으로 간접 관찰한다.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { supabase } from '@/integrations/supabase/client';
import { useMultipleBudgets } from '@/hooks/useMultipleBudgets';
import type { ItemRow } from '@/hooks/useRealtimeBudget';

// useAuth 는 hoisted 가변 홀더 — 테스트별 user 교체(예: null 가드)
const h = vi.hoisted(() => ({ user: { id: 'owner-1' } as { id: string } | null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: h.user }) }));

// useToast 는 부수효과(토스트) 캡처용 — 롤백 경로의 에러 토스트 호출을 관찰
const toastSpy = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastSpy }) }));

const NOW = '2026-06-20T00:00:00.000Z';

// 기본 예산 1개 + 항목 2개(active 예산 b1)
function mkBudget(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'b1',
    user_id: 'owner-1',
    name: '옵션 1',
    wedding_date: null,
    created_at: NOW,
    updated_at: NOW,
    ...over,
  };
}
function mkItem(id: string, over: Partial<Record<string, unknown>> = {}) {
  return {
    id,
    budget_id: 'b1',
    category: 'wedding-hall',
    sub_category: `sub-${id}`,
    amount: 100,
    is_paid: false,
    notes: null,
    unit_price: null,
    quantity: null,
    custom_name: null,
    is_custom: false,
    updated_at: NOW,
    ...over,
  };
}

/**
 * 체이너블 쿼리 mock.
 *  - list  : await(.then 종단, e.g. .select().eq() / .select().in()) 시 반환
 *  - single: .select().single() 종단 시 반환(updateItem 의 ACK·createNewBudget insert 등)
 * 모든 메서드는 self 반환이라 임의 순서 체이닝 가능.
 */
function chain(opts: { list?: unknown; single?: unknown } = {}) {
  const list = opts.list ?? { data: [], error: null };
  const single = opts.single ?? { data: null, error: null };
  const q: Record<string, unknown> = {};
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'in',
    'order', 'limit', 'match', 'is', 'maybeSingle', 'gt', 'gte', 'lt', 'lte',
  ];
  for (const m of methods) q[m] = vi.fn(() => q);
  q.single = vi.fn(() => Promise.resolve(single));
  (q as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(list).then(resolve);
  return q;
}

/**
 * 표준 마운트용 from() 오버라이드 팩토리.
 *  budgets            → owned 목록(.eq) / shared(.in) 모두 같은 list
 *  budget_collaborators → collab 목록(소유예산 협업자 / 내가 협업자)
 *  budget_items       → active 예산 항목 목록 + update ACK(single)
 *  budget_snapshots / ai_conversations / user_checklist_items → 빈
 */
function installFrom(cfg: {
  budgets?: unknown[];
  collaborators?: unknown[];
  sharedBudgets?: unknown[];
  items?: unknown[];
  itemAck?: { data: unknown; error: unknown };
} = {}) {
  const budgets = cfg.budgets ?? [mkBudget()];
  const collaborators = cfg.collaborators ?? [];
  const sharedBudgets = cfg.sharedBudgets ?? [];
  const items = cfg.items ?? [mkItem('i1'), mkItem('i2')];
  // budgets 테이블은 owned(.eq)와 sharedFromOthers(.in) 두 용도 — 호출 인자로 분기.
  // memberOfIds 가 비면 .in 경로는 실행되지 않으므로 단순히 owned 를 반환해도 안전.
  const budgetsChain = () => chain({ list: { data: budgets, error: null } });
  const collabChain = () => chain({ list: { data: collaborators, error: null } });
  const itemsChain = () => chain({
    list: { data: items, error: null },
    single: cfg.itemAck ?? { data: { updated_at: NOW }, error: null },
  });

  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    switch (table) {
      case 'budgets': return budgetsChain() as never;
      case 'budget_collaborators':
        // sharedBudgets 가 있으면 in('id') 경로는 budgets 테이블이 처리하므로 여기선 협업자만.
        return collabChain() as never;
      case 'budget_items': return itemsChain() as never;
      default: return chain() as never;
    }
  }) as never);

  return { budgets, collaborators, sharedBudgets, items };
}

/** active 예산이 로드되고 loading=false 가 될 때까지 마운트. */
async function mountLoaded() {
  // 표준 데이터(예산 1 + 항목 2 + ACK updated_at) 미설치 시 기본 설치.
  if (!vi.mocked(supabase.from).getMockImplementation()) installFrom();
  const hook = renderHook(() => useMultipleBudgets());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

beforeEach(() => {
  h.user = { id: 'owner-1' };
  toastSpy.mockReset();
  vi.mocked(supabase.from).mockReset();
  try { sessionStorage.clear(); } catch { /* noop */ }
  // 날짜 결정성: updateItem 의 budgets.update({updated_at}) 가 new Date().toISOString() 을 쓰지만
  // 본 스위트의 단언은 모두 명시 updated_at 문자열에만 의존한다. fakeTimers 는 waitFor 폴링을
  // 멈추므로 사용하지 않는다(시스템시각 비의존 = 결정성 유지).
});

// ───────────────────────────────────────────────────────────────────────────
// updateItem — 낙관 / ACK / 롤백
// (updateItem 은 비공개. 공개 래퍼 updateAmount/updateNotes/togglePaid 로 구동한다.)
// ───────────────────────────────────────────────────────────────────────────
describe('useMultipleBudgets.updateItem (낙관 + ACK + 롤백)', () => {
  it('I0 정상 ACK: 낙관 반영이 유지되고 다른 항목은 불변', async () => {
    const { result } = await mountLoaded();
    expect(result.current.items.find(i => i.id === 'i1')?.amount).toBe(100);

    await act(async () => {
      await result.current.updateAmount('wedding-hall', 'sub-i1', 555);
    });

    expect(result.current.items.find(i => i.id === 'i1')?.amount).toBe(555);
    // 다른 항목은 불변
    expect(result.current.items.find(i => i.id === 'i2')?.amount).toBe(100);
  });

  it('I1 낙관→error→prevItem 롤백: 직전 값 복원 + 에러 토스트', async () => {
    installFrom({ itemAck: { data: null, error: { message: 'boom' } } });
    const { result } = renderHook(() => useMultipleBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateAmount('wedding-hall', 'sub-i1', 999);
    });

    // 롤백 → 100 으로 복원(999 잔존 금지)
    expect(result.current.items.find(i => i.id === 'i1')?.amount).toBe(100);
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );
  });

  it('I1b error 롤백은 allBudgetsItems(비교 대시보드) 도 직전값으로 되돌린다', async () => {
    installFrom({ itemAck: { data: null, error: { message: 'boom' } } });
    const { result } = renderHook(() => useMultipleBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // togglePaid 로 is_paid:true 시도 → 실패 → 비교 대시보드까지 false 로 롤백
    await act(async () => {
      await result.current.togglePaid('i1');
    });

    const comp = result.current.getBudgetsForComparison().find(b => b.id === 'b1');
    const it = comp?.items.find(i => i.id === 'i1');
    expect(it?.is_paid).toBe(false);
    // items 본체도 롤백
    expect(result.current.items.find(i => i.id === 'i1')?.is_paid).toBe(false);
  });

  it('I5 ACK updated_at 누락 무크래시: 낙관 반영만 유지(롤백 없음)', async () => {
    // update().select().single() 가 updated_at 없는 행을 줘도 throw/rollback 금지
    installFrom({ itemAck: { data: { id: 'i1' }, error: null } });
    const { result } = renderHook(() => useMultipleBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateAmount('wedding-hall', 'sub-i1', 777);
    });

    expect(result.current.items.find(i => i.id === 'i1')?.amount).toBe(777);
    // 에러 토스트가 발생하지 않아야(=롤백 경로 미진입)
    expect(toastSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );
  });

  it('I5b ACK updated_at 수신: items 의 updated_at 이 서버값으로 동기화', async () => {
    const SERVER_TS = '2026-06-20T01:23:45.000Z';
    installFrom({ itemAck: { data: { id: 'i1', updated_at: SERVER_TS }, error: null } });
    const { result } = renderHook(() => useMultipleBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateAmount('wedding-hall', 'sub-i1', 1);
    });

    expect(
      (result.current.items.find(i => i.id === 'i1') as { updated_at?: string }).updated_at,
    ).toBe(SERVER_TS);
  });

  it('I2 동시(연속) updateItem: 서로 다른 두 항목 모두 최종 반영(pending 컬럼 격리)', async () => {
    const { result } = await mountLoaded();

    await act(async () => {
      await Promise.all([
        result.current.updateAmount('wedding-hall', 'sub-i1', 11),
        result.current.updateNotes('i2', '메모'),
      ]);
    });

    expect(result.current.items.find(i => i.id === 'i1')?.amount).toBe(11);
    expect(result.current.items.find(i => i.id === 'i2')?.notes).toBe('메모');
    // 교차 오염 없음
    expect(result.current.items.find(i => i.id === 'i1')?.notes).toBeNull();
  });

  it('I2b [R4 #3] 동시편집 중 한 필드 저장 실패 시 롤백이 다른 필드(성공분)를 덮지 않는다', async () => {
    // 시나리오: amount 저장이 in-flight(ACK 보류)인 동안 notes 저장이 성공 → 이후 amount 가 실패.
    //   버그(과거): 롤백이 항목 '전체'를 amount 호출 시점 스냅샷(notes=null)으로 되돌려 notes 유실.
    //   수정: 롤백을 'amount' 컬럼만으로 한정 → notes('메모') 보존.
    let resolveAmountAck: (v: unknown) => void = () => {};
    const amountAck = new Promise((res) => { resolveAmountAck = res; });
    const items = [mkItem('i1'), mkItem('i2')];

    const smartItems = () => {
      const q: Record<string, unknown> = {};
      let payload: Record<string, unknown> | undefined;
      for (const m of ['select', 'insert', 'delete', 'eq', 'in', 'order', 'limit', 'is']) q[m] = vi.fn(() => q);
      q.update = vi.fn((p: Record<string, unknown>) => { payload = p; return q; });
      q.single = vi.fn(() =>
        payload && 'amount' in payload
          ? amountAck // amount 저장 → 보류(나중에 에러로 resolve)
          : Promise.resolve({ data: { updated_at: NOW }, error: null }), // notes 등 → 즉시 성공
      );
      (q as { then: unknown }).then = (r: (v: unknown) => unknown) =>
        Promise.resolve({ data: items, error: null }).then(r);
      return q;
    };
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'budget_items') return smartItems() as never;
      if (table === 'budgets') return chain({ list: { data: [mkBudget()], error: null } }) as never;
      return chain() as never;
    }) as never);

    const { result } = renderHook(() => useMultipleBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const pAmount = result.current.updateAmount('wedding-hall', 'sub-i1', 999); // in-flight
      await result.current.updateNotes('i1', '메모'); // 성공 → notes='메모'
      resolveAmountAck({ data: null, error: { message: 'boom' } }); // amount 실패 유발
      await pAmount;
    });

    const i1 = result.current.items.find(i => i.id === 'i1');
    expect(i1?.amount).toBe(100); // 실패한 amount 는 직전값으로 롤백
    expect(i1?.notes).toBe('메모'); // 동시 성공한 notes 는 보존(롤백이 덮지 않음)
  });

  it('I6 error 시 pending 삭제: 이후 동일 updated_at 실시간 에코가 더 이상 억제되지 않는다', async () => {
    // 핵심: 실패한 쓰기의 pending 은 정리되어야(에코 ack 미존재) onUpsert 가 정상 적용.
    installFrom({ itemAck: { data: null, error: { message: 'fail' } } });
    const { result } = renderHook(() => useMultipleBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateAmount('wedding-hall', 'sub-i1', 42);
    });

    // pending 이 비었으므로 isOwnEcho=false → 더 새로운 remote 가 적용돼야 함
    const remote: ItemRow = { ...mkItem('i1'), amount: 4242, updated_at: '2026-06-21T00:00:00.000Z' };
    act(() => { result.current.realtimeApplier.onUpsert(remote); });

    expect(result.current.items.find(i => i.id === 'i1')?.amount).toBe(4242);
  });

  it('I24 budget updated_at 버블: 성공 ACK 후 budgets.update({updated_at}) 가 호출된다', async () => {
    const items = [mkItem('i1'), mkItem('i2')];
    const budgetsUpdate = vi.fn(() => budgetsQ);
    const budgetsQ: Record<string, unknown> = {};
    for (const m of ['select', 'insert', 'eq', 'in', 'order']) budgetsQ[m] = vi.fn(() => budgetsQ);
    budgetsQ.update = budgetsUpdate;
    budgetsQ.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
    (budgetsQ as { then: unknown }).then = (r: (v: unknown) => unknown) =>
      Promise.resolve({ data: [mkBudget()], error: null }).then(r);

    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'budgets') return budgetsQ as never;
      if (table === 'budget_items') {
        return chain({
          list: { data: items, error: null },
          single: { data: { updated_at: NOW }, error: null },
        }) as never;
      }
      return chain() as never;
    }) as never);

    const { result } = renderHook(() => useMultipleBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    budgetsUpdate.mockClear();

    await act(async () => {
      await result.current.updateAmount('wedding-hall', 'sub-i1', 5);
    });

    // budgets.update({updated_at}) 로 "최근 편집 우선" 정렬 비파괴
    expect(budgetsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ updated_at: expect.any(String) }),
    );
  });
});

// ───────────────────────────────────────────────────────────────────────────
// realtimeApplier — onUpsert / onDelete (실시간 머지 적용)
// ───────────────────────────────────────────────────────────────────────────
describe('useMultipleBudgets.realtimeApplier (실시간 적용)', () => {
  it('I7 onUpsert 신규 INSERT: 모르는 id 는 items 에 추가된다(중복 없이)', async () => {
    const { result } = await mountLoaded();
    const before = result.current.items.length;
    const fresh: ItemRow = { ...mkItem('i9'), amount: 9000, updated_at: '2026-06-21T00:00:00.000Z' };

    act(() => { result.current.realtimeApplier.onUpsert(fresh); });

    expect(result.current.items).toHaveLength(before + 1);
    expect(result.current.items.find(i => i.id === 'i9')?.amount).toBe(9000);
  });

  it('I8 onUpsert 교체: 기존 id 는 길이 불변으로 제자리 교체(중복 0)', async () => {
    const { result } = await mountLoaded();
    const before = result.current.items.length;
    const replaced: ItemRow = { ...mkItem('i1'), amount: 314, updated_at: '2026-06-21T00:00:00.000Z' };

    act(() => { result.current.realtimeApplier.onUpsert(replaced); });

    expect(result.current.items).toHaveLength(before); // 길이 불변
    expect(result.current.items.filter(i => i.id === 'i1')).toHaveLength(1); // 중복 0
    expect(result.current.items.find(i => i.id === 'i1')?.amount).toBe(314);
  });

  it('I8b onUpsert 는 allBudgetsItems(active) 도 함께 교체한다', async () => {
    const { result } = await mountLoaded();
    const replaced: ItemRow = { ...mkItem('i1'), amount: 271, updated_at: '2026-06-21T00:00:00.000Z' };

    act(() => { result.current.realtimeApplier.onUpsert(replaced); });

    const comp = result.current.getBudgetsForComparison().find(b => b.id === 'b1');
    expect(comp?.items.find(i => i.id === 'i1')?.amount).toBe(271);
  });

  it('I9 onDelete: items 에서 제거하고 known/pending 정리 → 같은 id 재INSERT 가 다시 적용된다', async () => {
    const { result } = await mountLoaded();
    const before = result.current.items.length;

    act(() => { result.current.realtimeApplier.onDelete('i1'); });
    expect(result.current.items.find(i => i.id === 'i1')).toBeUndefined();
    expect(result.current.items).toHaveLength(before - 1);

    // known/pending 이 정리됐다면, 오래된(=원래) updated_at 이라도 stale 가드에 막히지 않고 재삽입
    const reinsert: ItemRow = { ...mkItem('i1'), amount: 123, updated_at: NOW };
    act(() => { result.current.realtimeApplier.onUpsert(reinsert); });
    expect(result.current.items.find(i => i.id === 'i1')?.amount).toBe(123);
  });

  it('I9b onDelete 는 allBudgetsItems(active) 에서도 제거한다', async () => {
    const { result } = await mountLoaded();
    act(() => { result.current.realtimeApplier.onDelete('i2'); });

    const comp = result.current.getBudgetsForComparison().find(b => b.id === 'b1');
    expect(comp?.items.find(i => i.id === 'i2')).toBeUndefined();
  });

  it('I9c onDelete 알 수 없는 id: 기존 항목에 영향 없음(graceful)', async () => {
    const { result } = await mountLoaded();
    const before = result.current.items.length;

    act(() => { result.current.realtimeApplier.onDelete('does-not-exist'); });

    expect(result.current.items).toHaveLength(before);
  });

  it('realtimeApplier.getLocal 은 현재 items 스냅샷을 id 로 조회한다', async () => {
    const { result } = await mountLoaded();
    const got = result.current.realtimeApplier.getLocal('i1');
    expect(got?.id).toBe('i1');
    expect(result.current.realtimeApplier.getLocal('nope')).toBeUndefined();
  });

  it('setKnownUpdatedAt 후 onUpsert(더 오래된 updated_at)도 onUpsert 자체는 무조건 적용한다(게이트는 useRealtimeBudget 책임)', async () => {
    // 계약 경계 명시: applier.onUpsert 는 "이미 결정된 머지 행"을 받는 순수 적용기다.
    // stale 게이트(decideItemUpsert)는 useRealtimeBudget 안에서 일어나며 applier 노출 함수는 무조건 반영.
    const { result } = await mountLoaded();
    act(() => { result.current.realtimeApplier.setKnownUpdatedAt('i1', '2999-01-01T00:00:00.000Z'); });

    const older: ItemRow = { ...mkItem('i1'), amount: 1 };
    act(() => { result.current.realtimeApplier.onUpsert(older); });

    expect(result.current.items.find(i => i.id === 'i1')?.amount).toBe(1);
  });

  // [CL-VULN-V8-ACK-MONOTONIC-20260624] updateItem 의 ACK 경로도 단조 게이트(isNewer)를 거쳐야 한다.
  //  과거엔 .select().single() 의 serverUpdatedAt 을 무조건 채택 → 파트너의 더 최신 변경이 실시간으로
  //  먼저 적용된 뒤 내 느린 PATCH 의 과거 ACK 가 도착하면 updated_at/known 이 역전(LWW 깨짐)됐다.
  it('V8 stale ACK(과거 updated_at)는 이미 적용된 최신 파트너 updated_at 을 역전시키지 않는다', async () => {
    const T1 = '2026-06-20T01:00:00.000Z'; // 내 PATCH ACK(과거)
    const T2 = '2026-06-20T02:00:00.000Z'; // 파트너 실시간(최신, 먼저 적용됨)
    installFrom({ itemAck: { data: { id: 'i1', updated_at: T1 }, error: null } });
    const { result } = renderHook(() => useMultipleBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // 파트너의 최신 변경이 실시간으로 먼저 적용됨: 항목 updated_at=T2 + known=T2
    act(() => {
      result.current.realtimeApplier.onUpsert({ ...mkItem('i1'), updated_at: T2, amount: 200 } as ItemRow);
      result.current.realtimeApplier.setKnownUpdatedAt('i1', T2);
    });
    expect((result.current.items.find(i => i.id === 'i1') as { updated_at?: string }).updated_at).toBe(T2);

    // 직후 내 느린 PATCH 의 ACK(T1<T2) 도착 → 단조 게이트로 역전 차단되어야 함
    await act(async () => {
      await result.current.updateAmount('wedding-hall', 'sub-i1', 555);
    });

    // updated_at 은 T2 유지(버그면 T1 으로 후퇴) — LWW 단조 불변
    expect((result.current.items.find(i => i.id === 'i1') as { updated_at?: string }).updated_at).toBe(T2);
    // 내가 입력한 값 자체는 낙관 반영(555)
    expect(result.current.items.find(i => i.id === 'i1')?.amount).toBe(555);
  });

  // [CL-EDIT5-EDITOR-20260625] D-1: ACK 가 채택될 때 last_edited_by 도 서버값(=나)으로 반영 →
  //  로컬에 남아있던 '이전 파트너 편집자'가 갱신돼, 내 편집이 '파트너 변경'으로 오표시되지 않음.
  it('EDIT5-D1 내 편집 ACK 채택 시 last_edited_by 가 서버값(나)으로 갱신(stale partner 제거)', async () => {
    const T1 = '2026-06-20T01:00:00.000Z'; // 과거 파트너 편집(로컬)
    const T2 = '2026-06-20T02:00:00.000Z'; // 내 편집 ACK(최신)
    installFrom({ itemAck: { data: { id: 'i1', updated_at: T2, last_edited_by: 'owner-1' }, error: null } });
    const { result } = renderHook(() => useMultipleBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // 과거 파트너 편집이 로컬에 반영된 상태(last_edited_by='partner', updated_at=T1, known=T1)
    act(() => {
      result.current.realtimeApplier.onUpsert({ ...mkItem('i1'), updated_at: T1, last_edited_by: 'partner' } as unknown as ItemRow);
      result.current.realtimeApplier.setKnownUpdatedAt('i1', T1);
    });
    expect((result.current.items.find(i => i.id === 'i1') as { last_edited_by?: string }).last_edited_by).toBe('partner');

    // 내가 편집 → ACK(T2>T1, last_edited_by=owner-1) 채택
    await act(async () => {
      await result.current.updateAmount('wedding-hall', 'sub-i1', 555);
    });

    // last_edited_by 가 '나(owner-1)'로 갱신 — stale 'partner' 제거(버그면 'partner' 잔존)
    expect((result.current.items.find(i => i.id === 'i1') as { last_edited_by?: string }).last_edited_by).toBe('owner-1');
    // [CL-EDIT5-R7CACHE-20260626] allBudgetsItems(비교 대시보드 캐시)도 동일 보정 — 두 소스 정합(R7-6)
    const compItem = result.current.getBudgetsForComparison().find(b => b.id === 'b1')?.items.find(i => i.id === 'i1');
    expect((compItem as { last_edited_by?: string } | undefined)?.last_edited_by).toBe('owner-1');
  });
});

// ───────────────────────────────────────────────────────────────────────────
// activeBudgetId=null graceful (I10)
// ───────────────────────────────────────────────────────────────────────────
describe('useMultipleBudgets activeBudgetId=null graceful (I10)', () => {
  it('I10 user 없음: 마운트가 budgets 빈 채 loading=false, items 빈 배열, getTotal 0', async () => {
    h.user = null;
    const { result } = renderHook(() => useMultipleBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.budgets).toEqual([]);
    expect(result.current.items).toEqual([]);
    expect(result.current.getTotal()).toBe(0);
  });

  it('I10b user 없음에서 updateNotes 호출: 낙관 맵은 빈 채 무크래시(부수효과 무해)', async () => {
    h.user = null;
    // updateNotes 는 items.find 없이 updateItem 을 직접 호출 → 빈 items/activeBudgetId=null 경로 검증.
    installFrom({ itemAck: { data: { updated_at: NOW }, error: null } });
    const { result } = renderHook(() => useMultipleBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // activeBudgetId=null 이라도 throw 없이 종료해야 함
    await act(async () => {
      await result.current.updateNotes('ghost', '메모');
    });
    expect(result.current.items).toEqual([]);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// isShared 주입 (I21~23)
// ───────────────────────────────────────────────────────────────────────────
describe('useMultipleBudgets isShared 주입 (I21~23)', () => {
  it('I21 소유 + 협업자 있음: 내 예산 isShared=true', async () => {
    installFrom({
      budgets: [mkBudget()],
      collaborators: [{ budget_id: 'b1' }], // 내 예산 b1 에 협업자 존재
    });
    const { result } = renderHook(() => useMultipleBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const b1 = result.current.budgets.find(b => b.id === 'b1');
    expect(b1?.isShared).toBe(true);
  });

  it('I22 협업자 0(개인 예산): isShared=false (비파괴 — 개인 모드)', async () => {
    installFrom({ budgets: [mkBudget()], collaborators: [] });
    const { result } = renderHook(() => useMultipleBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const b1 = result.current.budgets.find(b => b.id === 'b1');
    expect(b1?.isShared).toBe(false);
  });

  it('I23 타인 공유(내가 협업자): 남이 공유해 준 예산 isShared=true', async () => {
    // budget_collaborators 가 내(owner-1)가 협업자인 budget_id='shared-x' 를 반환.
    // 이 id 는 owned 에 없으므로 memberOfIds → budgets.in('id',['shared-x']) 로 본문 로드.
    const owned = [mkBudget()]; // b1 (내 소유)
    const sharedFromOthers = [mkBudget({ id: 'shared-x', user_id: 'someone-else', name: '우리 예산' })];

    // budgets 테이블: .eq(owned) 와 .in(sharedFromOthers) 를 인자로 분기해야 정확.
    const budgetsQ = () => {
      const q: Record<string, unknown> = {};
      let mode: 'owned' | 'shared' = 'owned';
      for (const m of ['select', 'insert', 'order']) q[m] = vi.fn(() => q);
      q.eq = vi.fn(() => { mode = 'owned'; return q; });
      q.in = vi.fn(() => { mode = 'shared'; return q; });
      q.update = vi.fn(() => q);
      q.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
      (q as { then: unknown }).then = (r: (v: unknown) => unknown) =>
        Promise.resolve({ data: mode === 'shared' ? sharedFromOthers : owned, error: null }).then(r);
      return q;
    };
    const collabQ = () => chain({ list: { data: [{ budget_id: 'shared-x' }], error: null } });

    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'budgets') return budgetsQ() as never;
      if (table === 'budget_collaborators') return collabQ() as never;
      if (table === 'budget_items') return chain({ list: { data: [], error: null } }) as never;
      return chain() as never;
    }) as never);

    const { result } = renderHook(() => useMultipleBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const shared = result.current.budgets.find(b => b.id === 'shared-x');
    expect(shared).toBeDefined();
    expect(shared?.isShared).toBe(true);
    // 내 소유 b1 은 협업자 없으니 false (혼합 시 개별 판정 보장)
    expect(result.current.budgets.find(b => b.id === 'b1')?.isShared).toBe(false);
  });

  it('I23b owned 가 sharedFromOthers 보다 먼저 정렬되지 않고 updated_at DESC 로 병합 정렬된다', async () => {
    const owned = [mkBudget({ id: 'b1', updated_at: '2026-06-19T00:00:00.000Z' })];
    const sharedFromOthers = [mkBudget({ id: 'shared-new', updated_at: '2026-06-20T00:00:00.000Z' })];

    const budgetsQ = () => {
      const q: Record<string, unknown> = {};
      let mode: 'owned' | 'shared' = 'owned';
      for (const m of ['select', 'insert', 'order']) q[m] = vi.fn(() => q);
      q.eq = vi.fn(() => { mode = 'owned'; return q; });
      q.in = vi.fn(() => { mode = 'shared'; return q; });
      q.update = vi.fn(() => q);
      q.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
      (q as { then: unknown }).then = (r: (v: unknown) => unknown) =>
        Promise.resolve({ data: mode === 'shared' ? sharedFromOthers : owned, error: null }).then(r);
      return q;
    };
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'budgets') return budgetsQ() as never;
      if (table === 'budget_collaborators') return chain({ list: { data: [{ budget_id: 'shared-new' }], error: null } }) as never;
      if (table === 'budget_items') return chain({ list: { data: [], error: null } }) as never;
      return chain() as never;
    }) as never);

    const { result } = renderHook(() => useMultipleBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // updated_at DESC → shared-new(06-20) 가 b1(06-19) 보다 앞
    expect(result.current.budgets[0].id).toBe('shared-new');
    // 최근 편집 우선 → active 도 첫 번째
    expect(result.current.activeBudgetId).toBe('shared-new');
  });
});

// [CL-COEDIT-OPTADD-20260621] 영구 is_shared 귀속 — '옵션 추가' 탭 충돌 수정의 데이터 계약.
//  isShared = is_shared(영구 의도) OR 협업자 유무. 협업자 0이어도 is_shared=true 면 '우리' 탭 귀속.
describe('useMultipleBudgets is_shared 영구 귀속 (옵션추가 탭 충돌 수정)', () => {
  it('is_shared=true + 협업자 0 → isShared=true (우리 탭에 귀속)', async () => {
    installFrom({ budgets: [mkBudget({ is_shared: true })], collaborators: [] });
    const { result } = renderHook(() => useMultipleBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.budgets.find(b => b.id === 'b1')?.isShared).toBe(true);
  });

  it('is_shared=false + 협업자 0 → isShared=false (개인 탭)', async () => {
    installFrom({ budgets: [mkBudget({ is_shared: false })], collaborators: [] });
    const { result } = renderHook(() => useMultipleBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.budgets.find(b => b.id === 'b1')?.isShared).toBe(false);
  });

  it('is_shared=false 이지만 협업자 있음 → isShared=true (기존 우리예산 비파괴)', async () => {
    installFrom({ budgets: [mkBudget({ is_shared: false })], collaborators: [{ budget_id: 'b1' }] });
    const { result } = renderHook(() => useMultipleBudgets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.budgets.find(b => b.id === 'b1')?.isShared).toBe(true);
  });
});

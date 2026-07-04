// [CL-VULN-R10-20260704 | 핵심] createNewBudget 항목 시드 insert error 미검사 회귀 가드.
//
// 결함: createNewBudget 이 초기 항목 시드 insert 의 error 를 미검사(`const { data } = ...`) →
//       시드가 실패해도 예외 없이 진행, 빈 예산을 무음 생성(신규 유저 온보딩 텅 빈 화면 + 좀비 빈 예산).
//       형제 copyBudget 은 이미 `{ data, error }` 구조분해 + `if (error) throw` 로 방어.
// 계약(수정 후 올바른 동작):
//   (1) 시드 insert 가 error 를 반환하면 무음이 아니라 '예산 생성 중 오류' 토스트가 뜨고 null 반환.
//   (2) 실패한 예산이 활성 상태(빈 예산)로 전환되지 않는다(좀비 방지).
//   (3) 좀비 budgets 행 보상 삭제(budgets.delete)가 호출된다.
// 격리: supabase 전역 mock. from() 을 테이블·호출순서로 분기해 시드 insert 만 error 를 반환하도록 구성.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { supabase } from '@/integrations/supabase/client';
import { useMultipleBudgets } from '@/hooks/useMultipleBudgets';

const h = vi.hoisted(() => ({ user: { id: 'owner-1' } as { id: string } | null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: h.user }) }));
const toastSpy = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastSpy }) }));

const NOW = '2026-07-04T00:00:00.000Z';
const mkBudget = (over = {}) => ({
  id: 'b1', user_id: 'owner-1', name: '옵션 1', wedding_date: null,
  is_shared: false, created_at: NOW, updated_at: NOW, ...over,
});

// 체이너블 mock — list(then) 결과를 지연 평가(fn)로도 받을 수 있게 확장.
//   list 가 함수면 매 await 시 호출 → 호출 순서에 따라 다른 결과(성공/에러)를 낼 수 있다.
//   single 은 시퀀스 큐(shift)로 여러 from() 호출이 공유 소비.
function chain(opts: { list?: unknown | (() => unknown); singles?: unknown[]; onDelete?: () => void } = {}) {
  const singles = opts.singles;
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'insert', 'update', 'eq', 'in', 'order', 'limit', 'match', 'is']) q[m] = vi.fn(() => q);
  q.delete = vi.fn(() => { opts.onDelete?.(); return q; });
  q.single = vi.fn(() => Promise.resolve(singles && singles.length ? singles.shift() : { data: null, error: null }));
  (q as { then: unknown }).then = (r: (v: unknown) => unknown) => {
    const resolved = typeof opts.list === 'function' ? (opts.list as () => unknown)() : (opts.list ?? { data: [], error: null });
    return Promise.resolve(resolved).then(r);
  };
  return q;
}

beforeEach(() => {
  h.user = { id: 'owner-1' };
  toastSpy.mockReset();
  vi.mocked(supabase.from).mockReset();
  try { sessionStorage.clear(); } catch { /* noop */ }
});

async function mountLoaded(fromImpl: (table: string) => unknown) {
  vi.mocked(supabase.from).mockImplementation(fromImpl as never);
  const hook = renderHook(() => useMultipleBudgets());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

describe('[R10] createNewBudget 항목 시드 실패 시 무음 금지 + 좀비 예산 차단', () => {
  it('시드 insert 가 error 를 반환하면 (1)에러 토스트+null (2)빈 예산 미전환 (3)보상 삭제', async () => {
    // budgets: mount fetch 는 기존 b1 반환(자동생성 회피), createNewBudget 의 insert.select().single() 은 b2 성공.
    const budgetsSingles = [{ data: mkBudget({ id: 'b2', name: '옵션 2' }), error: null }];
    let budgetsDeleteCalled = false;

    // budget_items: 1번째 list = mount fetch(성공, 빈 목록), 2번째 list = 시드 insert.select()(error 반환).
    let itemsListCall = 0;
    const itemsListResult = () => {
      itemsListCall += 1;
      if (itemsListCall >= 2) {
        return { data: null, error: { code: '23503', message: 'seed insert failed (RLS/constraint)' } };
      }
      return { data: [], error: null };
    };

    const { result } = await mountLoaded((table) => {
      if (table === 'budgets') return chain({ list: { data: [mkBudget()], error: null }, singles: budgetsSingles, onDelete: () => { budgetsDeleteCalled = true; } });
      if (table === 'budget_items') return chain({ list: itemsListResult });
      if (table === 'budget_collaborators') return chain({ list: { data: [], error: null } });
      return chain();
    });

    const activeBefore = result.current.activeBudgetId;

    let created: unknown = 'sentinel';
    await act(async () => { created = await result.current.createNewBudget('옵션 2'); });

    // (1) 무음 아님 — null 반환 + '예산 생성 중 오류' 토스트
    expect(created).toBeNull();
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: '예산 생성 중 오류가 발생했어요', variant: 'destructive' }),
    );

    // (2) 실패한 빈 예산(b2)이 활성 상태로 전환되지 않음(좀비 빈 온보딩 화면 방지)
    expect(result.current.activeBudgetId).not.toBe('b2');
    expect(result.current.activeBudgetId).toBe(activeBefore);
    // budgets 목록에도 b2 가 유입되지 않음
    expect(result.current.budgets.find(b => b.id === 'b2')).toBeUndefined();

    // (3) 방금 만든 budgets 행 보상 삭제 호출(좀비 행 잔존 차단)
    expect(budgetsDeleteCalled).toBe(true);
  });

  it('시드 insert 가 성공하면 정상적으로 예산이 생성·활성화된다(정상 경로 회귀 가드)', async () => {
    const budgetsSingles = [{ data: mkBudget({ id: 'b2', name: '옵션 2' }), error: null }];
    let budgetsDeleteCalled = false;

    const { result } = await mountLoaded((table) => {
      if (table === 'budgets') return chain({ list: { data: [mkBudget()], error: null }, singles: budgetsSingles, onDelete: () => { budgetsDeleteCalled = true; } });
      if (table === 'budget_items') return chain({ list: { data: [], error: null } }); // 모든 list 성공
      if (table === 'budget_collaborators') return chain({ list: { data: [], error: null } });
      return chain();
    });

    let created: unknown = null;
    await act(async () => { created = await result.current.createNewBudget('옵션 2'); });

    expect((created as { id?: string })?.id).toBe('b2');
    expect(result.current.activeBudgetId).toBe('b2');
    expect(result.current.budgets.find(b => b.id === 'b2')).toBeDefined();
    // 정상 경로에서는 보상 삭제가 일어나지 않음
    expect(budgetsDeleteCalled).toBe(false);
    expect(toastSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: '예산 생성 중 오류가 발생했어요' }),
    );
  });
});

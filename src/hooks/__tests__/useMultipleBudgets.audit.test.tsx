// [CL-AUDIT-20260622] useMultipleBudgets 감사 회귀 — is_shared 컬럼 미배포 degrade + saveState 에러-스티키
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { supabase } from '@/integrations/supabase/client';
import { useMultipleBudgets } from '@/hooks/useMultipleBudgets';

const h = vi.hoisted(() => ({ user: { id: 'owner-1' } as { id: string } | null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: h.user }) }));
const toastSpy = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastSpy }) }));

const NOW = '2026-06-22T00:00:00.000Z';
const mkBudget = (over = {}) => ({ id: 'b1', user_id: 'owner-1', name: '옵션 1', wedding_date: null, is_shared: false, created_at: NOW, updated_at: NOW, ...over });
const mkItem = (id: string) => ({ id, budget_id: 'b1', category: 'c', sub_category: `s-${id}`, amount: 100, is_paid: false, notes: null, unit_price: null, quantity: null, custom_name: null, is_custom: false, updated_at: NOW });

// 체이너블 mock — list(then) / single(시퀀스 큐) 지원.
// ※ singles 는 복제하지 않고 "공유 참조"로 shift → 동일 테이블의 여러 from() 호출이 같은 큐를 소비
//   (createNewBudget 의 1차 insert→재시도 insert, updateItem 의 i1→i2 가 순차로 다른 응답을 받도록).
function chain(opts: { list?: unknown; singles?: unknown[] } = {}) {
  const list = opts.list ?? { data: [], error: null };
  const singles = opts.singles;
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'order', 'limit', 'match', 'is']) q[m] = vi.fn(() => q);
  q.single = vi.fn(() => Promise.resolve(singles && singles.length ? singles.shift() : { data: null, error: null }));
  (q as { then: unknown }).then = (r: (v: unknown) => unknown) => Promise.resolve(list).then(r);
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

describe('[E1/E3] is_shared 컬럼 미배포 시 createNewBudget degrade', () => {
  it('budgets insert 가 42703(컬럼없음) 반환 시 is_shared 없이 재시도해 성공한다(백지/마비 방지)', async () => {
    const budgetsSingles = [
      { data: null, error: { code: '42703', message: 'column "is_shared" does not exist' } }, // 1차: 컬럼 없음
      { data: mkBudget({ id: 'b2', name: '옵션 2' }), error: null },                            // 2차: degrade 재시도 성공
    ];
    const budgetsQ = () => chain({ list: { data: [mkBudget()], error: null }, singles: budgetsSingles });
    const { result } = await mountLoaded((table) => {
      if (table === 'budgets') return budgetsQ();
      if (table === 'budget_items') return chain({ list: { data: [], error: null } });
      if (table === 'budget_collaborators') return chain({ list: { data: [], error: null } });
      return chain();
    });

    let created: unknown = undefined;
    await act(async () => { created = await result.current.createNewBudget('옵션 2', { shared: true }); });

    // degrade 경로로 생성 성공(null 아님) — 신규/옵션추가 마비 방지
    expect(created).not.toBeNull();
    expect((created as { id?: string })?.id).toBe('b2');
    // single 이 2회 호출됨(1차 42703 → 2차 재시도)
    expect(budgetsSingles.length).toBe(0);
  });
});

describe('[E2] saveState 에러-스티키 (실패가 성공으로 덮이지 않음)', () => {
  it('동시 저장 중 하나가 실패하면 최종 saveState 는 error (거짓 saved 방지)', async () => {
    // budget_items update ACK: 1차(i1) 에러, 2차(i2) 성공
    const itemSingles = [
      { data: null, error: { message: 'save failed' } },
      { data: { updated_at: NOW }, error: null },
    ];
    const { result } = await mountLoaded((table) => {
      if (table === 'budgets') return chain({ list: { data: [mkBudget()], error: null } });
      if (table === 'budget_items') return chain({ list: { data: [mkItem('i1'), mkItem('i2')], error: null }, singles: itemSingles });
      if (table === 'budget_collaborators') return chain({ list: { data: [], error: null } });
      return chain();
    });

    // i1 → i2 동시 저장(togglePaid 는 updateItem 호출). i1 먼저 ACK(에러), i2 나중 ACK(성공).
    await act(async () => {
      await Promise.all([result.current.togglePaid('i1'), result.current.togglePaid('i2')]);
    });

    await waitFor(() => expect(result.current.saveState).toBe('error'));
    // 성공한 i2 가 'saved' 로 덮지 않았음을 확정
    expect(result.current.saveState).not.toBe('saved');
  });
});

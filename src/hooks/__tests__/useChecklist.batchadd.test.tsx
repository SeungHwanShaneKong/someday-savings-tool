// [CL-AUDIT6-D1-20260710] 적대 감사 확정결함 D-1 근본수정 검증 — 배치 추가 sort_order 무결성.
//
// 근본원인(수정 전): addCustomItem 의 useCallback 클로저가 캡처한 items 는 리렌더 커밋 전까지
//   갱신되지 않음 → 같은 period 로 리렌더 없이 연속 호출 시 maxOrder 가 동일 스냅샷 → sort_order 전부 중복.
//   신규 진입점 "모두 적용"(TimelinePanel.handleApplyAll)이 for+await 로 다건 add 를 연속 처리해 현실화.
// 근본수정: addCustomItems 배치 — 단일 호출로 period별 순번을 직접 부여 + 단일 insert(원자적).
//   → 연속 호출 패턴 자체를 제거해 stale 클로저 결함을 구조적으로 차단.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { supabase } from '@/integrations/supabase/client';
import { useChecklist, type ChecklistItem } from '@/hooks/useChecklist';

const auth = vi.hoisted(() => ({ user: { id: 'u1' } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
const wedding = vi.hoisted(() => ({
  weddingDate: null,
  weddingTime: null,
  updateWeddingDate: () => Promise.resolve(),
}));
vi.mock('@/hooks/useWeddingDate', () => ({ useWeddingDate: () => wedding }));
const toastSpy = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastSpy }) }));

function makeRow(id: string, over: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    id, user_id: 'u1', template_id: null, budget_id: null, title: id,
    period: 'D-12~10m', sort_order: 1, is_completed: false, completed_at: null,
    due_date: null, notes: null, depends_on: null, category_link: null,
    sub_category_link: null, is_custom: false,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', ...over,
  };
}

/** 배치 insert([...]).select() 를 지원하는 controlled mock — 삽입 payload(배열/단건)를 기록. */
function makeBatchTable(cfg: { rows: ChecklistItem[]; insertError?: { message: string } | null }) {
  const insertCalls: Array<Record<string, unknown>[] | Record<string, unknown>> = [];
  const make = () => {
    let mode: 'select' | 'insert' = 'select';
    let lastInsert: Record<string, unknown>[] = [];
    const q: Record<string, unknown> = {};
    q.select = vi.fn(() => q);
    q.insert = vi.fn((payload: Record<string, unknown>[] | Record<string, unknown>) => {
      mode = 'insert';
      insertCalls.push(payload);
      lastInsert = Array.isArray(payload) ? payload : [payload];
      return q;
    });
    for (const m of ['eq', 'order', 'limit', 'delete', 'update']) q[m] = vi.fn(() => q);
    // 배치 insert 는 .select() 후 then 으로 삽입행 배열 반환(단건 .single() 은 별도)
    (q as { then: unknown }).then = (resolve: (v: unknown) => unknown) => {
      if (mode === 'insert') {
        if (cfg.insertError) return Promise.resolve({ data: null, error: cfg.insertError }).then(resolve);
        // 삽입 payload 를 그대로 행으로 에코(id 부여) — sort_order 검증은 payload 로도 가능
        const rows = lastInsert.map((p, idx) => makeRow(`new-${idx}`, p as Partial<ChecklistItem>));
        return Promise.resolve({ data: rows, error: null }).then(resolve);
      }
      return Promise.resolve({ data: cfg.rows, error: null }).then(resolve);
    };
    return q;
  };
  return { make, insertCalls };
}

function installTable(tbl: ReturnType<typeof makeBatchTable>) {
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    if (table === 'user_checklist_items') return tbl.make() as never;
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order', 'limit', 'insert', 'update']) q[m] = vi.fn(() => q);
    (q as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve);
    return q as never;
  }) as never);
}

async function renderChecklist(tbl: ReturnType<typeof makeBatchTable>) {
  installTable(tbl);
  const rendered = renderHook(() => useChecklist());
  await waitFor(() => expect(rendered.result.current.loading).toBe(false));
  return rendered;
}

beforeEach(() => {
  toastSpy.mockReset();
  vi.mocked(supabase.from).mockReset();
});

describe('useChecklist.addCustomItems — 배치 sort_order 무결성 (D-1 근본수정)', () => {
  it('BA1: 같은 period 3건 → sort_order 가 연속(중복 0) — maxOrder+1,+2,+3', async () => {
    const tbl = makeBatchTable({ rows: [] }); // 해당 period 기존 항목 0
    const { result } = await renderChecklist(tbl);

    let res: { added: number; failed: number } = { added: 0, failed: 0 };
    await act(async () => {
      res = await result.current.addCustomItems([
        { title: 'A', period: 'D-6~5m' },
        { title: 'B', period: 'D-6~5m' },
        { title: 'C', period: 'D-6~5m' },
      ]);
    });

    expect(res.added).toBe(3);
    expect(res.failed).toBe(0);
    // 단일 배치 insert(연속 호출 아님) — DB 왕복 1회
    expect(tbl.insertCalls).toHaveLength(1);
    const rows = tbl.insertCalls[0] as Record<string, unknown>[];
    expect(Array.isArray(rows)).toBe(true);
    const orders = rows.map((r) => r.sort_order);
    // 핵심: 전부 중복이던 [1,1,1] 이 아니라 유일한 연속값
    expect(orders).toEqual([1, 2, 3]);
    expect(new Set(orders).size).toBe(3);
  });

  it('BA2: 서로 다른 period 는 각자 독립 순번(기존 maxOrder 존중)', async () => {
    // D-6~5m 에 기존 sort_order 2 존재, D-2~1m 은 비어있음
    const tbl = makeBatchTable({
      rows: [makeRow('x', { period: 'D-6~5m', sort_order: 2 })],
    });
    const { result } = await renderChecklist(tbl);

    await act(async () => {
      await result.current.addCustomItems([
        { title: 'A', period: 'D-6~5m' }, // → 3
        { title: 'B', period: 'D-2~1m' }, // → 1
        { title: 'C', period: 'D-6~5m' }, // → 4
        { title: 'D', period: 'D-2~1m' }, // → 2
      ]);
    });

    const rows = tbl.insertCalls[0] as Record<string, unknown>[];
    const byTitle = Object.fromEntries(rows.map((r) => [r.title, r.sort_order]));
    expect(byTitle).toEqual({ A: 3, B: 1, C: 4, D: 2 });
  });

  it('BA3: dueDate override 는 그대로, 미지정은 weddingDate 없으면 null', async () => {
    const tbl = makeBatchTable({ rows: [] });
    const { result } = await renderChecklist(tbl);

    await act(async () => {
      await result.current.addCustomItems([
        { title: 'A', period: 'D-1~0', dueDate: '2026-11-20' },
        { title: 'B', period: 'D-1~0' },
      ]);
    });

    const rows = tbl.insertCalls[0] as Record<string, unknown>[];
    expect(rows.find((r) => r.title === 'A')!.due_date).toBe('2026-11-20');
    expect(rows.find((r) => r.title === 'B')!.due_date).toBeNull();
  });

  it('BA4: 빈 입력 → no-op(insert 0)', async () => {
    const tbl = makeBatchTable({ rows: [] });
    const { result } = await renderChecklist(tbl);

    let res: { added: number; failed: number } = { added: -1, failed: -1 };
    await act(async () => {
      res = await result.current.addCustomItems([]);
    });
    expect(res.added).toBe(0);
    expect(tbl.insertCalls).toHaveLength(0);
  });

  it('BA5: insert 실패 → {added:0, failed:n} + destructive toast(무음실패 방지)', async () => {
    const tbl = makeBatchTable({ rows: [], insertError: { message: 'RLS 거부' } });
    const { result } = await renderChecklist(tbl);

    let res: { added: number; failed: number } = { added: -1, failed: -1 };
    await act(async () => {
      res = await result.current.addCustomItems([
        { title: 'A', period: 'D-1~0' },
        { title: 'B', period: 'D-1~0' },
      ]);
    });
    expect(res.added).toBe(0);
    expect(res.failed).toBe(2);
    const arg = toastSpy.mock.calls.at(-1)?.[0];
    expect(arg.variant).toBe('destructive');
  });
});

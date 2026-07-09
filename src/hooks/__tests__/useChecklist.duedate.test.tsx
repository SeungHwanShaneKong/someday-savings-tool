// [CL-CHECKUX-20260709-232512] useChecklist.updateDueDate / addCustomItem(dueDateOverride) 계약 검증
//
// 계약:
//  - updateDueDate: 낙관적 set → DB update({due_date, updated_at}) → 실패 시 원본 스냅샷 롤백 + destructive toast.
//    동일 기한이면 쓰기 생략(no-op true). 반환 boolean = 성공 여부(무음실패 방지).
//  - addCustomItem 3번째 옵션 dueDateOverride: 전달 시 AI deadline 그대로 insert, 미전달 시 기존 계산(회귀 0).
//
// 격리: supabase 는 setup.ts 전역 mock 위에 user_checklist_items 전용 controlled chain 오버라이드.
//       useWeddingDate 는 weddingDate=null 로 고정 → 템플릿 자동생성/마이그레이션 경로 차단(순수 격리).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { supabase } from '@/integrations/supabase/client';
import { useChecklist, type ChecklistItem } from '@/hooks/useChecklist';

// user 참조는 렌더 간 안정이어야 함 — 매 호출 새 객체면 fetchItems 가 재실행돼
// 낙관적 setItems 를 서버 rows 로 덮어써 검증이 왜곡된다(실제 useAuth 는 상태라 안정).
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
    id,
    user_id: 'u1',
    template_id: null,
    budget_id: null,
    title: id,
    period: 'D-12~10m',
    sort_order: 1,
    is_completed: false,
    completed_at: null,
    due_date: null,
    notes: null,
    depends_on: null,
    category_link: null,
    sub_category_link: null,
    is_custom: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...over,
  };
}

/**
 * user_checklist_items 전용 controlled 테이블 mock.
 * from() 호출마다 새 체인(모드 격리) — select 는 rows, update 는 updateError, insert.select().single() 은 insertedRow.
 */
function makeChecklistTable(cfg: {
  rows: ChecklistItem[];
  updateError?: { message: string } | null;
  insertedRow?: ChecklistItem | null;
}) {
  const updates: Record<string, unknown>[] = [];
  const inserts: Record<string, unknown>[] = [];
  const make = () => {
    let mode: 'select' | 'update' | 'insert' = 'select';
    const q: Record<string, unknown> = {};
    q.select = vi.fn(() => q);
    q.update = vi.fn((payload: Record<string, unknown>) => {
      mode = 'update';
      updates.push(payload);
      return q;
    });
    q.insert = vi.fn((payload: Record<string, unknown>) => {
      mode = 'insert';
      inserts.push(payload);
      return q;
    });
    for (const m of ['eq', 'order', 'limit', 'delete']) q[m] = vi.fn(() => q);
    q.single = vi.fn(() =>
      Promise.resolve({ data: cfg.insertedRow ?? null, error: cfg.insertedRow ? null : { message: 'no row' } }),
    );
    (q as { then: unknown }).then = (resolve: (v: unknown) => unknown) => {
      const res =
        mode === 'update'
          ? { data: null, error: cfg.updateError ?? null }
          : { data: cfg.rows, error: null };
      return Promise.resolve(res).then(resolve);
    };
    return q;
  };
  return { make, updates, inserts };
}

function installTable(tbl: ReturnType<typeof makeChecklistTable>) {
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    if (table === 'user_checklist_items') return tbl.make() as never;
    // 그 외 테이블은 빈 체인(전역 mock 시맨틱)
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order', 'limit', 'insert', 'update']) q[m] = vi.fn(() => q);
    (q as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve);
    return q as never;
  }) as never);
}

async function renderChecklist(tbl: ReturnType<typeof makeChecklistTable>) {
  installTable(tbl);
  const rendered = renderHook(() => useChecklist());
  await waitFor(() => expect(rendered.result.current.loading).toBe(false));
  return rendered;
}

beforeEach(() => {
  toastSpy.mockReset();
  vi.mocked(supabase.from).mockReset();
});

describe('useChecklist.updateDueDate', () => {
  it('DD1 성공: 낙관적 반영 + update 페이로드(due_date·updated_at) + true 반환', async () => {
    const tbl = makeChecklistTable({ rows: [makeRow('i1', { due_date: '2026-08-01' })] });
    const { result } = await renderChecklist(tbl);
    expect(result.current.items[0].due_date).toBe('2026-08-01');

    let ok = false;
    await act(async () => {
      ok = await result.current.updateDueDate('i1', '2026-09-15');
    });

    expect(ok).toBe(true);
    expect(result.current.items[0].due_date).toBe('2026-09-15');
    expect(tbl.updates).toHaveLength(1);
    expect(tbl.updates[0].due_date).toBe('2026-09-15');
    expect(tbl.updates[0].updated_at).toEqual(expect.any(String));
    expect(toastSpy).not.toHaveBeenCalled(); // 성공은 조용히(과알림 방지)
  });

  it('DD2 실패: 원본 스냅샷 롤백 + destructive toast + false 반환', async () => {
    const tbl = makeChecklistTable({
      rows: [makeRow('i1', { due_date: '2026-08-01' })],
      updateError: { message: 'RLS 거부' },
    });
    const { result } = await renderChecklist(tbl);

    let ok = true;
    await act(async () => {
      ok = await result.current.updateDueDate('i1', '2026-09-15');
    });

    expect(ok).toBe(false);
    expect(result.current.items[0].due_date).toBe('2026-08-01'); // 롤백
    const arg = toastSpy.mock.calls.at(-1)?.[0];
    expect(arg.title).toBe('기한 변경 실패');
    expect(arg.variant).toBe('destructive');
  });

  it('DD3 동일 기한 no-op: true 반환 + DB 쓰기 0', async () => {
    const tbl = makeChecklistTable({ rows: [makeRow('i1', { due_date: '2026-08-01' })] });
    const { result } = await renderChecklist(tbl);

    let ok = false;
    await act(async () => {
      ok = await result.current.updateDueDate('i1', '2026-08-01');
    });

    expect(ok).toBe(true);
    expect(tbl.updates).toHaveLength(0);
  });

  it('DD4 미존재 항목: false 반환 + DB 쓰기 0', async () => {
    const tbl = makeChecklistTable({ rows: [makeRow('i1')] });
    const { result } = await renderChecklist(tbl);

    let ok = true;
    await act(async () => {
      ok = await result.current.updateDueDate('ghost', '2026-09-15');
    });

    expect(ok).toBe(false);
    expect(tbl.updates).toHaveLength(0);
  });
});

describe('useChecklist.addCustomItem — dueDateOverride', () => {
  it('AD1 override 전달: insert due_date 가 AI deadline 그대로 + 로컬 append + true', async () => {
    const inserted = makeRow('new1', {
      title: 'AI 추가 항목',
      period: 'D-2~1m',
      due_date: '2026-11-20',
      is_custom: true,
    });
    const tbl = makeChecklistTable({ rows: [makeRow('i1')], insertedRow: inserted });
    const { result } = await renderChecklist(tbl);

    let ok = false;
    await act(async () => {
      ok = await result.current.addCustomItem('AI 추가 항목', 'D-2~1m', '2026-11-20');
    });

    expect(ok).toBe(true);
    expect(tbl.inserts).toHaveLength(1);
    expect(tbl.inserts[0].due_date).toBe('2026-11-20');
    expect(tbl.inserts[0].period).toBe('D-2~1m');
    expect(result.current.items.map((i) => i.id)).toContain('new1');
  });

  it('AD2 override 미전달(기존 경로 회귀 0): weddingDate 없음 → due_date null 로 insert', async () => {
    const inserted = makeRow('new2', { title: '일반 추가', period: 'D-1~0', is_custom: true });
    const tbl = makeChecklistTable({ rows: [], insertedRow: inserted });
    const { result } = await renderChecklist(tbl);

    await act(async () => {
      await result.current.addCustomItem('일반 추가', 'D-1~0');
    });

    expect(tbl.inserts).toHaveLength(1);
    expect(tbl.inserts[0].due_date).toBeNull();
  });
});

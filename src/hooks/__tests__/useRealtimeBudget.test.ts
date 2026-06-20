// [CL-COEDIT-E2E-20260620-130000] 실시간 머지 resolver 순수 로직 테스트
import { describe, it, expect } from 'vitest';
import { resolveRealtimeEvent, type RealtimeContext } from '../useRealtimeBudget';
import type { PendingOp } from '@/lib/collab/conflict-resolution';

const ctx = (over: Partial<RealtimeContext> = {}): RealtimeContext => ({
  getLocal: () => undefined,
  pending: new Map<string, PendingOp>(),
  knownUpdatedAt: new Map<string, string>(),
  ...over,
});

describe('resolveRealtimeEvent (실시간 머지 결정)', () => {
  it('RT.1 INSERT(로컬 없음) → upsert remote', () => {
    const row = { id: 'i1', updated_at: '2026-06-20T00:00:02Z', amount: 100 };
    expect(resolveRealtimeEvent('INSERT', row, undefined, ctx())).toEqual({ type: 'upsert', row });
  });

  it('RT.2 UPDATE 더 새로움 → upsert(필드 머지)', () => {
    const local = { id: 'i1', updated_at: '2026-06-20T00:00:01Z', amount: 100 };
    const remote = { id: 'i1', updated_at: '2026-06-20T00:00:03Z', amount: 200 };
    const a = resolveRealtimeEvent('UPDATE', remote, undefined, ctx({
      getLocal: () => local,
      knownUpdatedAt: new Map([['i1', '2026-06-20T00:00:01Z']]),
    }));
    expect(a.type).toBe('upsert');
    if (a.type === 'upsert') expect(a.row.amount).toBe(200);
  });

  it('RT.3 내 에코(pending ack 일치) → ignore', () => {
    const remote = { id: 'i1', updated_at: '2026-06-20T00:00:05Z', amount: 300 };
    const pending = new Map<string, PendingOp>([
      ['i1', { columns: new Set(['amount']), ackedUpdatedAt: '2026-06-20T00:00:05Z' }],
    ]);
    const a = resolveRealtimeEvent('UPDATE', remote, undefined, ctx({
      getLocal: () => ({ id: 'i1', updated_at: '2026-06-20T00:00:05Z', amount: 300 }),
      pending,
    }));
    expect(a).toEqual({ type: 'ignore' });
  });

  it('RT.4 stale(updated_at ≤ known) → ignore', () => {
    const a = resolveRealtimeEvent('UPDATE', { id: 'i1', updated_at: '2026-06-20T00:00:01Z', amount: 1 }, undefined, ctx({
      getLocal: () => ({ id: 'i1', updated_at: '2026-06-20T00:00:09Z', amount: 9 }),
      knownUpdatedAt: new Map([['i1', '2026-06-20T00:00:09Z']]),
    }));
    expect(a).toEqual({ type: 'ignore' });
  });

  it('RT.5 DELETE → delete id', () => {
    expect(resolveRealtimeEvent('DELETE', undefined, { id: 'i1' }, ctx())).toEqual({ type: 'delete', id: 'i1' });
  });

  it('RT.6 DELETE old.id 없음 → ignore', () => {
    expect(resolveRealtimeEvent('DELETE', undefined, {}, ctx())).toEqual({ type: 'ignore' });
  });

  it('RT.7 편집 중 컬럼은 머지에서 보호(버퍼 우선)', () => {
    const local = { id: 'i1', updated_at: '2026-06-20T00:00:01Z', amount: 100, notes: '내가 입력중' };
    const remote = { id: 'i1', updated_at: '2026-06-20T00:00:03Z', amount: 200, notes: '상대값' };
    const a = resolveRealtimeEvent('UPDATE', remote, undefined, ctx({
      getLocal: () => local,
      knownUpdatedAt: new Map([['i1', '2026-06-20T00:00:01Z']]),
      editingColumns: () => new Set(['notes']),
    }));
    expect(a.type).toBe('upsert');
    if (a.type === 'upsert') {
      expect(a.row.amount).toBe(200); // 비편집 컬럼 → 원격 채택
      expect(a.row.notes).toBe('내가 입력중'); // 편집중 컬럼 → 버퍼 보호
    }
  });
});

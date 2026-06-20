// [CL-COEDIT-QA200-20260620] resolveRealtimeEvent 순수 resolver — 엣지/연쇄/멱등/우선순위 검증.
// 대상: src/hooks/useRealtimeBudget.ts (resolveRealtimeEvent). 템플릿(useRealtimeBudget.test.ts)의 RT.1~7 과 비중복.
// 계약 출처: decideItemUpsert(src/lib/collab/conflict-resolution.ts) 가드 순서(echo→stale→insert→field-merge).
import { describe, it, expect } from 'vitest';
import {
  resolveRealtimeEvent,
  type RealtimeContext,
  type ItemRow,
} from '../useRealtimeBudget';
import type { PendingOp } from '@/lib/collab/conflict-resolution';

/** 기본 ctx 빌더(템플릿과 동일 스타일) — 모든 가드가 비활성인 중립 상태. */
const ctx = (over: Partial<RealtimeContext> = {}): RealtimeContext => ({
  getLocal: () => undefined,
  pending: new Map<string, PendingOp>(),
  knownUpdatedAt: new Map<string, string>(),
  ...over,
});

describe('resolveRealtimeEvent — edge/연쇄/멱등/우선순위 [CL-COEDIT-QA200-20260620]', () => {
  // ── RT.8 INSERT@T2 → UPDATE@T3 연쇄: 로컬 누적 시 두 번째 이벤트는 필드 머지로 수렴 ──
  // 계약: 첫 INSERT 는 로컬 없음 → remote 그대로 채택. 시뮬레이션상 그 결과가 로컬이 된 뒤
  //       더 새로운 UPDATE 는 isNewer(T3>known T2) 통과 → mergeRemoteFields 로 변경 컬럼만 갱신.
  it('RT.8 INSERT@T2 → UPDATE@T3 연쇄 — 두 번째는 필드 머지로 누적 수렴', () => {
    const T2 = '2026-06-20T00:00:02Z';
    const T3 = '2026-06-20T00:00:03Z';

    // 1) INSERT: 로컬 없음 → remote 통째 채택
    const inserted: ItemRow = { id: 'i1', updated_at: T2, amount: 100, notes: '초기' };
    const first = resolveRealtimeEvent('INSERT', inserted, undefined, ctx());
    expect(first).toEqual({ type: 'upsert', row: inserted });

    // 2) 적용 결과(=inserted)를 로컬/기지값으로 삼아 다음 UPDATE 수신
    const update: ItemRow = { id: 'i1', updated_at: T3, amount: 250, notes: '초기' };
    const second = resolveRealtimeEvent('UPDATE', update, undefined, ctx({
      getLocal: () => inserted,
      knownUpdatedAt: new Map([['i1', T2]]),
    }));

    expect(second.type).toBe('upsert');
    if (second.type === 'upsert') {
      expect(second.row.amount).toBe(250); // 변경 컬럼 채택
      expect(second.row.notes).toBe('초기'); // remote 동일값 → 그대로
      expect(second.row.updated_at).toBe(T3); // bookkeeping 항상 갱신
    }
  });

  // ── RT.9 다중 DELETE 멱등: 같은 id 를 반복 수신해도 항상 동일한 delete 액션(부작용 없음) ──
  it('RT.9 다중 DELETE 멱등 — 동일 id 반복 수신해도 결과 불변', () => {
    const old: Partial<ItemRow> = { id: 'i7' };
    const results = [0, 1, 2].map(() =>
      resolveRealtimeEvent('DELETE', undefined, old, ctx({
        // 이미 삭제되어 로컬에 없는 상태여도(멱등) delete 액션은 동일하게 산출
        getLocal: () => undefined,
      })),
    );
    for (const r of results) expect(r).toEqual({ type: 'delete', id: 'i7' });
    // 참조 동일성이 아닌 구조 동일성(순수 함수: 매번 새 객체, 같은 값)
    expect(results[0]).not.toBe(results[1]);
  });

  // ── RT.10 DELETE 인데 old.id 가 없음(예: REPLICA IDENTITY 미설정 시 빈 old) → ignore ──
  // 계약: DELETE 분기는 oldRow?.id 만 봄. newRow 가 우연히 채워져 있어도 무시(DELETE 는 old 권위).
  it('RT.10 DELETE old.id 없음 → ignore (newRow 가 있어도 DELETE 는 old 권위)', () => {
    // old 자체가 undefined
    expect(resolveRealtimeEvent('DELETE', undefined, undefined, ctx())).toEqual({ type: 'ignore' });
    // old 객체는 있으나 id 누락
    expect(resolveRealtimeEvent('DELETE', undefined, { amount: 5 }, ctx())).toEqual({ type: 'ignore' });
    // newRow 가 채워져 있어도 DELETE 분기는 newRow 를 보지 않음 → 여전히 ignore
    const decoyNew: ItemRow = { id: 'ghost', updated_at: '2026-06-20T00:00:09Z' };
    expect(resolveRealtimeEvent('DELETE', decoyNew, {}, ctx())).toEqual({ type: 'ignore' });
  });

  // ── RT.11 editingColumns() 가 undefined 를 반환해도 EMPTY_COLS 폴백으로 무크래시 ──
  // 계약: ctx.editingColumns?.(id) → undefined → decideItemUpsert 의 (editingColumns ?? new Set()) 폴백.
  //       보호 컬럼 0 → 모든 머지대상 remote 컬럼 채택. throw 없음.
  it('RT.11 editingColumns()→undefined — EMPTY_COLS 폴백, 크래시 없이 전 컬럼 머지', () => {
    const local: ItemRow = { id: 'i1', updated_at: '2026-06-20T00:00:01Z', amount: 100, notes: '로컬' };
    const remote: ItemRow = { id: 'i1', updated_at: '2026-06-20T00:00:05Z', amount: 999, notes: '원격' };
    const editingColumns = (): Set<string> => undefined as unknown as Set<string>;

    let action: ReturnType<typeof resolveRealtimeEvent> | undefined;
    expect(() => {
      action = resolveRealtimeEvent('UPDATE', remote, undefined, ctx({
        getLocal: () => local,
        knownUpdatedAt: new Map([['i1', '2026-06-20T00:00:01Z']]),
        editingColumns,
      }));
    }).not.toThrow();

    expect(action?.type).toBe('upsert');
    if (action?.type === 'upsert') {
      // 보호 컬럼이 없으므로 양쪽 머지대상 컬럼 모두 원격 채택
      expect(action.row.amount).toBe(999);
      expect(action.row.notes).toBe('원격');
    }
  });

  // ── RT.12 newRow 의 비-mergeable 여분 필드는 로컬 존재 시 머지에서 무시 ──
  // 계약: mergeRemoteFields 는 MERGEABLE_COLUMNS(+updated_at)만 채택. budget_id/created_at 등 비대상은
  //       remote 에 있어도 결과는 로컬 기준. (단, 로컬 없는 INSERT 는 remote 통째라 여분 보존 — RT.8 과 대비.)
  it('RT.12 비-mergeable 여분 필드(budget_id/created_at) — 로컬 존재 시 머지에서 무시', () => {
    const local: ItemRow = {
      id: 'i1',
      updated_at: '2026-06-20T00:00:01Z',
      amount: 100,
      budget_id: 'B-OLD',
      created_at: '2026-01-01T00:00:00Z',
    };
    const remote: ItemRow = {
      id: 'i1',
      updated_at: '2026-06-20T00:00:05Z',
      amount: 200,
      budget_id: 'B-NEW', // 비-mergeable → 무시되어야 함
      created_at: '2099-01-01T00:00:00Z', // 비-mergeable → 무시되어야 함
      bogus_field: 'noise', // 화이트리스트 외 → 무시되어야 함
    };
    const a = resolveRealtimeEvent('UPDATE', remote, undefined, ctx({
      getLocal: () => local,
      knownUpdatedAt: new Map([['i1', '2026-06-20T00:00:01Z']]),
    }));

    expect(a.type).toBe('upsert');
    if (a.type === 'upsert') {
      expect(a.row.amount).toBe(200); // mergeable → 채택
      expect(a.row.updated_at).toBe('2026-06-20T00:00:05Z'); // bookkeeping → 채택
      expect(a.row.budget_id).toBe('B-OLD'); // 비-mergeable → 로컬 보존
      expect(a.row.created_at).toBe('2026-01-01T00:00:00Z'); // 비-mergeable → 로컬 보존
      expect('bogus_field' in a.row).toBe(false); // 여분 노이즈는 결과에 유입 안 됨
    }
  });

  // ── RT.13 stale + echo 동시 성립 시 우선순위: echo 가드가 먼저 평가됨 ──
  // 계약(decideItemUpsert 순서): isOwnEcho → isNewer. resolveRealtimeEvent 는 둘 다 ignore 로 접지만,
  //       "echo 우선"을 증명하려면 echo 만 성립하고 stale 은 성립 안 하는 케이스로도 ignore 임을 보여야 한다.
  it('RT.13 echo+stale 동시 — echo 가드가 우선(둘 다일 때도, echo만일 때도 ignore)', () => {
    const ACK = '2026-06-20T00:00:05Z';
    const pending = new Map<string, PendingOp>([
      ['i1', { columns: new Set(['amount']), ackedUpdatedAt: ACK }],
    ]);

    // (a) echo 성립 + stale 도 성립(remote ≤ known): 어느 가드든 ignore
    const bothIgnore = resolveRealtimeEvent(
      'UPDATE',
      { id: 'i1', updated_at: ACK, amount: 1 },
      undefined,
      ctx({
        getLocal: () => ({ id: 'i1', updated_at: ACK, amount: 1 }),
        pending,
        knownUpdatedAt: new Map([['i1', ACK]]), // remote == known → stale 도 참
      }),
    );
    expect(bothIgnore).toEqual({ type: 'ignore' });

    // (b) echo 성립 + stale 불성립(remote 가 known 보다 새로움): echo 가 먼저라야 ignore.
    //     만약 isNewer 가 먼저였다면 통과해 upsert 가 됐을 것 → echo 우선의 결정적 증거.
    const echoBeatsNewer = resolveRealtimeEvent(
      'UPDATE',
      { id: 'i1', updated_at: ACK, amount: 1 },
      undefined,
      ctx({
        getLocal: () => ({ id: 'i1', updated_at: '2026-06-20T00:00:01Z', amount: 9 }),
        pending,
        knownUpdatedAt: new Map([['i1', '2026-06-20T00:00:01Z']]), // remote(ACK) > known → NOT stale
      }),
    );
    expect(echoBeatsNewer).toEqual({ type: 'ignore' });
  });

  // ── 보너스: pending 은 있으나 ack 미수신(ackedUpdatedAt undefined)이면 echo 아님 → 정상 적용 ──
  // 계약: isOwnEcho 는 ackedUpdatedAt !== undefined 일 때만 참. 낙관적 쓰기 진행 중(ack 전) remote 는 차단 안 됨.
  it('RT.14 pending 있으나 ack 미수신 — echo 아님, 새 remote 는 정상 upsert', () => {
    const pendingNoAck = new Map<string, PendingOp>([
      ['i1', { columns: new Set(['amount']) }], // ackedUpdatedAt 없음
    ]);
    const a = resolveRealtimeEvent(
      'UPDATE',
      { id: 'i1', updated_at: '2026-06-20T00:00:08Z', amount: 500 },
      undefined,
      ctx({
        getLocal: () => ({ id: 'i1', updated_at: '2026-06-20T00:00:02Z', amount: 100 }),
        pending: pendingNoAck,
        knownUpdatedAt: new Map([['i1', '2026-06-20T00:00:02Z']]),
      }),
    );
    expect(a.type).toBe('upsert');
    if (a.type === 'upsert') expect(a.row.amount).toBe(500);
  });
});

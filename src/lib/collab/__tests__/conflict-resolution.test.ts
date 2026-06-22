// [CL-COLLAB-CONFLICT-20260619-222424] 충돌 제로 엔진 — 전 시나리오(P6) 단위 검증
import { describe, it, expect } from 'vitest';
import {
  compareTimestamps,
  isOwnEcho,
  isNewer,
  resolveLWW,
  mergeRemoteFields,
  upsertById,
  decideItemUpsert,
  MERGEABLE_COLUMNS,
  type PendingOp,
} from '../conflict-resolution';

type Item = {
  id: string;
  budget_id: string;
  amount: number;
  is_paid: boolean;
  notes: string | null;
  cost_split: string | null;
  updated_at: string;
};

const T = (ms: number) => new Date(Date.UTC(2026, 5, 19, 0, 0, 0, ms)).toISOString();

const baseItem = (over: Partial<Item> = {}): Item => ({
  id: 'i1',
  budget_id: 'b1',
  amount: 1000,
  is_paid: false,
  notes: null,
  cost_split: '-',
  updated_at: T(0),
  ...over,
});

describe('compareTimestamps / isNewer (단조 게이트)', () => {
  it('CR.1 다른 offset 포맷도 시간순 비교', () => {
    expect(compareTimestamps('2026-06-19T00:00:01Z', '2026-06-19T00:00:00+00:00')).toBeGreaterThan(0);
  });
  it('CR.2 기지값 없으면 항상 새로움', () => {
    expect(isNewer(T(5), undefined)).toBe(true);
  });
  it('CR.3 순서역전(오래된 remote)은 무시', () => {
    expect(isNewer(T(3), T(5))).toBe(false);
  });
  it('CR.4 동일 timestamp 는 새롭지 않음(에코 취급)', () => {
    expect(isNewer(T(5), T(5))).toBe(false);
  });
});

describe('isOwnEcho (Guard 1)', () => {
  it('CR.5 내가 ack 받은 updated_at 의 브로드캐스트는 에코', () => {
    const pending = new Map<string, PendingOp>([
      ['i1', { columns: new Set(['amount']), ackedUpdatedAt: T(7) }],
    ]);
    expect(isOwnEcho('i1', T(7), pending)).toBe(true);
  });
  it('CR.6 ack 미수신(undefined)이면 에코 아님', () => {
    const pending = new Map<string, PendingOp>([['i1', { columns: new Set(['amount']) }]]);
    expect(isOwnEcho('i1', T(7), pending)).toBe(false);
  });
  it('CR.7 pending 없으면 에코 아님', () => {
    expect(isOwnEcho('i1', T(7), new Map())).toBe(false);
  });
});

describe('upsertById (다른 항목 = 무충돌)', () => {
  it('CR.8 다른 id 는 union 으로 추가', () => {
    const list = [baseItem({ id: 'i1' })];
    const out = upsertById(list, baseItem({ id: 'i2' }));
    expect(out.map((x) => x.id)).toEqual(['i1', 'i2']);
  });
  it('CR.9 같은 id 는 교체(중복 없음)', () => {
    const list = [baseItem({ id: 'i1', amount: 1000 })];
    const out = upsertById(list, baseItem({ id: 'i1', amount: 2000 }));
    expect(out).toHaveLength(1);
    expect(out[0].amount).toBe(2000);
  });
});

describe('mergeRemoteFields (같은 항목·다른 필드 = 무손실)', () => {
  it('CR.10 A가 amount, B가 is_paid 를 동시 변경 → 둘 다 보존', () => {
    // 로컬: 내가 방금 amount 를 5000 으로 바꾼 상태(아직 내 편집)
    const local = baseItem({ amount: 5000, is_paid: false, updated_at: T(2) });
    // 원격: 파트너가 is_paid 를 true 로 바꾼 전체 행(amount 는 파트너가 본 5000 그대로)
    const remote = baseItem({ amount: 5000, is_paid: true, updated_at: T(3) });
    const merged = mergeRemoteFields(local, remote, new Set());
    expect(merged.amount).toBe(5000); // 내 변경 유지
    expect(merged.is_paid).toBe(true); // 파트너 변경 반영
    expect(merged.updated_at).toBe(T(3));
  });
  it('CR.11 편집 중 컬럼은 원격으로 덮지 않음(입력 버퍼 보호)', () => {
    const local = baseItem({ notes: '내가 타이핑 중', updated_at: T(2) });
    const remote = baseItem({ notes: '파트너 메모', updated_at: T(3) });
    const merged = mergeRemoteFields(local, remote, new Set(['notes']));
    expect(merged.notes).toBe('내가 타이핑 중'); // 버퍼 우선
    expect(merged.updated_at).toBe(T(3)); // bookkeeping 은 채택
  });
  it('CR.12 비대상 컬럼(budget_id 등)은 로컬 유지', () => {
    const local = baseItem({ budget_id: 'b1' });
    const remote = baseItem({ budget_id: 'b-HACK' }) as Item;
    const merged = mergeRemoteFields(local, remote, new Set());
    expect(merged.budget_id).toBe('b1');
  });
  it('CR.13 MERGEABLE_COLUMNS 에 핵심 필드 포함', () => {
    expect(MERGEABLE_COLUMNS).toEqual(
      expect.arrayContaining(['amount', 'is_paid', 'notes', 'cost_split', 'payment_date']),
    );
  });
});

describe('resolveLWW (같은 필드 경쟁)', () => {
  it('CR.14 더 늦은 updated_at 이 승', () => {
    const a = baseItem({ amount: 100, updated_at: T(1) });
    const b = baseItem({ amount: 200, updated_at: T(2) });
    expect(resolveLWW(a, b).amount).toBe(200);
    expect(resolveLWW(b, a).amount).toBe(200);
  });
  it('CR.15 동률이면 remote 채택(결정적)', () => {
    const local = baseItem({ amount: 100, updated_at: T(5) });
    const remote = baseItem({ amount: 200, updated_at: T(5) });
    expect(resolveLWW(local, remote).amount).toBe(200);
  });
});

describe('decideItemUpsert (최종 결정 — 통합)', () => {
  const pending = new Map<string, PendingOp>();

  it('CR.16 자기 에코 → ignore(echo)', () => {
    const p = new Map<string, PendingOp>([
      ['i1', { columns: new Set(['amount']), ackedUpdatedAt: T(4) }],
    ]);
    const d = decideItemUpsert(baseItem(), baseItem({ updated_at: T(4) }), {
      pending: p,
      knownUpdatedAt: T(0),
    });
    expect(d).toEqual({ action: 'ignore', reason: 'echo' });
  });

  it('CR.17 순서역전(stale) → ignore(stale)', () => {
    const d = decideItemUpsert(baseItem({ updated_at: T(5) }), baseItem({ amount: 9, updated_at: T(3) }), {
      pending,
      knownUpdatedAt: T(5),
    });
    expect(d).toEqual({ action: 'ignore', reason: 'stale' });
  });

  it('CR.18 local 없음 → INSERT(remote 그대로 apply)', () => {
    const remote = baseItem({ id: 'new', updated_at: T(1) });
    const d = decideItemUpsert(undefined, remote, { pending, knownUpdatedAt: undefined });
    expect(d).toEqual({ action: 'apply', merged: remote });
  });

  it('CR.19 정상 원격 변경 → 필드 머지 apply', () => {
    const local = baseItem({ amount: 5000, is_paid: false, updated_at: T(1) });
    const remote = baseItem({ amount: 5000, is_paid: true, updated_at: T(2) });
    const d = decideItemUpsert(local, remote, { pending, knownUpdatedAt: T(1) });
    expect(d.action).toBe('apply');
    if (d.action === 'apply') {
      expect(d.merged.is_paid).toBe(true);
      expect(d.merged.amount).toBe(5000);
      expect(d.merged.updated_at).toBe(T(2));
    }
  });

  it('CR.20 편집 중 필드는 보호하며 나머지만 머지', () => {
    const local = baseItem({ amount: 7777, notes: '편집중', updated_at: T(1) });
    const remote = baseItem({ amount: 1, notes: '파트너', updated_at: T(2) });
    const d = decideItemUpsert(local, remote, {
      pending,
      knownUpdatedAt: T(1),
      editingColumns: new Set(['amount']),
    });
    expect(d.action).toBe('apply');
    if (d.action === 'apply') {
      expect(d.merged.amount).toBe(7777); // 편집 중 → 보호
      expect(d.merged.notes).toBe('파트너'); // 비편집 → 머지
    }
  });
});

// [CL-AUDIT-ZOMBIE-TOMBSTONE-20260622-233012] 좀비 부활 차단(개선10) — 툼스톤 가드
describe('decideItemUpsert — 툼스톤(삭제 항목 부활 차단)', () => {
  const pending = new Map<string, PendingOp>();

  it('CR.21 툼스톤 + local 없음(INSERT) → ignore(tombstone) (어떤 가드보다 우선)', () => {
    const remote = baseItem({ id: 'gone', updated_at: T(9) });
    const d = decideItemUpsert(undefined, remote, {
      pending,
      knownUpdatedAt: undefined,
      isTombstoned: (id) => id === 'gone',
    });
    expect(d).toEqual({ action: 'ignore', reason: 'tombstone' });
  });

  it('CR.22 툼스톤 + local 존재(UPDATE) → ignore(tombstone) (되살아난 편집도 차단)', () => {
    const local = baseItem({ id: 'gone', amount: 1, updated_at: T(1) });
    const remote = baseItem({ id: 'gone', amount: 2, updated_at: T(5) });
    const d = decideItemUpsert(local, remote, {
      pending,
      knownUpdatedAt: T(1),
      isTombstoned: () => true,
    });
    expect(d).toEqual({ action: 'ignore', reason: 'tombstone' });
  });

  it('CR.23 비-툼스톤 신규 id 는 정상 INSERT(차단 안 함)', () => {
    const remote = baseItem({ id: 'fresh', updated_at: T(1) });
    const d = decideItemUpsert(undefined, remote, {
      pending,
      knownUpdatedAt: undefined,
      isTombstoned: (id) => id === 'gone',
    });
    expect(d).toEqual({ action: 'apply', merged: remote });
  });

  it('CR.24 isTombstoned 미제공 → 기존 동작(INSERT) 유지(하위호환)', () => {
    const remote = baseItem({ id: 'x', updated_at: T(1) });
    const d = decideItemUpsert(undefined, remote, { pending, knownUpdatedAt: undefined });
    expect(d).toEqual({ action: 'apply', merged: remote });
  });
});

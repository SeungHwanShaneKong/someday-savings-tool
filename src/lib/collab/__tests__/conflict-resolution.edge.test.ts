// [CL-COEDIT-QA200-20260620] conflict-resolution 엣지 — 시계오차/LWW/버퍼충돌/머지경계/파싱폴백
//
// 본 파일은 기존 conflict-resolution.test.ts(CR.1~CR.20)와 중복되지 않는 엣지 케이스만 다룬다.
// 계약(JSDoc·시그니처) 기준으로 기대값을 도출했으며, 구현을 그대로 미러링하지 않는다.
import { describe, it, expect } from 'vitest';
import {
  compareTimestamps,
  isNewer,
  resolveLWW,
  mergeRemoteFields,
  decideItemUpsert,
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

// 결정적 ISO 타임스탬프 — 밀리초 슬롯으로 단조 순서 보장(템플릿과 동일 헬퍼).
const T = (ms: number) => new Date(Date.UTC(2026, 5, 20, 0, 0, 0, ms)).toISOString();

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

const noPending = new Map<string, PendingOp>();

describe('CR.21 시계오차 순서역전(T5→T3→T4) — 단조 게이트', () => {
  it('한 번 T5 를 본 뒤엔 더 작은 T3·T4 둘 다 stale 로 거부(고수위 유지)', () => {
    // 데스크톱 시계 오차로 파트너 이벤트가 T5 먼저, 그 다음 더 "과거"로 보이는 T3, T4 순으로 도착.
    // 단조 게이트는 기지값(고수위)보다 엄격히 새로울 때만 적용 → T3·T4 는 모두 무시되어야 한다.
    const highWater = T(5);
    const local = baseItem({ amount: 5000, updated_at: highWater });

    const d3 = decideItemUpsert(local, baseItem({ amount: 3, updated_at: T(3) }), {
      pending: noPending,
      knownUpdatedAt: highWater,
    });
    const d4 = decideItemUpsert(local, baseItem({ amount: 4, updated_at: T(4) }), {
      pending: noPending,
      knownUpdatedAt: highWater,
    });

    expect(d3).toEqual({ action: 'ignore', reason: 'stale' });
    expect(d4).toEqual({ action: 'ignore', reason: 'stale' });
  });

  it('순수 isNewer 레벨에서도 T3·T4 < 고수위 T5 → 둘 다 false', () => {
    expect(isNewer(T(3), T(5))).toBe(false);
    expect(isNewer(T(4), T(5))).toBe(false);
    // 대비군: 고수위를 넘어서는 T6 만 통과
    expect(isNewer(T(6), T(5))).toBe(true);
  });
});

describe('CR.22 동일 컬럼 경쟁 LWW — 서버 updated_at 큰 쪽 승', () => {
  it('local 이 더 늦으면(local.updated_at > remote) local 이 승', () => {
    // 같은 셀(amount)을 양쪽이 건드린 경쟁. 서버 updated_at 이 큰 쪽이 권위.
    const local = baseItem({ amount: 100, updated_at: T(9) });
    const remote = baseItem({ amount: 200, updated_at: T(2) });
    const winner = resolveLWW(local, remote);
    expect(winner.amount).toBe(100);
    expect(winner).toBe(local); // 참조 동일성까지 보장(결정적)
  });

  it('인자 순서를 바꿔도 더 큰 updated_at 쪽이 항상 승(교환 안정성)', () => {
    const older = baseItem({ amount: 11, updated_at: T(1) });
    const newer = baseItem({ amount: 22, updated_at: T(8) });
    expect(resolveLWW(older, newer).amount).toBe(22);
    expect(resolveLWW(newer, older).amount).toBe(22);
  });
});

describe('CR.23 편집 버퍼 충돌 — amount 보호·notes 채택·updated_at 채택', () => {
  it('amount 편집 중이면 로컬 유지, notes 는 원격 채택, updated_at 은 항상 원격', () => {
    // 사용자가 amount 셀을 타이핑 중(editingColumns=amount). 동시에 파트너가 notes 와 amount 를 바꾼 전체 행 도착.
    const local = baseItem({ amount: 7777, notes: '로컬 메모', updated_at: T(1) });
    const remote = baseItem({ amount: 1, notes: '파트너 메모', updated_at: T(4) });
    const merged = mergeRemoteFields(local, remote, new Set(['amount']));
    expect(merged.amount).toBe(7777); // 편집 중 → 입력 버퍼 보호
    expect(merged.notes).toBe('파트너 메모'); // 비편집 → 원격 채택
    expect(merged.updated_at).toBe(T(4)); // bookkeeping 은 무조건 원격
  });

  it('decideItemUpsert 통합 경로에서도 동일하게 amount 보호 + notes 머지 + updated_at 채택', () => {
    const local = baseItem({ amount: 7777, notes: '로컬 메모', updated_at: T(1) });
    const remote = baseItem({ amount: 1, notes: '파트너 메모', updated_at: T(4) });
    const d = decideItemUpsert(local, remote, {
      pending: noPending,
      knownUpdatedAt: T(1),
      editingColumns: new Set(['amount']),
    });
    expect(d.action).toBe('apply');
    if (d.action === 'apply') {
      expect(d.merged.amount).toBe(7777);
      expect(d.merged.notes).toBe('파트너 메모');
      expect(d.merged.updated_at).toBe(T(4));
    }
  });
});

describe('CR.24 전 컬럼 편집 중 → 데이터 컬럼 0개 머지, 메타(updated_at)만 채택', () => {
  it('머지대상 컬럼 전부가 editingColumns 면 어떤 스칼라도 덮이지 않고 updated_at 만 바뀜', () => {
    const local = baseItem({
      amount: 5000,
      is_paid: false,
      notes: '로컬',
      cost_split: 'mine',
      updated_at: T(1),
    });
    const remote = baseItem({
      amount: 1,
      is_paid: true,
      notes: '원격',
      cost_split: 'theirs',
      updated_at: T(7),
    });
    // 기본 MERGEABLE_COLUMNS 전체를 편집 중으로 표시.
    const allEditing = new Set([
      'amount',
      'is_paid',
      'notes',
      'cost_split',
      'custom_name',
      'unit_price',
      'quantity',
      'payment_date',
    ]);
    const merged = mergeRemoteFields(local, remote, allEditing);
    // 모든 데이터 컬럼은 로컬 보존.
    expect(merged.amount).toBe(5000);
    expect(merged.is_paid).toBe(false);
    expect(merged.notes).toBe('로컬');
    expect(merged.cost_split).toBe('mine');
    // 메타만 채택.
    expect(merged.updated_at).toBe(T(7));
  });
});

describe('CR.25 mergeableColumns=[] → 필드 머지 0건(updated_at 만 채택)', () => {
  it('빈 머지목록이면 편집중이 아니어도 어떤 데이터 컬럼도 채택되지 않음', () => {
    const local = baseItem({ amount: 5000, is_paid: false, notes: '로컬', updated_at: T(1) });
    const remote = baseItem({ amount: 1, is_paid: true, notes: '원격', updated_at: T(3) });
    // editingColumns 는 빈 set 이지만, 순회 대상 컬럼이 0개라 아무것도 머지되지 않아야 한다.
    const merged = mergeRemoteFields(local, remote, new Set(), []);
    expect(merged.amount).toBe(5000);
    expect(merged.is_paid).toBe(false);
    expect(merged.notes).toBe('로컬');
    expect(merged.updated_at).toBe(T(3)); // updated_at 채택은 머지목록과 무관
  });

  it('decideItemUpsert 에 mergeableColumns=[] 전달 시 apply 하되 데이터는 로컬 그대로', () => {
    const local = baseItem({ amount: 5000, notes: '로컬', updated_at: T(1) });
    const remote = baseItem({ amount: 1, notes: '원격', updated_at: T(3) });
    const d = decideItemUpsert(local, remote, {
      pending: noPending,
      knownUpdatedAt: T(1),
      mergeableColumns: [],
    });
    expect(d.action).toBe('apply');
    if (d.action === 'apply') {
      expect(d.merged.amount).toBe(5000);
      expect(d.merged.notes).toBe('로컬');
      expect(d.merged.updated_at).toBe(T(3));
    }
  });
});

describe('CR.26 timestamp 파싱 실패 → 사전식(lexical) 폴백', () => {
  it('양쪽 모두 파싱 불가면 문자열 사전 비교로 부호 결정', () => {
    // Date.parse 가 NaN 인 두 문자열 → JSDoc 명시대로 사전식 폴백.
    expect(compareTimestamps('zzz-invalid', 'aaa-invalid')).toBeGreaterThan(0);
    expect(compareTimestamps('aaa-invalid', 'zzz-invalid')).toBeLessThan(0);
    expect(compareTimestamps('same-bad', 'same-bad')).toBe(0);
  });

  it('isNewer 도 폴백 경로에서 사전식으로 단조성 판단', () => {
    // 'bbb' > 'aaa' 사전식 → 새로움으로 취급.
    expect(isNewer('bbb-invalid', 'aaa-invalid')).toBe(true);
    expect(isNewer('aaa-invalid', 'bbb-invalid')).toBe(false);
  });

  it('한쪽만 유효해도(폴백 진입) 비교가 정의되며 동률이 아닌 부호를 반환', () => {
    // 한쪽이 NaN 이면 즉시 폴백 → 유효 ISO 와 깨진 문자열의 사전 비교.
    // 'not-a-date' 와 유효 ISO('2026-...') 의 사전 비교는 '2' < 'n' 이라 ISO 가 더 작음.
    const valid = T(0); // '2026-06-20T00:00:00.000Z'
    expect(compareTimestamps('not-a-date', valid)).toBeGreaterThan(0);
    expect(compareTimestamps(valid, 'not-a-date')).toBeLessThan(0);
  });
});

// [CL-COEDIT-MODE-20260620-120000] 워크스페이스 모드 순수 로직 테스트
import { describe, it, expect } from 'vitest';
import {
  isWorkspaceMode,
  filterBudgetsByMode,
  countByMode,
  readWorkspaceMode,
  writeWorkspaceMode,
  resolveInitialMode,
  WORKSPACE_MODE_KEY,
} from '../workspace';
import type { KVStore } from '../invite-resume';

function memStore(initial: Record<string, string> = {}): KVStore & { _data: Record<string, string> } {
  const data = { ...initial };
  return {
    _data: data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v; },
    removeItem: (k) => { delete data[k]; },
  };
}

const B = (id: string, isShared: boolean) => ({ id, isShared });

describe('workspace mode 순수 로직', () => {
  it('WS.1 isWorkspaceMode 가드', () => {
    expect(isWorkspaceMode('personal')).toBe(true);
    expect(isWorkspaceMode('shared')).toBe(true);
    expect(isWorkspaceMode('couple')).toBe(false);
    expect(isWorkspaceMode(null)).toBe(false);
    expect(isWorkspaceMode(undefined)).toBe(false);
  });

  it('WS.2 personal 모드 = 개인 예산만', () => {
    const budgets = [B('a', false), B('b', true), B('c', false)];
    expect(filterBudgetsByMode(budgets, 'personal').map((x) => x.id)).toEqual(['a', 'c']);
  });

  it('WS.3 shared 모드 = 공동 예산만', () => {
    const budgets = [B('a', false), B('b', true), B('c', true)];
    expect(filterBudgetsByMode(budgets, 'shared').map((x) => x.id)).toEqual(['b', 'c']);
  });

  it('WS.4 데이터 완전 분리 — 두 모드 합집합이 전체, 교집합 0', () => {
    const budgets = [B('a', false), B('b', true), B('c', false), B('d', true)];
    const personal = filterBudgetsByMode(budgets, 'personal').map((x) => x.id);
    const shared = filterBudgetsByMode(budgets, 'shared').map((x) => x.id);
    expect([...personal, ...shared].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(personal.filter((id) => shared.includes(id))).toEqual([]); // 누수 0
  });

  it('WS.5 countByMode', () => {
    expect(countByMode([B('a', false), B('b', true), B('c', true)])).toEqual({ personal: 1, shared: 2 });
    expect(countByMode([])).toEqual({ personal: 0, shared: 0 });
  });

  it('WS.6 read/write 모드 라운드트립', () => {
    const store = memStore();
    expect(readWorkspaceMode(store)).toBe('personal'); // 기본
    writeWorkspaceMode(store, 'shared');
    expect(store._data[WORKSPACE_MODE_KEY]).toBe('shared');
    expect(readWorkspaceMode(store)).toBe('shared');
  });

  it('WS.7 불량 저장값 → fallback', () => {
    const store = memStore({ [WORKSPACE_MODE_KEY]: 'garbage' });
    expect(readWorkspaceMode(store)).toBe('personal');
    expect(readWorkspaceMode(null)).toBe('personal');
  });

  it('WS.8 resolveInitialMode — preferShared > saved > 기본 personal', () => {
    expect(resolveInitialMode({ preferShared: true, saved: 'personal' })).toBe('shared'); // 초대 수락 직후
    expect(resolveInitialMode({ saved: 'shared' })).toBe('shared');
    expect(resolveInitialMode({ saved: null })).toBe('personal');
    expect(resolveInitialMode({ saved: 'garbage' })).toBe('personal');
    expect(resolveInitialMode({})).toBe('personal');
  });
});

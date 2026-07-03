// [CL-MODAL-COORD-20260703-140000] 전역 자동 모달 상호배제 조율기 — 스택으로 버튼 가림 방지 회귀 가드.
//   실기기 버그: UpdateNotice + MobileDesktopNotice 두 Radix 모달이 동시에 열려 상위 모달이
//   하위 모달의 '확인' 버튼을 덮어 클릭 불가. 조율기가 "한 번에 하나만" 을 보장하는지 검증.
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNoticeSlot, currentNoticeHolder, __resetNoticeSlot, __setNoticeHandoffDelay } from '../useNoticeSlot';

beforeEach(() => {
  __resetNoticeSlot();
  __setNoticeHandoffDelay(0); // 테스트는 동기 승계
});

describe('useNoticeSlot — 전역 모달 상호배제', () => {
  it('N1: 두 알림이 동시에 열리길 원해도 한 번에 하나만 granted(스택 방지)', () => {
    const a = renderHook(() => useNoticeSlot('a', true, 1));
    const b = renderHook(() => useNoticeSlot('b', true, 2));
    // 동시에 want=true 여도 granted 는 정확히 하나
    const grantedCount = [a.result.current, b.result.current].filter(Boolean).length;
    expect(grantedCount).toBe(1);
  });

  it('N2: 동시 대기자 중에서는 우선순위 높은 알림이 슬롯을 승계(이미 열린 모달은 강탈 안 함)', () => {
    // 점유자(hold) 가 슬롯을 잡은 상태에서 low(1)·high(3) 가 함께 대기 → hold 반납 시 high 승계
    const hold = renderHook(({ w }) => useNoticeSlot('hold', w, 5), { initialProps: { w: true } });
    const low = renderHook(() => useNoticeSlot('low', true, 1));
    const high = renderHook(() => useNoticeSlot('high', true, 3));
    expect(currentNoticeHolder()).toBe('hold'); // 열린 모달은 유지(강탈 없음)
    expect(low.result.current).toBe(false);
    expect(high.result.current).toBe(false);
    // 점유자 닫힘 → 대기자 중 최고 우선순위(high) 승계
    act(() => hold.rerender({ w: false }));
    expect(currentNoticeHolder()).toBe('high');
    expect(high.result.current).toBe(true);
    expect(low.result.current).toBe(false);
  });

  it('N3: 점유자가 닫히면 대기 중 알림이 슬롯을 승계한다', () => {
    const a = renderHook(({ w }) => useNoticeSlot('a', w, 2), { initialProps: { w: true } });
    const b = renderHook(() => useNoticeSlot('b', true, 1));
    expect(a.result.current).toBe(true);
    expect(b.result.current).toBe(false);
    // a 가 닫힘(want=false) → b 승계
    act(() => a.rerender({ w: false }));
    expect(currentNoticeHolder()).toBe('b');
    expect(b.result.current).toBe(true);
  });

  it('N4: 언마운트 시 슬롯을 반납하고 다음 알림이 승계(교착·누수 없음)', () => {
    const a = renderHook(() => useNoticeSlot('a', true, 2));
    const b = renderHook(() => useNoticeSlot('b', true, 1));
    expect(a.result.current).toBe(true);
    act(() => a.unmount());
    expect(currentNoticeHolder()).toBe('b');
    expect(b.result.current).toBe(true);
  });

  it('N5: 단독 알림은 즉시 granted', () => {
    const a = renderHook(() => useNoticeSlot('solo', true, 0));
    expect(a.result.current).toBe(true);
    expect(currentNoticeHolder()).toBe('solo');
  });

  it('N6: want=false 면 슬롯을 잡지 않는다', () => {
    const a = renderHook(() => useNoticeSlot('a', false, 5));
    expect(a.result.current).toBe(false);
    expect(currentNoticeHolder()).toBeNull();
  });
});

// [CL-MODAL-COORD-20260703-140000] body pointer-events 자가 치유 가드 회귀 가드.
//   실기기 버그: Radix 모달이 닫힌 뒤 body{pointer-events:none} 가 잔존해 페이지 전체 클릭 불가.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { PointerEventsGuard } from '../PointerEventsGuard';

afterEach(() => {
  cleanup();
  document.body.style.pointerEvents = '';
  document.querySelectorAll('[data-test-modal]').forEach((n) => n.remove());
});

/** MutationObserver 는 비동기(microtask) → 콜백 이후를 기다린다. */
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('PointerEventsGuard', () => {
  it('G1: 열린 모달이 없을 때 body 가 잠기면(none) 자동 해제', async () => {
    render(<PointerEventsGuard />);
    document.body.style.pointerEvents = 'none'; // Radix 가 남긴 잔존 잠금 재현
    await flush();
    expect(document.body.style.pointerEvents).toBe('');
  });

  it('G2: 열린 모달이 있으면 잠금을 보존한다(inert 유지)', async () => {
    render(<PointerEventsGuard />);
    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('data-state', 'open');
    modal.setAttribute('data-test-modal', '1');
    document.body.appendChild(modal);
    document.body.style.pointerEvents = 'none';
    await flush();
    // 열린 모달이 있으므로 잠금 유지
    expect(document.body.style.pointerEvents).toBe('none');
  });

  it('G3: 모달이 닫힘(data-state=closed) 상태만 남으면 잠금 해제(열림 없음)', async () => {
    render(<PointerEventsGuard />);
    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('data-state', 'closed'); // 닫히는 중(열림 아님)
    modal.setAttribute('data-test-modal', '1');
    document.body.appendChild(modal);
    document.body.style.pointerEvents = 'none';
    await flush();
    expect(document.body.style.pointerEvents).toBe('');
  });

  it('G4: 마운트 시점에 이미 잠겨 있고 열린 모달 없으면 즉시 해제', async () => {
    document.body.style.pointerEvents = 'none';
    render(<PointerEventsGuard />);
    await flush();
    expect(document.body.style.pointerEvents).toBe('');
  });

  // [CL-BTNAUDIT3-20260704 | popover-leak] Radix 비-modal Popover 콘텐츠도 role="dialog"
  //   data-state="open" 을 [data-radix-popper-content-wrapper] 안에 렌더한다. 그러나 Popover 는
  //   body 를 잠그지 않으므로, 다른 modal 이 남긴 누수 잠금이 있을 때 Popover 를 '잠금 소유자'로
  //   오인해 보존하면 안 된다(가드가 막아야 할 바로 그 증상 재발).
  it('G5: 누수 잠금 + Popover(popper 래퍼 안 role=dialog open)만 있으면 잠금 해제', async () => {
    render(<PointerEventsGuard />);
    // Radix Popover DOM 구조 재현: popper 래퍼 > role=dialog data-state=open 콘텐츠
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-radix-popper-content-wrapper', '');
    wrapper.setAttribute('data-test-modal', '1');
    const popoverContent = document.createElement('div');
    popoverContent.setAttribute('role', 'dialog');
    popoverContent.setAttribute('data-state', 'open');
    wrapper.appendChild(popoverContent);
    document.body.appendChild(wrapper);

    document.body.style.pointerEvents = 'none'; // 다른 modal 이 남긴 누수 잠금 시뮬레이트
    await flush();
    // Popover 는 body 를 잠그지 않으므로 누수 잠금은 해제되어야 한다
    expect(document.body.style.pointerEvents).toBe('');
  });

  // [CL-BTNAUDIT3-20260704 | true-modal] 진짜 modal(Dialog/AlertDialog)은 popper 래퍼 밖에서
  //   role=dialog open 을 렌더하며 body 를 잠근다 → 반드시 보존.
  it('G6: 진짜 modal Dialog(비-popper role=dialog open) 존재 시 잠금 보존', async () => {
    render(<PointerEventsGuard />);
    const overlay = document.createElement('div');
    overlay.setAttribute('data-test-modal', '1');
    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('data-state', 'open');
    overlay.appendChild(modal); // popper 래퍼가 아닌 일반 오버레이 컨테이너
    document.body.appendChild(overlay);

    document.body.style.pointerEvents = 'none';
    await flush();
    // 진짜 modal 이 열려 있으므로 inert 잠금 유지
    expect(document.body.style.pointerEvents).toBe('none');
  });

  // [CL-BTNAUDIT3-20260704 | mixed] Popover 와 진짜 modal 이 동시에 열려 있으면 진짜 modal 때문에 보존.
  it('G7: Popover + 진짜 modal 공존 시 잠금 보존(진짜 modal 우선)', async () => {
    render(<PointerEventsGuard />);
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-radix-popper-content-wrapper', '');
    wrapper.setAttribute('data-test-modal', '1');
    const popoverContent = document.createElement('div');
    popoverContent.setAttribute('role', 'dialog');
    popoverContent.setAttribute('data-state', 'open');
    wrapper.appendChild(popoverContent);
    document.body.appendChild(wrapper);

    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('data-state', 'open');
    modal.setAttribute('data-test-modal', '1');
    document.body.appendChild(modal);

    document.body.style.pointerEvents = 'none';
    await flush();
    expect(document.body.style.pointerEvents).toBe('none');
  });
});

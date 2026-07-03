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
});

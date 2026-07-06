// [CL-AUDIT-PWA-PERF-20260706-222500] getSnapshot 캐시 회귀 — 리렌더가 localStorage 를 재조회하지 않아야 한다.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@/test/test-utils';
import { useState } from 'react';
import {
  useInstallPromptSuppressed,
  _resetPWAInstallStateForTests,
  rememberInstallPromptDismissed,
  PWA_INSTALL_DISMISS_KEY,
} from '@/hooks/usePWAInstall';

function Harness() {
  const suppressed = useInstallPromptSuppressed();
  const [n, setN] = useState(0);
  return (
    <div>
      <span data-testid="s">{String(suppressed)}</span>
      <button onClick={() => setN((v) => v + 1)}>rerender {n}</button>
    </div>
  );
}

beforeEach(() => {
  _resetPWAInstallStateForTests();
  try {
    window.localStorage.clear();
  } catch {
    /* noop */
  }
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useInstallPromptSuppressed — getSnapshot 캐시', () => {
  it('무관한 리렌더는 localStorage(PWA키) 재조회를 유발하지 않는다(캐시)', () => {
    const spy = vi.spyOn(window.localStorage, 'getItem');
    const countPwa = () =>
      spy.mock.calls.filter((c) => c[0] === PWA_INSTALL_DISMISS_KEY).length;

    render(<Harness />);
    const afterMount = countPwa();

    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);
    const afterRerenders = countPwa();

    // 캐시 미적용(버그) 시 리렌더마다 getSnapshot→getItem 증가. 캐시 적용 시 증가 0.
    expect(afterRerenders).toBe(afterMount);
  });

  it('억제 상태 변경(dismiss)은 여전히 반응형 반영(캐시 갱신)', () => {
    render(<Harness />);
    expect(screen.getByTestId('s').textContent).toBe('false');
    // 실제 닫기 → 캐시 갱신 + 구독자 재렌더
    fireEvent.click(screen.getByRole('button')); // 리렌더 유발용
    rememberInstallPromptDismissed();
    // 다음 렌더에서 캐시가 true 로 갱신되어 반영
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('s').textContent).toBe('true');
  });
});

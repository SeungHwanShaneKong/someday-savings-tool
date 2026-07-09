// [CL-LOGIN-GATE-20260709-233447 | by:frontend-engineer]
// NavigateToAuth — 게이트 리다이렉트가 원래 목적지(pathname+search)를 state 로 전달하는지 검증.
// Auth.tsx 의 살균·복귀 로직(Auth.flows.test R 블록)과 한 쌍의 계약 테스트.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { NavigateToAuth } from '../NavigateToAuth';

/** /auth 도착 시 pathname 과 state.returnTo 를 노출하는 프로브 */
function AuthProbe() {
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? '';
  return (
    <div data-testid="auth-probe" data-return-to={returnTo}>
      {location.pathname}
    </div>
  );
}

function renderAt(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/auth" element={<AuthProbe />} />
        <Route path="*" element={<NavigateToAuth />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NavigateToAuth — returnTo state 전달', () => {
  it('N1: 쿼리 포함 경로(/summary?tab=chart)에서 /auth 로 이동하며 returnTo 에 pathname+search 를 담는다', () => {
    renderAt('/summary?tab=chart');
    const probe = screen.getByTestId('auth-probe');
    expect(probe).toHaveTextContent('/auth');
    expect(probe.getAttribute('data-return-to')).toBe('/summary?tab=chart');
  });

  it('N2: 쿼리 없는 경로(/budget)는 pathname 만 returnTo 로 전달한다', () => {
    renderAt('/budget');
    const probe = screen.getByTestId('auth-probe');
    expect(probe).toHaveTextContent('/auth');
    expect(probe.getAttribute('data-return-to')).toBe('/budget');
  });
});

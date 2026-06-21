// [CL-QUALITY-ERRBOUND-20260621] 전역 Error Boundary — 렌더 예외 시 화이트스크린 대신 복구 UI.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';

function Bomb(): JSX.Element {
  throw new Error('render boom');
}

describe('AppErrorBoundary', () => {
  it('EB.1 렌더 예외 → 복구 UI(alert + 새로고침 버튼), 화이트스크린 아님', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <AppErrorBoundary>
        <Bomb />
      </AppErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /문제가 발생/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /새로고침/ })).toBeInTheDocument();
    spy.mockRestore();
  });

  it('EB.2 정상 children 은 그대로 렌더(경계 무간섭)', () => {
    render(
      <AppErrorBoundary>
        <div>정상 콘텐츠</div>
      </AppErrorBoundary>,
    );
    expect(screen.getByText('정상 콘텐츠')).toBeInTheDocument();
  });
});

/**
 * [CL-QA100-BTN-20260531] NotFound 페이지 버튼 검증 (NAVIGATION 유형)
 */
import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen, fireEvent, currentPath } from '@/test/test-utils';
import NotFound from '../NotFound';

describe('NotFound — 버튼/네비게이션', () => {
  it('N1: 404 본문 텍스트 렌더', () => {
    renderWithProviders(<NotFound />, { route: '/없는경로' });
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('페이지를 찾을 수 없습니다')).toBeInTheDocument();
  });

  it('N2: 헤더 "홈으로" 백버튼 클릭 → / 로 이동', () => {
    renderWithProviders(<NotFound />, { route: '/없는경로' });
    fireEvent.click(screen.getByRole('button', { name: '홈으로' }));
    expect(currentPath()).toBe('/');
  });

  it('N3: "홈으로 돌아가기" 버튼 클릭 → / 로 이동', () => {
    renderWithProviders(<NotFound />, { route: '/x' });
    fireEvent.click(screen.getByRole('button', { name: '홈으로 돌아가기' }));
    expect(currentPath()).toBe('/');
  });

  it('N4: 백버튼 aria-label 접근성 — "홈으로" 노출', () => {
    renderWithProviders(<NotFound />, { route: '/x' });
    expect(screen.getByLabelText('홈으로')).toBeInTheDocument();
  });
});

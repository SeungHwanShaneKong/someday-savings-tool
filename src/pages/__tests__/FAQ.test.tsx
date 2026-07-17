/** [CL-QA100-BTN-20260531] FAQ/Guide 버튼 검증 */
import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen, fireEvent, within, currentPath } from '@/test/test-utils';
import FAQ from '../FAQ';

describe('FAQ — 버튼/네비게이션/아코디언', () => {
  it('FQ1: 헤더 "홈으로" 백버튼 클릭 → / 로 이동', () => {
    renderWithProviders(<FAQ />, { route: '/faq/' });
    fireEvent.click(screen.getByRole('button', { name: '홈으로' }));
    expect(currentPath()).toBe('/');
  });

  it('FQ2: 백버튼 aria-label="홈으로" 접근성 노출', () => {
    renderWithProviders(<FAQ />, { route: '/faq/' });
    expect(screen.getByLabelText('홈으로')).toBeInTheDocument();
  });

  it('FQ3: breadcrumb 홈 링크 href=/', () => {
    renderWithProviders(<FAQ />, { route: '/faq/' });
    const bc = within(screen.getByRole('navigation', { name: 'Breadcrumb' }));
    expect(bc.getByRole('link', { name: '홈' })).toHaveAttribute('href', '/');
  });

  it('FQ4: 아코디언 첫 번째 질문 — 클릭 전 답변 텍스트 DOM 미존재', () => {
    renderWithProviders(<FAQ />, { route: '/faq/' });
    // Radix Collapsible uses Presence — content is unmounted (not just hidden) when closed
    expect(screen.queryByText(/2,100만~8,100만 원/)).toBeNull();
  });

  it('FQ5: 아코디언 첫 번째 질문 — 클릭 후 답변 텍스트 노출', async () => {
    renderWithProviders(<FAQ />, { route: '/faq/' });
    const trigger = screen.getByRole('button', { name: /결혼 준비 비용은 평균 얼마인가요/ });
    fireEvent.click(trigger);
    const answer = await screen.findByText(/2,100만~8,100만 원/);
    expect(answer).toBeVisible();
  });

  it('FQ6: 아코디언 스드메 질문 — 클릭 후 답변 텍스트 노출', async () => {
    renderWithProviders(<FAQ />, { route: '/faq/' });
    const trigger = screen.getByRole('button', { name: /스드메.*비용은 얼마나 드나요/ });
    fireEvent.click(trigger);
    const answer = await screen.findByText(/여러 곳을 비교하는 것이 중요합니다/);
    expect(answer).toBeVisible();
  });

  it('FQ7: CTA "AI에게 질문하기" 링크 href=/chat', () => {
    renderWithProviders(<FAQ />, { route: '/faq/' });
    expect(screen.getByRole('link', { name: 'AI에게 질문하기' })).toHaveAttribute('href', '/chat');
  });

  it('FQ8: CTA "예산 시뮬레이션 시작" 링크 href=/budget', () => {
    renderWithProviders(<FAQ />, { route: '/faq/' });
    expect(screen.getByRole('link', { name: '예산 시뮬레이션 시작' })).toHaveAttribute('href', '/budget');
  });

  it('FQ9: 페이지 제목 "자주 묻는 질문" heading 렌더', () => {
    renderWithProviders(<FAQ />, { route: '/faq/' });
    const headings = screen.getAllByRole('heading', { name: '자주 묻는 질문' });
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });
});
